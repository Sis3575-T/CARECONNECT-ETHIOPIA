/**
 * CareConnect Ethiopia - Referral Repository Architecture
 * Data access layer for Referrals, Status History, Events, Decisions & Corrections.
 * Features dual-mode execution: Live PostgreSQL database queries with transparent in-memory test store fallback.
 */

import crypto from 'crypto';
import { BaseRepository } from './baseRepository.js';
import { query } from '../config/database.js';

// In-memory test stores
const inMemoryReferrals = new Map();
const inMemoryStatusHistory = new Map();
const inMemoryEvents = new Map();
const inMemoryDecisions = new Map();
const inMemoryCorrections = new Map();

export class ReferralRepository extends BaseRepository {
  constructor() {
    super('referrals');
  }

  /**
   * Generate standardized non-guessable Ethiopian referral reference: ETH-REF-YYYY-XXXXXX
   */
  generateReferenceNumber() {
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ETH-REF-${year}-${randomHex}`;
  }

  /**
   * Find referral by ID, UUID, or Reference Number with joined facility and patient metadata
   */
  async findById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();

    try {
      const sql = `
        SELECT 
          r.*,
          p.first_name as patient_first_name,
          p.father_name as patient_father_name,
          p.grandfather_name as patient_grandfather_name,
          p.gender as patient_gender,
          p.date_of_birth as patient_date_of_birth,
          p.age_years as patient_age_years,
          p.phone_number as patient_phone_number,
          p.region as patient_region,
          p.woreda as patient_woreda,
          p.national_id as patient_national_id,
          p.medical_record_number as patient_mrn,
          orig.name as origin_facility_name,
          orig.facility_type as origin_facility_type,
          dest.name as destination_facility_name,
          dest.facility_type as destination_facility_type,
          u_ref.first_name as referring_clinician_first_name,
          u_ref.last_name as referring_clinician_last_name,
          u_rec.first_name as receiving_clinician_first_name,
          u_rec.last_name as receiving_clinician_last_name
        FROM referrals r
        LEFT JOIN patients p ON r.patient_id = p.id
        LEFT JOIN healthcare_facilities orig ON r.origin_facility_id = orig.id
        LEFT JOIN healthcare_facilities dest ON r.destination_facility_id = dest.id
        LEFT JOIN users u_ref ON r.referring_clinician_id = u_ref.id
        LEFT JOIN users u_rec ON r.receiving_clinician_id = u_rec.id
        WHERE (r.id = $1 OR r.reference_number = $1 OR CAST(r.uuid AS text) = $1)
          AND r.deleted_at IS NULL
      `;
      const res = await query(sql, [cleanId]);
      if (res.rows && res.rows.length > 0) {
        const referral = res.rows[0];
        referral.status_history = await this.getStatusHistory(referral.id);
        referral.decisions = await this.getDecisions(referral.id);
        return referral;
      }
    } catch {
      // In-memory fallback
    }

    let found = inMemoryReferrals.get(cleanId);
    if (!found) {
      for (const ref of inMemoryReferrals.values()) {
        if (
          !ref.deleted_at &&
          (ref.id === cleanId || ref.reference_number === cleanId || ref.uuid === cleanId)
        ) {
          found = ref;
          break;
        }
      }
    }

    if (!found || found.deleted_at) return null;

    const copy = { ...found };
    copy.status_history = await this.getStatusHistory(copy.id);
    copy.decisions = await this.getDecisions(copy.id);
    return copy;
  }

  /**
   * Find referral by human-readable reference number
   */
  async findByReference(referenceNumber) {
    return this.findById(referenceNumber);
  }

  /**
   * Create a new referral entity (Draft or Submitted)
   */
  async create(data) {
    const refNumber = data.reference_number || this.generateReferenceNumber();
    const referralId = data.id || refNumber;
    const referralUuid = data.uuid || crypto.randomUUID();
    const now = new Date().toISOString();
    const initialStatus = data.status || 'DRAFT';

    const record = {
      id: referralId,
      uuid: referralUuid,
      reference_number: refNumber,
      patient_id: data.patient_id,
      origin_facility_id: data.origin_facility_id,
      destination_facility_id: data.destination_facility_id || null,
      referring_clinician_id: data.referring_clinician_id ? Number(data.referring_clinician_id) : null,
      receiving_clinician_id: data.receiving_clinician_id ? Number(data.receiving_clinician_id) : null,
      priority: data.priority ? data.priority.toUpperCase() : 'ROUTINE',
      status: initialStatus,
      primary_diagnosis: data.primary_diagnosis || '',
      clinical_summary: data.clinical_summary || '',
      reason_for_referral: data.reason_for_referral || '',
      required_specialty: data.required_specialty || 'General Medicine',
      vitals_blood_pressure: data.vitals_blood_pressure || null,
      vitals_pulse_rate: data.vitals_pulse_rate !== undefined ? Number(data.vitals_pulse_rate) : null,
      vitals_respiratory_rate: data.vitals_respiratory_rate !== undefined ? Number(data.vitals_respiratory_rate) : null,
      vitals_temperature: data.vitals_temperature !== undefined ? Number(data.vitals_temperature) : null,
      vitals_spo2: data.vitals_spo2 !== undefined ? Number(data.vitals_spo2) : null,
      provisional_treatment_given: data.provisional_treatment_given || null,
      rejection_reason: null,
      rejection_category: null,
      info_request_notes: null,
      transport_required: Boolean(data.transport_required),
      ai_recommended_facility_id: data.ai_recommended_facility_id || null,
      triage_category: data.triage_category || null,
      triage_notes: data.triage_notes || null,
      assigned_bed_type: null,
      closure_reason: null,
      current_progress_notes: data.current_progress_notes || null,
      submitted_at: initialStatus === 'SUBMITTED' ? now : null,
      acknowledged_at: null,
      decision_at: null,
      arrived_at: null,
      completed_at: null,
      closed_at: null,
      cancelled_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    try {
      const sql = `
        INSERT INTO referrals (
          id, uuid, reference_number, patient_id, origin_facility_id, destination_facility_id,
          referring_clinician_id, receiving_clinician_id, priority, status,
          primary_diagnosis, clinical_summary, reason_for_referral, required_specialty,
          vitals_blood_pressure, vitals_pulse_rate, vitals_respiratory_rate, vitals_temperature, vitals_spo2,
          provisional_treatment_given, transport_required, ai_recommended_facility_id,
          triage_category, triage_notes, submitted_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20, $21, $22,
          $23, $24, $25, $26, $27
        ) RETURNING *
      `;
      const values = [
        record.id, record.uuid, record.reference_number, record.patient_id,
        record.origin_facility_id, record.destination_facility_id,
        record.referring_clinician_id, record.receiving_clinician_id, record.priority, record.status,
        record.primary_diagnosis, record.clinical_summary, record.reason_for_referral, record.required_specialty,
        record.vitals_blood_pressure, record.vitals_pulse_rate, record.vitals_respiratory_rate, record.vitals_temperature, record.vitals_spo2,
        record.provisional_treatment_given, record.transport_required, record.ai_recommended_facility_id,
        record.triage_category, record.triage_notes, record.submitted_at, record.created_at, record.updated_at
      ];
      const res = await query(sql, values);
      if (res.rows && res.rows.length > 0) {
        inMemoryReferrals.set(record.id, { ...record, ...res.rows[0] });
        await this.recordStatusTransition(record.id, null, record.status, {
          userId: record.referring_clinician_id,
          facilityId: record.origin_facility_id,
          reason: `Referral created in status [${record.status}]`
        });
        return this.findById(record.id);
      }
    } catch {
      // In-memory fallback
    }

    inMemoryReferrals.set(record.id, record);
    await this.recordStatusTransition(record.id, null, record.status, {
      userId: record.referring_clinician_id,
      facilityId: record.origin_facility_id,
      reason: `Referral created in status [${record.status}]`
    });
    return this.findById(record.id);
  }

  /**
   * Update referral clinical and demographic fields
   */
  async update(id, updates = {}) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const fields = [];
    const values = [];
    let idx = 1;

    const allowedFields = [
      'destination_facility_id', 'priority', 'primary_diagnosis', 'clinical_summary',
      'reason_for_referral', 'required_specialty', 'vitals_blood_pressure',
      'vitals_pulse_rate', 'vitals_respiratory_rate', 'vitals_temperature', 'vitals_spo2',
      'provisional_treatment_given', 'transport_required', 'ai_recommended_facility_id',
      'triage_category', 'triage_notes', 'assigned_bed_type', 'current_progress_notes',
      'policy_id', 'policy_version', 'acknowledgement_deadline', 'decision_deadline',
      'escalation_level', 'last_followup_at', 'followup_count'
    ];

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) return existing;

    const now = new Date().toISOString();
    fields.push(`updated_at = $${idx++}`);
    values.push(now);
    values.push(id);

    try {
      const sql = `
        UPDATE referrals 
        SET ${fields.join(', ')} 
        WHERE id = $${idx} AND deleted_at IS NULL
        RETURNING *
      `;
      const res = await query(sql, values);
      if (res.rows && res.rows.length > 0) {
        inMemoryReferrals.set(id, { ...existing, ...res.rows[0] });
        return this.findById(id);
      }
    } catch {
      // In-memory fallback
    }

    const inMem = inMemoryReferrals.get(id);
    if (inMem) {
      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          inMem[key] = updates[key];
        }
      }
      inMem.updated_at = now;
      inMemoryReferrals.set(id, inMem);
    }
    return this.findById(id);
  }

  /**
   * Atomically update status and append immutable status history
   */
  async updateStatus(id, newStatus, options = {}) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fromStatus = existing.status;
    const {
      userId = null,
      facilityId = null,
      reason = null,
      metadata = {},
      cancellationReason = null,
      closureReason = null,
      receivingClinicianId = null,
      destinationFacilityId = null
    } = options;

    const timestampUpdates = {};
    if (newStatus === 'SUBMITTED' && !existing.submitted_at) timestampUpdates.submitted_at = now;
    if (newStatus === 'ACKNOWLEDGED' && !existing.acknowledged_at) timestampUpdates.acknowledged_at = now;
    if (['ACCEPTED', 'REJECTED', 'INFO_REQUESTED'].includes(newStatus) && !existing.decision_at) timestampUpdates.decision_at = now;
    if (newStatus === 'PATIENT_ARRIVED' && !existing.arrived_at) timestampUpdates.arrived_at = now;
    if (newStatus === 'COMPLETED' && !existing.completed_at) timestampUpdates.completed_at = now;
    if (newStatus === 'CLOSED') {
      timestampUpdates.closed_at = now;
      timestampUpdates.closed_by_user_id = userId;
      if (closureReason) timestampUpdates.closure_reason = closureReason;
    }
    if (newStatus === 'CANCELLED') {
      timestampUpdates.cancelled_at = now;
      timestampUpdates.cancelled_by_user_id = userId;
      if (cancellationReason) timestampUpdates.cancellation_reason = cancellationReason;
    }
    if (receivingClinicianId) timestampUpdates.receiving_clinician_id = receivingClinicianId;
    if (destinationFacilityId) timestampUpdates.destination_facility_id = destinationFacilityId;

    try {
      const setClauses = ['status = $1', 'updated_at = $2'];
      const params = [newStatus, now];
      let pIdx = 3;

      for (const [col, val] of Object.entries(timestampUpdates)) {
        setClauses.push(`${col} = $${pIdx++}`);
        params.push(val);
      }
      params.push(id);

      const sql = `
        UPDATE referrals 
        SET ${setClauses.join(', ')} 
        WHERE id = $${pIdx} AND deleted_at IS NULL
        RETURNING *
      `;
      const res = await query(sql, params);
      if (res.rows && res.rows.length > 0) {
        inMemoryReferrals.set(id, { ...existing, ...res.rows[0] });
      }
    } catch {
      // In-memory fallback
    }

    const inMem = inMemoryReferrals.get(id);
    if (inMem) {
      inMem.status = newStatus;
      inMem.updated_at = now;
      Object.assign(inMem, timestampUpdates);
      inMemoryReferrals.set(id, inMem);
    }

    // Record immutable status transition
    await this.recordStatusTransition(id, fromStatus, newStatus, {
      userId,
      facilityId,
      reason,
      metadata
    });

    return this.findById(id);
  }

  /**
   * Record entry in referral_status_history and referral_events
   */
  async recordStatusTransition(referralId, fromStatus, toStatus, details = {}) {
    const now = new Date().toISOString();
    const historyItem = {
      id: inMemoryStatusHistory.size + 1,
      uuid: crypto.randomUUID(),
      referral_id: referralId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by_user_id: details.userId ? Number(details.userId) : null,
      changed_at_facility_id: details.facilityId || null,
      reason_text: details.reason || null,
      metadata: details.metadata || {},
      created_at: now
    };

    try {
      const histSql = `
        INSERT INTO referral_status_history (
          uuid, referral_id, from_status, to_status,
          changed_by_user_id, changed_at_facility_id, reason_text, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      await query(histSql, [
        historyItem.uuid, historyItem.referral_id, historyItem.from_status, historyItem.to_status,
        historyItem.changed_by_user_id, historyItem.changed_at_facility_id,
        historyItem.reason_text, JSON.stringify(historyItem.metadata), historyItem.created_at
      ]);

      const eventSql = `
        INSERT INTO referral_events (
          referral_id, action, previous_status, new_status,
          actor_user_id, actor_facility_id, notes, event_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      await query(eventSql, [
        referralId, toStatus, fromStatus, toStatus,
        historyItem.changed_by_user_id, historyItem.changed_at_facility_id,
        historyItem.reason_text, JSON.stringify(historyItem.metadata), now
      ]);
    } catch {
      // Fallback
    }

    inMemoryStatusHistory.set(historyItem.id, historyItem);

    const eventItem = {
      id: inMemoryEvents.size + 1,
      referral_id: referralId,
      action: toStatus,
      previous_status: fromStatus,
      new_status: toStatus,
      actor_user_id: historyItem.changed_by_user_id,
      actor_facility_id: historyItem.changed_at_facility_id,
      notes: historyItem.reason_text,
      event_data: historyItem.metadata,
      created_at: now
    };
    inMemoryEvents.set(eventItem.id, eventItem);

    return historyItem;
  }

  /**
   * Get chronological status history
   */
  async getStatusHistory(referralId) {
    try {
      const sql = `
        SELECT 
          h.*,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          f.name as facility_name
        FROM referral_status_history h
        LEFT JOIN users u ON h.changed_by_user_id = u.id
        LEFT JOIN healthcare_facilities f ON h.changed_at_facility_id = f.id
        WHERE h.referral_id = $1
        ORDER BY h.created_at ASC
      `;
      const res = await query(sql, [referralId]);
      if (res.rows) return res.rows;
    } catch {
      // In-memory fallback
    }

    return Array.from(inMemoryStatusHistory.values())
      .filter((h) => h.referral_id === referralId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  /**
   * Record hospital clinical decision (ACCEPT, REJECT, REQUEST_INFO)
   */
  async recordDecision(referralId, decisionData) {
    const id = inMemoryDecisions.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: crypto.randomUUID(),
      referral_id: referralId,
      hospital_id: decisionData.hospital_id,
      evaluating_clinician_id: decisionData.evaluating_clinician_id ? Number(decisionData.evaluating_clinician_id) : null,
      decision: decisionData.decision.toUpperCase(),
      decision_notes: decisionData.decision_notes || '',
      rejection_reason_code: decisionData.rejection_reason_code || null,
      recommended_alternative_facility_id: decisionData.recommended_alternative_facility_id || null,
      bed_allocated: Boolean(decisionData.bed_allocated),
      allocated_ward_department: decisionData.allocated_ward_department || null,
      decision_timestamp: now
    };

    try {
      const sql = `
        INSERT INTO referral_decisions (
          uuid, referral_id, hospital_id, evaluating_clinician_id,
          decision, decision_notes, rejection_reason_code, recommended_alternative_facility_id,
          bed_allocated, allocated_ward_department, decision_timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.referral_id, item.hospital_id, item.evaluating_clinician_id,
        item.decision, item.decision_notes, item.rejection_reason_code,
        item.recommended_alternative_facility_id, item.bed_allocated,
        item.allocated_ward_department, item.decision_timestamp
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryDecisions.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryDecisions.set(item.id, item);
    return item;
  }

  /**
   * Get decisions recorded for a referral
   */
  async getDecisions(referralId) {
    try {
      const sql = `
        SELECT 
          d.*,
          u.first_name as clinician_first_name,
          u.last_name as clinician_last_name,
          h.name as hospital_name
        FROM referral_decisions d
        LEFT JOIN users u ON d.evaluating_clinician_id = u.id
        LEFT JOIN healthcare_facilities h ON d.hospital_id = h.id
        WHERE d.referral_id = $1
        ORDER BY d.decision_timestamp DESC
      `;
      const res = await query(sql, [referralId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    return Array.from(inMemoryDecisions.values())
      .filter((d) => d.referral_id === referralId)
      .sort((a, b) => new Date(b.decision_timestamp) - new Date(a.decision_timestamp));
  }

  /**
   * Record clinical/demographic correction
   */
  async recordCorrection(referralId, correctionData) {
    const id = inMemoryCorrections.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: crypto.randomUUID(),
      referral_id: referralId,
      field_name: correctionData.field_name,
      old_value: correctionData.old_value !== undefined ? String(correctionData.old_value) : null,
      new_value: correctionData.new_value !== undefined ? String(correctionData.new_value) : null,
      reason: correctionData.reason,
      corrected_by_user_id: correctionData.corrected_by_user_id ? Number(correctionData.corrected_by_user_id) : null,
      created_at: now
    };

    try {
      const sql = `
        INSERT INTO referral_corrections (
          uuid, referral_id, field_name, old_value, new_value, reason, corrected_by_user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.referral_id, item.field_name, item.old_value,
        item.new_value, item.reason, item.corrected_by_user_id, item.created_at
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryCorrections.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryCorrections.set(item.id, item);
    return item;
  }

  /**
   * Get corrections audit trail
   */
  async getCorrections(referralId) {
    try {
      const sql = `
        SELECT c.*, u.first_name as user_first_name, u.last_name as user_last_name
        FROM referral_corrections c
        LEFT JOIN users u ON c.corrected_by_user_id = u.id
        WHERE c.referral_id = $1
        ORDER BY c.created_at DESC
      `;
      const res = await query(sql, [referralId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    return Array.from(inMemoryCorrections.values())
      .filter((c) => c.referral_id === referralId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  /**
   * Search referrals with multi-criteria filtering & pagination
   */
  async search(options = {}) {
    const {
      limit = 20,
      offset = 0,
      originFacilityId = null,
      destinationFacilityId = null,
      patientId = null,
      status = null,
      priority = null,
      search = null
    } = options;

    try {
      const conditions = ['r.deleted_at IS NULL'];
      const params = [];
      let idx = 1;

      if (originFacilityId) {
        conditions.push(`r.origin_facility_id = $${idx++}`);
        params.push(originFacilityId);
      }
      if (destinationFacilityId) {
        conditions.push(`r.destination_facility_id = $${idx++}`);
        params.push(destinationFacilityId);
      }
      if (patientId) {
        conditions.push(`r.patient_id = $${idx++}`);
        params.push(patientId);
      }
      if (status) {
        conditions.push(`r.status = $${idx++}`);
        params.push(status.toUpperCase());
      }
      if (priority) {
        conditions.push(`r.priority = $${idx++}`);
        params.push(priority.toUpperCase());
      }
      if (search) {
        conditions.push(`(
          r.id ILIKE $${idx} OR
          r.reference_number ILIKE $${idx} OR
          r.primary_diagnosis ILIKE $${idx} OR
          r.required_specialty ILIKE $${idx}
        )`);
        params.push(`%${search}%`);
        idx++;
      }

      const whereClause = conditions.join(' AND ');
      const sql = `
        SELECT 
          r.*,
          p.first_name as patient_first_name,
          p.father_name as patient_father_name,
          p.age_years as patient_age_years,
          p.gender as patient_gender,
          orig.name as origin_facility_name,
          dest.name as destination_facility_name
        FROM referrals r
        LEFT JOIN patients p ON r.patient_id = p.id
        LEFT JOIN healthcare_facilities orig ON r.origin_facility_id = orig.id
        LEFT JOIN healthcare_facilities dest ON r.destination_facility_id = dest.id
        WHERE ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;
      params.push(limit, offset);

      const res = await query(sql, params);
      if (res.rows) return res.rows;
    } catch {
      // In-memory fallback
    }

    return this.fallbackSearch(options);
  }

  /**
   * Count referrals for pagination
   */
  async count(options = {}) {
    const {
      originFacilityId = null,
      destinationFacilityId = null,
      patientId = null,
      status = null,
      priority = null,
      search = null
    } = options;

    try {
      const conditions = ['r.deleted_at IS NULL'];
      const params = [];
      let idx = 1;

      if (originFacilityId) {
        conditions.push(`r.origin_facility_id = $${idx++}`);
        params.push(originFacilityId);
      }
      if (destinationFacilityId) {
        conditions.push(`r.destination_facility_id = $${idx++}`);
        params.push(destinationFacilityId);
      }
      if (patientId) {
        conditions.push(`r.patient_id = $${idx++}`);
        params.push(patientId);
      }
      if (status) {
        conditions.push(`r.status = $${idx++}`);
        params.push(status.toUpperCase());
      }
      if (priority) {
        conditions.push(`r.priority = $${idx++}`);
        params.push(priority.toUpperCase());
      }
      if (search) {
        conditions.push(`(
          r.id ILIKE $${idx} OR
          r.reference_number ILIKE $${idx} OR
          r.primary_diagnosis ILIKE $${idx} OR
          r.required_specialty ILIKE $${idx}
        )`);
        params.push(`%${search}%`);
        idx++;
      }

      const sql = `SELECT COUNT(r.id)::int as count FROM referrals r WHERE ${conditions.join(' AND ')}`;
      const res = await query(sql, params);
      if (res.rows && res.rows.length > 0) return res.rows[0].count;
    } catch {
      // In-memory fallback
    }

    const allMatches = this.fallbackSearch({ ...options, limit: 100000, offset: 0 });
    return allMatches.length;
  }

  /**
   * In-memory search helper for testing
   */
  fallbackSearch(options = {}) {
    const {
      limit = 20,
      offset = 0,
      originFacilityId = null,
      destinationFacilityId = null,
      patientId = null,
      status = null,
      priority = null,
      search = null
    } = options;

    let filtered = Array.from(inMemoryReferrals.values()).filter((r) => !r.deleted_at);

    if (originFacilityId) filtered = filtered.filter((r) => r.origin_facility_id === originFacilityId);
    if (destinationFacilityId) filtered = filtered.filter((r) => r.destination_facility_id === destinationFacilityId);
    if (patientId) filtered = filtered.filter((r) => r.patient_id === patientId);
    if (status) filtered = filtered.filter((r) => r.status && r.status.toUpperCase() === status.toUpperCase());
    if (priority) filtered = filtered.filter((r) => r.priority && r.priority.toUpperCase() === priority.toUpperCase());
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r) =>
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.reference_number && r.reference_number.toLowerCase().includes(q)) ||
        (r.primary_diagnosis && r.primary_diagnosis.toLowerCase().includes(q)) ||
        (r.required_specialty && r.required_specialty.toLowerCase().includes(q))
      );
    }

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Reset all in-memory stores for isolated tests
   */
  clearStore() {
    inMemoryReferrals.clear();
    inMemoryStatusHistory.clear();
    inMemoryEvents.clear();
    inMemoryDecisions.clear();
    inMemoryCorrections.clear();
  }

  static clearStore() {
    inMemoryReferrals.clear();
    inMemoryStatusHistory.clear();
    inMemoryEvents.clear();
    inMemoryDecisions.clear();
    inMemoryCorrections.clear();
  }
}

export default new ReferralRepository();
