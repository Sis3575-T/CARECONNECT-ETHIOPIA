/**
 * CareConnect Ethiopia - Data Retention & Archival Service
 * Evaluates retention eligibility, coordinates non-destructive cold storage archival,
 * and maintains audit records for regulatory retention tracking.
 */

import { pool, query, sanitizeConnectionString } from '../config/database.js';
import DbService from './dbService.js';

// In-memory fallback policies and catalog for offline/testing mode
const memoryPolicies = [
  { id: 1, entity_type: 'AUDIT_LOGS', retention_period_days: 2555, action_type: 'ARCHIVE', is_active: true },
  { id: 2, entity_type: 'SYSTEM_EVENTS', retention_period_days: 2555, action_type: 'ARCHIVE', is_active: true },
  { id: 3, entity_type: 'CLOSED_REFERRALS', retention_period_days: 365, action_type: 'ARCHIVE', is_active: true },
  { id: 4, entity_type: 'CANCELLED_REFERRALS', retention_period_days: 180, action_type: 'ARCHIVE', is_active: true },
  { id: 5, entity_type: 'SUPERSEDED_DOCUMENTS', retention_period_days: 365, action_type: 'ARCHIVE', is_active: true },
  { id: 6, entity_type: 'EXPIRED_SESSIONS', retention_period_days: 30, action_type: 'PURGE_EXPIRED', is_active: true }
];

const memoryArchivedCatalog = new Map();
const memoryRetentionExecutions = [];

export class DataRetentionService {
  /**
   * Retrieves all configured retention policies
   */
  static async listPolicies() {
    try {
      const res = await query('SELECT * FROM data_retention_policies ORDER BY id ASC');
      return res.rows;
    } catch {
      return memoryPolicies;
    }
  }

  /**
   * Retrieves policy for a specific entity type
   */
  static async getPolicy(entityType) {
    try {
      const res = await query('SELECT * FROM data_retention_policies WHERE entity_type = $1', [entityType]);
      return res.rows[0] || null;
    } catch {
      return memoryPolicies.find(p => p.entity_type === entityType) || null;
    }
  }

  /**
   * Evaluates how many records are eligible for archival based on retention duration
   */
  static async evaluateEligibility(entityType) {
    const policy = await this.getPolicy(entityType);
    if (!policy) {
      throw new Error(`No retention policy found for entity: ${entityType}`);
    }

    const cutoffDate = new Date(Date.now() - policy.retention_period_days * 24 * 60 * 60 * 1000);

    try {
      let countQuery = '';
      if (entityType === 'CLOSED_REFERRALS') {
        countQuery = `
          SELECT COUNT(r.id)::int as count 
          FROM referrals r
          LEFT JOIN archived_referrals_catalog a ON r.id = a.referral_id
          WHERE r.status = 'CLOSED' AND r.closed_at <= $1 AND a.id IS NULL
        `;
      } else if (entityType === 'CANCELLED_REFERRALS') {
        countQuery = `
          SELECT COUNT(r.id)::int as count 
          FROM referrals r
          LEFT JOIN archived_referrals_catalog a ON r.id = a.referral_id
          WHERE r.status = 'CANCELLED' AND r.cancelled_at <= $1 AND a.id IS NULL
        `;
      } else if (entityType === 'AUDIT_LOGS') {
        countQuery = 'SELECT COUNT(id)::int as count FROM audit_logs WHERE created_at <= $1';
      } else if (entityType === 'SYSTEM_EVENTS') {
        countQuery = 'SELECT COUNT(id)::int as count FROM system_events WHERE created_at <= $1';
      } else if (entityType === 'SUPERSEDED_DOCUMENTS') {
        countQuery = 'SELECT COUNT(id)::int as count FROM referral_documents WHERE is_latest = FALSE AND created_at <= $1';
      } else {
        return { entityType, eligibleCount: 0, cutoffDate };
      }

      const res = await query(countQuery, [cutoffDate]);
      return {
        entityType,
        retentionDays: policy.retention_period_days,
        actionType: policy.action_type,
        cutoffDate,
        eligibleCount: res.rows[0]?.count || 0
      };
    } catch {
      // Memory fallback estimation
      return {
        entityType,
        retentionDays: policy.retention_period_days,
        actionType: policy.action_type,
        cutoffDate,
        eligibleCount: 0
      };
    }
  }

  /**
   * Records an archival entry for a referral without deleting underlying clinical data
   */
  static async archiveReferral({ referralId, user, archiveTier = 'COLD_STORAGE', archiveLocation = null, notes = '' }) {
    if (!referralId) {
      throw new Error('Referral ID is required for archival');
    }

    const entry = {
      referral_id: referralId,
      archived_at: new Date(),
      archived_by_user_id: user?.id || null,
      archive_tier: archiveTier,
      archive_location: archiveLocation || `cc-cold-archive://${referralId}`,
      notes
    };

    try {
      const res = await query(
        `INSERT INTO archived_referrals_catalog (referral_id, archived_at, archived_by_user_id, archive_tier, archive_location, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (referral_id) DO UPDATE SET notes = EXCLUDED.notes, archived_at = EXCLUDED.archived_at
         RETURNING *`,
        [entry.referral_id, entry.archived_at, entry.archived_by_user_id, entry.archive_tier, entry.archive_location, entry.notes]
      );
      return res.rows[0];
    } catch {
      memoryArchivedCatalog.set(referralId, entry);
      return { id: memoryArchivedCatalog.size, ...entry };
    }
  }

  /**
   * Records data retention execution audit record
   */
  static async recordExecution({ policyId, entityType, eligibleCount, processedCount, status = 'COMPLETED', user, notes = '' }) {
    const record = {
      policy_id: policyId || null,
      entity_type: entityType,
      executed_at: new Date(),
      eligible_records_count: eligibleCount || 0,
      processed_records_count: processedCount || 0,
      status,
      executed_by_user_id: user?.id || null,
      execution_notes: notes
    };

    try {
      const res = await query(
        `INSERT INTO data_retention_executions (policy_id, entity_type, executed_at, eligible_records_count, processed_records_count, status, executed_by_user_id, execution_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [record.policy_id, record.entity_type, record.executed_at, record.eligible_records_count, record.processed_records_count, record.status, record.executed_by_user_id, record.execution_notes]
      );
      return res.rows[0];
    } catch {
      memoryRetentionExecutions.push({ id: memoryRetentionExecutions.length + 1, ...record });
      return { id: memoryRetentionExecutions.length, ...record };
    }
  }
}

export default DataRetentionService;
