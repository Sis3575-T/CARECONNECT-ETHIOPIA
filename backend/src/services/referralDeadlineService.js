/**
 * CareConnect Ethiopia - Automated Referral Deadline & Escalation Service
 * Inspects referral SLAs, detects acknowledgement & decision deadline breaches,
 * creates auditable operational escalations, records exceptions, and dispatches outbox events.
 * Strictly preserves human clinical oversight.
 */

import crypto from 'crypto';
import { DbService } from './dbService.js';
import { outboxService } from './outboxService.js';
import { OUTBOX_EVENT_TYPES } from '../constants/jobs.js';

export const TERMINAL_REFERRAL_STATUSES = new Set(['CANCELLED', 'REJECTED', 'COMPLETED', 'EXPIRED']);

export class ReferralDeadlineService {
  constructor() {
    this.inMemoryReferrals = new Map();
    this.inMemoryEscalations = new Map();
    this.inMemoryExceptions = new Map();
  }

  /**
   * Evaluates all active referrals against their SLA deadlines
   * @param {object} [options]
   * @returns {Promise<{ evaluated: number, escalated: number, exceptionsRecorded: number }>}
   */
  async evaluateDeadlines(options = {}) {
    const now = options.referenceTime ? new Date(options.referenceTime) : new Date();
    let escalatedCount = 0;
    let exceptionsCount = 0;

    const overdueReferrals = await this._findOverdueReferrals(now);

    for (const ref of overdueReferrals) {
      // Re-verify that referral is not in a terminal state
      if (TERMINAL_REFERRAL_STATUSES.has(ref.status)) {
        continue;
      }

      let breachType = null;
      let breachDeadline = null;

      // 1. Check Acknowledgement SLA (Status is SUBMITTED and acknowledgement_deadline breached)
      if (ref.status === 'SUBMITTED' && ref.acknowledgement_deadline && new Date(ref.acknowledgement_deadline) <= now) {
        breachType = 'ACKNOWLEDGEMENT_DEADLINE_EXCEEDED';
        breachDeadline = new Date(ref.acknowledgement_deadline);
      }
      // 2. Check Decision SLA (Status is UNDER_REVIEW and decision_deadline breached)
      else if (ref.status === 'UNDER_REVIEW' && ref.decision_deadline && new Date(ref.decision_deadline) <= now) {
        breachType = 'DECISION_DEADLINE_EXCEEDED';
        breachDeadline = new Date(ref.decision_deadline);
      }

      if (breachType) {
        // Record operational exception
        const exceptionRecorded = await this._recordOperationalException(ref, breachType, breachDeadline, now);
        if (exceptionRecorded) exceptionsCount += 1;

        // Escalate referral if not already escalated for this condition
        const escalated = await this._escalateReferral(ref, breachType, breachDeadline, now);
        if (escalated) escalatedCount += 1;
      }
    }

    return {
      evaluated: overdueReferrals.length,
      escalated: escalatedCount,
      exceptionsRecorded: exceptionsCount
    };
  }

  async _findOverdueReferrals(now) {
    try {
      const sql = `
        SELECT r.*, f.name as receiving_facility_name
        FROM referrals r
        LEFT JOIN healthcare_facilities f ON r.receiving_facility_id = f.id
        WHERE r.status IN ('SUBMITTED', 'UNDER_REVIEW')
          AND r.deleted_at IS NULL
          AND (
            (r.status = 'SUBMITTED' AND r.acknowledgement_deadline IS NOT NULL AND r.acknowledgement_deadline <= $1)
            OR
            (r.status = 'UNDER_REVIEW' AND r.decision_deadline IS NOT NULL AND r.decision_deadline <= $1)
          )
        ORDER BY r.created_at ASC;
      `;
      const res = await DbService.query(sql, [now.toISOString()]);
      return res.rows || [];
    } catch {
      // In-memory fallback
      const list = [];
      for (const ref of this.inMemoryReferrals.values()) {
        if (!TERMINAL_REFERRAL_STATUSES.has(ref.status)) {
          if (ref.status === 'SUBMITTED' && ref.acknowledgement_deadline && new Date(ref.acknowledgement_deadline) <= now) {
            list.push(ref);
          } else if (ref.status === 'UNDER_REVIEW' && ref.decision_deadline && new Date(ref.decision_deadline) <= now) {
            list.push(ref);
          }
        }
      }
      return list;
    }
  }

  async _recordOperationalException(ref, breachType, targetDeadline, now) {
    const elapsedMinutes = Math.max(0, Math.round((now.getTime() - targetDeadline.getTime()) / 60000));
    const exceptionKey = `${ref.id}:${breachType}`;

    try {
      const checkSql = `
        SELECT 1 FROM referral_operational_exceptions
        WHERE referral_id = $1 AND exception_type = $2 AND is_resolved = FALSE;
      `;
      const existing = await DbService.query(checkSql, [ref.id, breachType]);
      if (existing.rows && existing.rows.length > 0) {
        return false; // Already tracked
      }

      const insertSql = `
        INSERT INTO referral_operational_exceptions (
          referral_id, exception_type, severity, target_deadline, elapsed_minutes, is_resolved, created_at
        ) VALUES ($1, $2, $3, $4, $5, FALSE, $6)
        RETURNING id;
      `;
      const severity = ref.priority === 'EMERGENCY' ? 'CRITICAL' : 'WARNING';
      await DbService.query(insertSql, [
        ref.id,
        breachType,
        severity,
        targetDeadline.toISOString(),
        elapsedMinutes,
        now.toISOString()
      ]);
      return true;
    } catch {
      // In-memory fallback
      if (this.inMemoryExceptions.has(exceptionKey)) return false;
      this.inMemoryExceptions.set(exceptionKey, {
        referralId: ref.id,
        exceptionType: breachType,
        targetDeadline: targetDeadline.toISOString(),
        elapsedMinutes,
        isResolved: false
      });
      return true;
    }
  }

  async _escalateReferral(ref, breachType, targetDeadline, now) {
    const escalationKey = `${ref.id}:${breachType}`;

    try {
      // Deduplication: prevent multiple active open escalations for same condition
      const checkSql = `
        SELECT 1 FROM referral_escalations
        WHERE referral_id = $1 AND escalation_condition = $2 AND escalation_status IN ('OPEN', 'ACKNOWLEDGED');
      `;
      const existing = await DbService.query(checkSql, [ref.id, breachType]);
      if (existing.rows && existing.rows.length > 0) {
        return false;
      }

      const newLevel = (Number(ref.escalation_level) || 0) + 1;
      const escalationReason = `Automated operational escalation: SLA target exceeded by ${Math.round((now.getTime() - targetDeadline.getTime()) / 60000)} minutes for ${breachType}.`;
      const targetFacilityId = ref.receiving_facility_id || ref.originating_facility_id;

      // Create escalation record
      const escId = crypto.randomUUID();
      const insertSql = `
        INSERT INTO referral_escalations (
          uuid, referral_id, escalation_level, escalation_condition, escalation_reason,
          responsible_facility_id, escalation_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', $7, $7)
        RETURNING *;
      `;
      await DbService.query(insertSql, [
        escId,
        ref.id,
        newLevel,
        breachType,
        escalationReason,
        targetFacilityId,
        now.toISOString()
      ]);

      // Update referral escalation level
      const updateRefSql = `
        UPDATE referrals
        SET escalation_level = $1, updated_at = $2
        WHERE id = $3;
      `;
      await DbService.query(updateRefSql, [newLevel, now.toISOString(), ref.id]);

      // Dispatch Outbox Event
      await outboxService.createEvent(
        'coordination',
        ref.id,
        OUTBOX_EVENT_TYPES.ESCALATION_CREATED,
        {
          referralId: ref.id,
          referralCode: ref.referral_code,
          escalationId: escId,
          escalationLevel: newLevel,
          breachType,
          responsibleFacilityId: targetFacilityId
        },
        { idempotencyKey: `escalation:${ref.id}:${breachType}:${newLevel}` }
      );

      return true;
    } catch {
      // In-memory fallback
      if (this.inMemoryEscalations.has(escalationKey)) return false;

      const newLevel = (Number(ref.escalation_level) || 0) + 1;
      ref.escalation_level = newLevel;

      this.inMemoryEscalations.set(escalationKey, {
        referralId: ref.id,
        escalationCondition: breachType,
        escalationLevel: newLevel,
        status: 'OPEN',
        createdAt: now.toISOString()
      });

      // Dispatch Outbox Event
      await outboxService.createEvent(
        'coordination',
        ref.id,
        OUTBOX_EVENT_TYPES.ESCALATION_CREATED,
        {
          referralId: ref.id,
          escalationLevel: newLevel,
          breachType
        },
        { idempotencyKey: `escalation:${ref.id}:${breachType}:${newLevel}` }
      );

      return true;
    }
  }

  // Testing helper
  seedReferral(ref) {
    this.inMemoryReferrals.set(ref.id, ref);
  }

  clearInMemory() {
    this.inMemoryReferrals.clear();
    this.inMemoryEscalations.clear();
    this.inMemoryExceptions.clear();
  }
}

export const referralDeadlineService = new ReferralDeadlineService();
export default referralDeadlineService;
