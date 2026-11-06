/**
 * CareConnect Ethiopia - Referral Coordination & Escalation Repository
 * Data access layer for Response Policies (SLAs), Follow-ups, Information Requests,
 * Reassignments, Operational Escalations, and Delay Exceptions.
 */

import crypto from 'crypto';
import { BaseRepository } from './baseRepository.js';
import { query } from '../config/database.js';

// In-memory test stores
const inMemoryPolicies = new Map();
const inMemoryFollowUps = new Map();
const inMemoryInfoRequests = new Map();
const inMemoryReassignments = new Map();
const inMemoryEscalations = new Map();
const inMemoryExceptions = new Map();

export class CoordinationRepository extends BaseRepository {
  constructor() {
    super('referral_response_policies');
  }

  // ==========================================
  // 1. RESPONSE POLICIES (SLAs)
  // ==========================================

  /**
   * Create or version a response policy
   */
  async createPolicy(data) {
    const id = inMemoryPolicies.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: data.uuid || crypto.randomUUID(),
      name: data.name,
      facility_id: data.facility_id || null,
      facility_type: data.facility_type || null,
      priority: data.priority ? data.priority.toUpperCase() : null,
      service_code: data.service_code || null,
      acknowledgement_deadline_minutes: Number(data.acknowledgement_deadline_minutes || 60),
      decision_deadline_minutes: Number(data.decision_deadline_minutes || 120),
      follow_up_interval_minutes: Number(data.follow_up_interval_minutes || 180),
      escalation_threshold_minutes: Number(data.escalation_threshold_minutes || 240),
      working_hours_only: Boolean(data.working_hours_only),
      working_hours_start: data.working_hours_start || '08:30:00',
      working_hours_end: data.working_hours_end || '17:30:00',
      operating_days: data.operating_days || 'MON,TUE,WED,THU,FRI,SAT,SUN',
      version: Number(data.version || 1),
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      effective_from: data.effective_from || now,
      effective_to: data.effective_to || null,
      created_by_user_id: data.created_by_user_id ? Number(data.created_by_user_id) : null,
      created_at: now,
      updated_at: now
    };

    try {
      const sql = `
        INSERT INTO referral_response_policies (
          uuid, name, facility_id, facility_type, priority, service_code,
          acknowledgement_deadline_minutes, decision_deadline_minutes, follow_up_interval_minutes, escalation_threshold_minutes,
          working_hours_only, working_hours_start, working_hours_end, operating_days,
          version, is_active, effective_from, effective_to, created_by_user_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21
        ) RETURNING *
      `;
      const values = [
        item.uuid, item.name, item.facility_id, item.facility_type, item.priority, item.service_code,
        item.acknowledgement_deadline_minutes, item.decision_deadline_minutes, item.follow_up_interval_minutes, item.escalation_threshold_minutes,
        item.working_hours_only, item.working_hours_start, item.working_hours_end, item.operating_days,
        item.version, item.is_active, item.effective_from, item.effective_to, item.created_by_user_id, item.created_at, item.updated_at
      ];
      const res = await query(sql, values);
      if (res.rows && res.rows.length > 0) {
        inMemoryPolicies.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // In-memory fallback
    }

    inMemoryPolicies.set(item.id, item);
    return item;
  }

  /**
   * Find policy by ID or UUID
   */
  async findPolicyById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();

    try {
      const sql = `
        SELECT p.*, f.name as facility_name
        FROM referral_response_policies p
        LEFT JOIN healthcare_facilities f ON p.facility_id = f.id
        WHERE p.id = $1 OR CAST(p.uuid AS text) = $1
      `;
      const res = await query(sql, [isNaN(Number(cleanId)) ? 0 : Number(cleanId)]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    for (const p of inMemoryPolicies.values()) {
      if (String(p.id) === cleanId || p.uuid === cleanId) return p;
    }
    return null;
  }

  /**
   * Find highest-precedence active policy matching criteria:
   * 1. Facility + Priority
   * 2. Facility Only
   * 3. Priority Only
   * 4. Global Default
   */
  async findApplicablePolicy(criteria = {}) {
    const { facilityId, facilityType, priority, serviceCode } = criteria;
    const normalizedPriority = priority ? priority.toUpperCase() : null;

    try {
      const sql = `
        SELECT * FROM referral_response_policies
        WHERE is_active = TRUE
          AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
        ORDER BY 
          CASE 
            WHEN facility_id = $1 AND priority = $2 THEN 1
            WHEN facility_id = $1 AND priority IS NULL THEN 2
            WHEN facility_type = $3 AND priority = $2 THEN 3
            WHEN facility_type = $3 AND priority IS NULL THEN 4
            WHEN facility_id IS NULL AND priority = $2 THEN 5
            ELSE 6
          END ASC,
          version DESC
        LIMIT 1
      `;
      const res = await query(sql, [facilityId || null, normalizedPriority || null, facilityType || null]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    // In-memory matcher
    const active = Array.from(inMemoryPolicies.values()).filter((p) => p.is_active);
    if (active.length === 0) return null;

    // 1. Facility + Priority
    let match = active.find((p) => p.facility_id === facilityId && p.priority === normalizedPriority);
    if (match) return match;

    // 2. Facility specific default
    match = active.find((p) => p.facility_id === facilityId && !p.priority);
    if (match) return match;

    // 3. Priority specific default
    match = active.find((p) => !p.facility_id && p.priority === normalizedPriority);
    if (match) return match;

    // 4. Global default policy
    match = active.find((p) => !p.facility_id && !p.priority);
    if (match) return match;

    return active[0];
  }

  /**
   * List response policies with optional active filter
   */
  async listPolicies(options = {}) {
    const { isActive, facilityId, limit = 50, offset = 0 } = options;

    try {
      const conditions = [];
      const params = [];
      let idx = 1;

      if (isActive !== undefined && isActive !== null) {
        conditions.push(`is_active = $${idx++}`);
        params.push(Boolean(isActive));
      }
      if (facilityId) {
        conditions.push(`facility_id = $${idx++}`);
        params.push(facilityId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT p.*, f.name as facility_name
        FROM referral_response_policies p
        LEFT JOIN healthcare_facilities f ON p.facility_id = f.id
        ${whereClause}
        ORDER BY p.is_active DESC, p.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;
      params.push(limit, offset);
      const res = await query(sql, params);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    let items = Array.from(inMemoryPolicies.values());
    if (isActive !== undefined && isActive !== null) {
      items = items.filter((p) => Boolean(p.is_active) === Boolean(isActive));
    }
    if (facilityId) {
      items = items.filter((p) => p.facility_id === facilityId);
    }
    return items.slice(offset, offset + limit);
  }

  /**
   * Deactivate a response policy
   */
  async deactivatePolicy(id) {
    const now = new Date().toISOString();
    try {
      const sql = `
        UPDATE referral_response_policies
        SET is_active = FALSE, effective_to = $1, updated_at = $1
        WHERE id = $2 RETURNING *
      `;
      const res = await query(sql, [now, Number(id)]);
      if (res.rows && res.rows.length > 0) {
        inMemoryPolicies.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    const item = inMemoryPolicies.get(Number(id));
    if (item) {
      item.is_active = false;
      item.effective_to = now;
      item.updated_at = now;
      inMemoryPolicies.set(item.id, item);
      return item;
    }
    return null;
  }

  // ==========================================
  // 2. REFERRAL FOLLOW-UPS
  // ==========================================

  /**
   * Record a follow-up interaction
   */
  async recordFollowUp(data) {
    const id = inMemoryFollowUps.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: data.uuid || crypto.randomUUID(),
      referral_id: data.referral_id,
      attempted_at: data.attempted_at || now,
      responsible_user_id: Number(data.responsible_user_id),
      facility_id: data.facility_id || null,
      communication_channel: String(data.communication_channel || 'PHONE_CALL').toUpperCase(),
      channel_delivery_status: data.channel_delivery_status || 'MANUAL_RECORD',
      outcome: String(data.outcome).toUpperCase(),
      reason_or_notes: data.reason_or_notes || '',
      scheduled_next_follow_up: data.scheduled_next_follow_up || null,
      created_at: now
    };

    try {
      const sql = `
        INSERT INTO referral_follow_ups (
          uuid, referral_id, attempted_at, responsible_user_id, facility_id,
          communication_channel, channel_delivery_status, outcome, reason_or_notes,
          scheduled_next_follow_up, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.referral_id, item.attempted_at, item.responsible_user_id, item.facility_id,
        item.communication_channel, item.channel_delivery_status, item.outcome, item.reason_or_notes,
        item.scheduled_next_follow_up, item.created_at
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryFollowUps.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryFollowUps.set(item.id, item);
    return item;
  }

  /**
   * Get all follow-ups for a referral
   */
  async getFollowUps(referralId) {
    try {
      const sql = `
        SELECT f.*, u.first_name as user_first_name, u.last_name as user_last_name, fac.name as facility_name
        FROM referral_follow_ups f
        LEFT JOIN users u ON f.responsible_user_id = u.id
        LEFT JOIN healthcare_facilities fac ON f.facility_id = fac.id
        WHERE f.referral_id = $1
        ORDER BY f.attempted_at DESC
      `;
      const res = await query(sql, [referralId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    return Array.from(inMemoryFollowUps.values())
      .filter((f) => f.referral_id === referralId)
      .sort((a, b) => new Date(b.attempted_at) - new Date(a.attempted_at));
  }

  // ==========================================
  // 3. ADDITIONAL INFORMATION REQUESTS
  // ==========================================

  /**
   * Create an additional information request
   */
  async createInformationRequest(data) {
    const id = inMemoryInfoRequests.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: data.uuid || crypto.randomUUID(),
      referral_id: data.referral_id,
      requesting_user_id: Number(data.requesting_user_id),
      requesting_facility_id: data.requesting_facility_id,
      requested_information: data.requested_information,
      clinical_reason: data.clinical_reason,
      request_status: 'PENDING',
      response_notes: null,
      responding_user_id: null,
      responding_facility_id: null,
      supporting_document_ids: data.supporting_document_ids || [],
      deadline: data.deadline || null,
      requested_at: now,
      responded_at: null,
      created_at: now,
      updated_at: now
    };

    try {
      const sql = `
        INSERT INTO referral_information_requests (
          uuid, referral_id, requesting_user_id, requesting_facility_id,
          requested_information, clinical_reason, request_status, response_notes,
          responding_user_id, responding_facility_id, supporting_document_ids,
          deadline, requested_at, responded_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.referral_id, item.requesting_user_id, item.requesting_facility_id,
        item.requested_information, item.clinical_reason, item.request_status, item.response_notes,
        item.responding_user_id, item.responding_facility_id, JSON.stringify(item.supporting_document_ids),
        item.deadline, item.requested_at, item.responded_at, item.created_at, item.updated_at
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryInfoRequests.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryInfoRequests.set(item.id, item);
    return item;
  }

  /**
   * Find information request by ID
   */
  async findInfoRequestById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();

    try {
      const sql = `
        SELECT r.*,
               u_req.first_name as requesting_user_first_name, u_req.last_name as requesting_user_last_name,
               f_req.name as requesting_facility_name,
               u_resp.first_name as responding_user_first_name, u_resp.last_name as responding_user_last_name
        FROM referral_information_requests r
        LEFT JOIN users u_req ON r.requesting_user_id = u_req.id
        LEFT JOIN healthcare_facilities f_req ON r.requesting_facility_id = f_req.id
        LEFT JOIN users u_resp ON r.responding_user_id = u_resp.id
        WHERE r.id = $1 OR CAST(r.uuid AS text) = $1
      `;
      const res = await query(sql, [isNaN(Number(cleanId)) ? 0 : Number(cleanId)]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    for (const r of inMemoryInfoRequests.values()) {
      if (String(r.id) === cleanId || r.uuid === cleanId) return r;
    }
    return null;
  }

  /**
   * Record response to an information request
   */
  async recordInfoResponse(id, responseData) {
    const existing = await this.findInfoRequestById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates = {
      request_status: 'RESPONDED',
      response_notes: responseData.response_notes || responseData.notes,
      responding_user_id: responseData.responding_user_id ? Number(responseData.responding_user_id) : null,
      responding_facility_id: responseData.responding_facility_id || null,
      supporting_document_ids: responseData.supporting_document_ids || existing.supporting_document_ids || [],
      responded_at: now,
      updated_at: now
    };

    try {
      const sql = `
        UPDATE referral_information_requests
        SET request_status = $1, response_notes = $2, responding_user_id = $3,
            responding_facility_id = $4, supporting_document_ids = $5, responded_at = $6, updated_at = $7
        WHERE id = $8 RETURNING *
      `;
      const res = await query(sql, [
        updates.request_status, updates.response_notes, updates.responding_user_id,
        updates.responding_facility_id, JSON.stringify(updates.supporting_document_ids),
        updates.responded_at, updates.updated_at, existing.id
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryInfoRequests.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    const item = { ...existing, ...updates };
    inMemoryInfoRequests.set(existing.id, item);
    return item;
  }

  /**
   * Get all information requests for a referral
   */
  async getInfoRequests(referralId) {
    try {
      const sql = `
        SELECT r.*,
               u_req.first_name as requesting_user_first_name, u_req.last_name as requesting_user_last_name,
               f_req.name as requesting_facility_name,
               u_resp.first_name as responding_user_first_name, u_resp.last_name as responding_user_last_name
        FROM referral_information_requests r
        LEFT JOIN users u_req ON r.requesting_user_id = u_req.id
        LEFT JOIN healthcare_facilities f_req ON r.requesting_facility_id = f_req.id
        LEFT JOIN users u_resp ON r.responding_user_id = u_resp.id
        WHERE r.referral_id = $1
        ORDER BY r.requested_at DESC
      `;
      const res = await query(sql, [referralId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    return Array.from(inMemoryInfoRequests.values())
      .filter((r) => r.referral_id === referralId)
      .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));
  }

  // ==========================================
  // 4. REFERRAL REASSIGNMENTS
  // ==========================================

  /**
   * Record human-authorized hospital reassignment
   */
  async recordReassignment(data) {
    const id = inMemoryReassignments.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: data.uuid || crypto.randomUUID(),
      referral_id: data.referral_id,
      previous_facility_id: data.previous_facility_id || null,
      new_facility_id: data.new_facility_id,
      reassignment_reason: String(data.reassignment_reason).toUpperCase(),
      reassignment_notes: data.reassignment_notes,
      authorized_by_user_id: Number(data.authorized_by_user_id),
      reassigned_at: now,
      created_at: now
    };

    try {
      const sql = `
        INSERT INTO referral_reassignments (
          uuid, referral_id, previous_facility_id, new_facility_id,
          reassignment_reason, reassignment_notes, authorized_by_user_id, reassigned_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.referral_id, item.previous_facility_id, item.new_facility_id,
        item.reassignment_reason, item.reassignment_notes, item.authorized_by_user_id,
        item.reassigned_at, item.created_at
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryReassignments.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryReassignments.set(item.id, item);
    return item;
  }

  /**
   * Get reassignments history for a referral
   */
  async getReassignments(referralId) {
    try {
      const sql = `
        SELECT r.*,
               f_prev.name as previous_facility_name,
               f_new.name as new_facility_name,
               u.first_name as authorized_by_first_name, u.last_name as authorized_by_last_name
        FROM referral_reassignments r
        LEFT JOIN healthcare_facilities f_prev ON r.previous_facility_id = f_prev.id
        LEFT JOIN healthcare_facilities f_new ON r.new_facility_id = f_new.id
        LEFT JOIN users u ON r.authorized_by_user_id = u.id
        WHERE r.referral_id = $1
        ORDER BY r.reassigned_at DESC
      `;
      const res = await query(sql, [referralId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    return Array.from(inMemoryReassignments.values())
      .filter((r) => r.referral_id === referralId)
      .sort((a, b) => new Date(b.reassigned_at) - new Date(a.reassigned_at));
  }

  // ==========================================
  // 5. OPERATIONAL ESCALATIONS
  // ==========================================

  /**
   * Create an operational escalation
   */
  async createEscalation(data) {
    const id = inMemoryEscalations.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: data.uuid || crypto.randomUUID(),
      referral_id: data.referral_id,
      escalation_level: Number(data.escalation_level || 1),
      escalation_condition: String(data.escalation_condition).toUpperCase(),
      escalation_reason: data.escalation_reason,
      responsible_facility_id: data.responsible_facility_id,
      assigned_recipient_user_id: data.assigned_recipient_user_id ? Number(data.assigned_recipient_user_id) : null,
      escalation_status: 'OPEN',
      resolution_explanation: null,
      resolved_by_user_id: null,
      resolved_at: null,
      created_at: now,
      updated_at: now
    };

    try {
      const sql = `
        INSERT INTO referral_escalations (
          uuid, referral_id, escalation_level, escalation_condition, escalation_reason,
          responsible_facility_id, assigned_recipient_user_id, escalation_status,
          resolution_explanation, resolved_by_user_id, resolved_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.referral_id, item.escalation_level, item.escalation_condition, item.escalation_reason,
        item.responsible_facility_id, item.assigned_recipient_user_id, item.escalation_status,
        item.resolution_explanation, item.resolved_by_user_id, item.resolved_at, item.created_at, item.updated_at
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryEscalations.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryEscalations.set(item.id, item);
    return item;
  }

  /**
   * Find escalation by ID
   */
  async findEscalationById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();

    try {
      const sql = `
        SELECT e.*,
               fac.name as responsible_facility_name,
               u_assign.first_name as assigned_first_name, u_assign.last_name as assigned_last_name,
               u_res.first_name as resolved_by_first_name, u_res.last_name as resolved_by_last_name
        FROM referral_escalations e
        LEFT JOIN healthcare_facilities fac ON e.responsible_facility_id = fac.id
        LEFT JOIN users u_assign ON e.assigned_recipient_user_id = u_assign.id
        LEFT JOIN users u_res ON e.resolved_by_user_id = u_res.id
        WHERE e.id = $1 OR CAST(e.uuid AS text) = $1
      `;
      const res = await query(sql, [isNaN(Number(cleanId)) ? 0 : Number(cleanId)]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    for (const e of inMemoryEscalations.values()) {
      if (String(e.id) === cleanId || e.uuid === cleanId) return e;
    }
    return null;
  }

  /**
   * Check for duplicate open escalation for same referral & condition
   */
  async findActiveEscalation(referralId, condition) {
    try {
      const sql = `
        SELECT * FROM referral_escalations
        WHERE referral_id = $1 AND escalation_condition = $2 AND escalation_status IN ('OPEN', 'ACKNOWLEDGED')
        LIMIT 1
      `;
      const res = await query(sql, [referralId, String(condition).toUpperCase()]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    for (const e of inMemoryEscalations.values()) {
      if (
        e.referral_id === referralId &&
        e.escalation_condition === String(condition).toUpperCase() &&
        ['OPEN', 'ACKNOWLEDGED'].includes(e.escalation_status)
      ) {
        return e;
      }
    }
    return null;
  }

  /**
   * Resolve an escalation
   */
  async resolveEscalation(id, resolutionData) {
    const existing = await this.findEscalationById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates = {
      escalation_status: 'RESOLVED',
      resolution_explanation: resolutionData.resolution_explanation || resolutionData.explanation || 'Escalation resolved',
      resolved_by_user_id: resolutionData.resolved_by_user_id ? Number(resolutionData.resolved_by_user_id) : null,
      resolved_at: now,
      updated_at: now
    };

    try {
      const sql = `
        UPDATE referral_escalations
        SET escalation_status = $1, resolution_explanation = $2, resolved_by_user_id = $3, resolved_at = $4, updated_at = $5
        WHERE id = $6 RETURNING *
      `;
      const res = await query(sql, [
        updates.escalation_status, updates.resolution_explanation, updates.resolved_by_user_id,
        updates.resolved_at, updates.updated_at, existing.id
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryEscalations.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    const item = { ...existing, ...updates };
    inMemoryEscalations.set(existing.id, item);
    return item;
  }

  /**
   * List escalations with multi-parameter filtering & pagination
   */
  async listEscalations(options = {}) {
    const { status, level, facilityId, limit = 50, offset = 0 } = options;

    try {
      const conditions = [];
      const params = [];
      let idx = 1;

      if (status) {
        conditions.push(`e.escalation_status = $${idx++}`);
        params.push(status.toUpperCase());
      }
      if (level) {
        conditions.push(`e.escalation_level = $${idx++}`);
        params.push(Number(level));
      }
      if (facilityId) {
        conditions.push(`e.responsible_facility_id = $${idx++}`);
        params.push(facilityId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT e.*, fac.name as responsible_facility_name, r.reference_number
        FROM referral_escalations e
        LEFT JOIN healthcare_facilities fac ON e.responsible_facility_id = fac.id
        LEFT JOIN referrals r ON e.referral_id = r.id
        ${whereClause}
        ORDER BY e.escalation_level DESC, e.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;
      params.push(limit, offset);
      const res = await query(sql, params);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    let items = Array.from(inMemoryEscalations.values());
    if (status) items = items.filter((e) => e.escalation_status === status.toUpperCase());
    if (level) items = items.filter((e) => Number(e.escalation_level) === Number(level));
    if (facilityId) items = items.filter((e) => e.responsible_facility_id === facilityId);

    return items.slice(offset, offset + limit);
  }

  /**
   * Get all escalations for a specific referral
   */
  async getEscalations(referralId) {
    try {
      const sql = `
        SELECT e.*, fac.name as responsible_facility_name
        FROM referral_escalations e
        LEFT JOIN healthcare_facilities fac ON e.responsible_facility_id = fac.id
        WHERE e.referral_id = $1
        ORDER BY e.created_at DESC
      `;
      const res = await query(sql, [referralId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    return Array.from(inMemoryEscalations.values())
      .filter((e) => e.referral_id === referralId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // ==========================================
  // 6. OPERATIONAL EXCEPTIONS & DELAYS
  // ==========================================

  /**
   * Record an operational exception
   */
  async recordException(data) {
    const id = inMemoryExceptions.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: data.uuid || crypto.randomUUID(),
      referral_id: data.referral_id,
      exception_type: String(data.exception_type).toUpperCase(),
      severity: data.severity ? data.severity.toUpperCase() : 'WARNING',
      target_deadline: data.target_deadline || null,
      elapsed_minutes: data.elapsed_minutes !== undefined ? Number(data.elapsed_minutes) : null,
      is_resolved: false,
      resolved_at: null,
      resolution_notes: null,
      resolved_by_user_id: null,
      created_at: now
    };

    try {
      const sql = `
        INSERT INTO referral_operational_exceptions (
          uuid, referral_id, exception_type, severity, target_deadline,
          elapsed_minutes, is_resolved, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.referral_id, item.exception_type, item.severity,
        item.target_deadline, item.elapsed_minutes, item.is_resolved, item.created_at
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryExceptions.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryExceptions.set(item.id, item);
    return item;
  }

  /**
   * Resolve an operational exception
   */
  async resolveException(id, resolutionData = {}) {
    const now = new Date().toISOString();
    const cleanId = String(id).trim();

    try {
      const sql = `
        UPDATE referral_operational_exceptions
        SET is_resolved = TRUE, resolved_at = $1, resolution_notes = $2, resolved_by_user_id = $3
        WHERE id = $4 OR CAST(uuid AS text) = $5
        RETURNING *
      `;
      const res = await query(sql, [
        now,
        resolutionData.notes || resolutionData.resolution_notes || 'Exception reviewed and resolved',
        resolutionData.resolved_by_user_id ? Number(resolutionData.resolved_by_user_id) : null,
        isNaN(Number(cleanId)) ? 0 : Number(cleanId),
        cleanId
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryExceptions.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    for (const ex of inMemoryExceptions.values()) {
      if (String(ex.id) === cleanId || ex.uuid === cleanId) {
        ex.is_resolved = true;
        ex.resolved_at = now;
        ex.resolution_notes = resolutionData.notes || resolutionData.resolution_notes || 'Exception reviewed and resolved';
        ex.resolved_by_user_id = resolutionData.resolved_by_user_id ? Number(resolutionData.resolved_by_user_id) : null;
        inMemoryExceptions.set(ex.id, ex);
        return ex;
      }
    }
    return null;
  }

  /**
   * List unresolved or filtered exceptions
   */
  async listExceptions(options = {}) {
    const { limit = 50, offset = 0 } = options;
    const parsedIsResolved = (options.isResolved !== undefined && options.isResolved !== null)
      ? (typeof options.isResolved === 'boolean' ? options.isResolved : String(options.isResolved).toLowerCase() === 'true')
      : undefined;

    try {
      const conditions = [];
      const params = [];
      let idx = 1;

      if (parsedIsResolved !== undefined) {
        conditions.push(`ex.is_resolved = $${idx++}`);
        params.push(parsedIsResolved);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT ex.*, r.reference_number, r.status as referral_status, r.priority as referral_priority
        FROM referral_operational_exceptions ex
        LEFT JOIN referrals r ON ex.referral_id = r.id
        ${whereClause}
        ORDER BY ex.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;
      params.push(limit, offset);
      const res = await query(sql, params);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    let items = Array.from(inMemoryExceptions.values());
    if (parsedIsResolved !== undefined) {
      items = items.filter((e) => Boolean(e.is_resolved) === parsedIsResolved);
    }
    return items.slice(offset, offset + limit);
  }

  /**
   * Reset all in-memory stores for testing
   */
  clearStore() {
    inMemoryPolicies.clear();
    inMemoryFollowUps.clear();
    inMemoryInfoRequests.clear();
    inMemoryReassignments.clear();
    inMemoryEscalations.clear();
    inMemoryExceptions.clear();
  }
}

export default new CoordinationRepository();
