/**
 * CareConnect Ethiopia - Referral Coordination & Escalation Service
 * Business logic for Response Policies, Deadline Calculations, Follow-ups,
 * Structured Additional Info Requests, Human-Managed Reassignments,
 * Operational Escalations, Delay Monitoring, and Unified Timelines.
 */

import coordinationRepository from '../repositories/coordinationRepository.js';
import referralRepository from '../repositories/referralRepository.js';
import facilityRepository from '../repositories/facilityRepository.js';
import securityAuditService from './securityAuditService.js';
import {
  validateCreatePolicy,
  validateCreateFollowUp,
  validateCreateInfoRequest,
  validateRespondInfoRequest,
  validateReassignment,
  validateCreateEscalation,
  validateResolveEscalation,
  validateResolveException
} from '../validators/coordinationValidator.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError
} from '../utils/errors.js';

export class CoordinationService {
  // ==========================================
  // 1. RESPONSE POLICIES (SLAs) & DEADLINES
  // ==========================================

  /**
   * Create or version a response policy
   */
  async createPolicy(payload, userContext = {}) {
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    // Regional Officers (5) and System Admins (6) can manage operational policies
    if (userRoleId !== 5 && userRoleId !== 6) {
      throw new ForbiddenError('Only regional coordination officers and administrators can configure SLA response policies');
    }

    const validated = validateCreatePolicy(payload);

    if (validated.facility_id) {
      const facility = await facilityRepository.findById(validated.facility_id);
      if (!facility && !validated.facility_id.startsWith('fac-')) {
        throw new NotFoundError(`Facility [${validated.facility_id}] not found`);
      }
    }

    const policy = await coordinationRepository.createPolicy({
      ...validated,
      created_by_user_id: userContext.id || null
    });

    await securityAuditService.recordEvent({
      eventName: 'POLICY_CREATED',
      category: 'COORDINATION_POLICY',
      userId: userContext.id || null,
      facilityId: policy.facility_id || null,
      action: 'POLICY_CREATED',
      resourceType: 'referral_response_policy',
      resourceId: policy.id,
      details: {
        policyId: policy.id,
        policyName: policy.name,
        ackMinutes: policy.acknowledgement_deadline_minutes,
        decisionMinutes: policy.decision_deadline_minutes
      }
    });

    return policy;
  }

  /**
   * Calculate operational deadlines based on matching policy
   */
  async calculateDeadlines(referral, explicitPolicyId = null) {
    let policy = null;
    if (explicitPolicyId) {
      policy = await coordinationRepository.findPolicyById(explicitPolicyId);
    }

    if (!policy) {
      policy = await coordinationRepository.findApplicablePolicy({
        facilityId: referral.destination_facility_id,
        priority: referral.priority
      });
    }

    // Default parameters if no policy configured
    const ackMinutes = policy ? policy.acknowledgement_deadline_minutes : (referral.priority === 'EMERGENCY' ? 15 : (referral.priority === 'URGENT' ? 60 : 120));
    const decMinutes = policy ? policy.decision_deadline_minutes : (referral.priority === 'EMERGENCY' ? 30 : (referral.priority === 'URGENT' ? 120 : 240));

    const baseTime = referral.submitted_at ? new Date(referral.submitted_at) : new Date();

    const ackDeadline = new Date(baseTime.getTime() + ackMinutes * 60 * 1000).toISOString();
    const decDeadline = new Date(baseTime.getTime() + decMinutes * 60 * 1000).toISOString();

    return {
      policyId: policy ? policy.id : null,
      policyVersion: policy ? policy.version : 1,
      acknowledgementDeadline: ackDeadline,
      decisionDeadline: decDeadline,
      policyName: policy ? policy.name : 'Default Fallback Policy'
    };
  }

  /**
   * Attach policy and calculated deadlines to an active referral
   */
  async applyPolicyToReferral(referralId, explicitPolicyId = null) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const { policyId, policyVersion, acknowledgementDeadline, decisionDeadline } =
      await this.calculateDeadlines(referral, explicitPolicyId);

    const updated = await referralRepository.update(referralId, {
      policy_id: policyId,
      policy_version: policyVersion,
      acknowledgement_deadline: acknowledgementDeadline,
      decision_deadline: decisionDeadline
    });

    return updated;
  }

  /**
   * List response policies
   */
  async listPolicies(options = {}, userContext = {}) {
    return coordinationRepository.listPolicies(options);
  }

  /**
   * Deactivate a response policy
   */
  async deactivatePolicy(policyId, userContext = {}) {
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    if (userRoleId !== 5 && userRoleId !== 6) {
      throw new ForbiddenError('Only regional officers and administrators can deactivate response policies');
    }

    const existing = await coordinationRepository.findPolicyById(policyId);
    if (!existing) {
      throw new NotFoundError(`Response policy [${policyId}] not found`);
    }

    const updated = await coordinationRepository.deactivatePolicy(policyId);

    await securityAuditService.recordEvent({
      eventName: 'POLICY_DEACTIVATED',
      category: 'COORDINATION_POLICY',
      userId: userContext.id || null,
      facilityId: existing.facility_id || null,
      action: 'POLICY_DEACTIVATED',
      resourceType: 'referral_response_policy',
      resourceId: policyId,
      details: { policyId, policyName: existing.name }
    });

    return updated;
  }

  // ==========================================
  // 2. REFERRAL FOLLOW-UPS
  // ==========================================

  /**
   * Record a follow-up interaction
   */
  async recordFollowUp(referralId, payload, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const validated = validateCreateFollowUp(payload);
    const now = new Date().toISOString();

    const record = await coordinationRepository.recordFollowUp({
      ...validated,
      referral_id: referralId,
      responsible_user_id: userContext.id || 1,
      facility_id: userContext.facilityId || referral.origin_facility_id,
      attempted_at: now
    });

    // Increment follow-up metrics on referral
    const currentCount = Number(referral.followup_count || 0) + 1;
    await referralRepository.update(referralId, {
      last_followup_at: now,
      followup_count: currentCount
    });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_FOLLOWUP_RECORDED',
      category: 'REFERRAL_COORDINATION',
      userId: userContext.id || null,
      facilityId: userContext.facilityId || referral.origin_facility_id,
      action: 'REFERRAL_FOLLOWUP_RECORDED',
      resourceType: 'referral_follow_up',
      resourceId: record.id,
      details: {
        referralId,
        channel: record.communication_channel,
        outcome: record.outcome,
        followupCount: currentCount
      }
    });

    return record;
  }

  /**
   * List follow-ups for a referral
   */
  async getFollowUps(referralId, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }
    return coordinationRepository.getFollowUps(referralId);
  }

  // ==========================================
  // 3. ADDITIONAL INFORMATION WORKFLOW
  // ==========================================

  /**
   * Hospital staff requests additional clinical / diagnostic information
   */
  async createInformationRequest(referralId, payload, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userFacilityId = userContext.facilityId || userContext.facility_id;
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);

    // Enforce receiving hospital tenancy
    if ((userRoleId === 2 || userRoleId === 3) && userFacilityId && referral.destination_facility_id !== userFacilityId) {
      throw new ForbiddenError('You can only request information for referrals assigned to your hospital');
    }

    if (['COMPLETED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(referral.status)) {
      throw new BadRequestError(`Cannot request information on referral in terminal status [${referral.status}]`);
    }

    const validated = validateCreateInfoRequest(payload);

    const infoReq = await coordinationRepository.createInformationRequest({
      ...validated,
      referral_id: referralId,
      requesting_user_id: userContext.id || 1,
      requesting_facility_id: userFacilityId || referral.destination_facility_id
    });

    // Transition referral state to INFO_REQUESTED if not already
    if (referral.status !== 'INFO_REQUESTED') {
      await referralRepository.updateStatus(referralId, 'INFO_REQUESTED', {
        userId: userContext.id,
        facilityId: userFacilityId || referral.destination_facility_id,
        reason: validated.clinical_reason
      });
    }

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_INFO_REQUEST_CREATED',
      category: 'REFERRAL_COORDINATION',
      userId: userContext.id || null,
      facilityId: userFacilityId || referral.destination_facility_id,
      action: 'REFERRAL_INFO_REQUEST_CREATED',
      resourceType: 'referral_information_request',
      resourceId: infoReq.id,
      details: {
        referralId,
        requestedInformation: validated.requested_information
      }
    });

    return infoReq;
  }

  /**
   * Health centre staff responds to an additional information request
   */
  async respondToInformationRequest(requestId, payload, userContext = {}) {
    const req = await coordinationRepository.findInfoRequestById(requestId);
    if (!req) {
      throw new NotFoundError(`Information request [${requestId}] not found`);
    }

    if (req.request_status === 'RESPONDED') {
      throw new BadRequestError(`Information request [${requestId}] has already been answered`);
    }

    const referral = await referralRepository.findById(req.referral_id);
    if (!referral) {
      throw new NotFoundError(`Referral [${req.referral_id}] not found`);
    }

    const userFacilityId = userContext.facilityId || userContext.facility_id;
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);

    // Enforce origin facility tenancy: Health Centre staff must belong to referring facility
    if (userRoleId === 1 && userFacilityId && referral.origin_facility_id !== userFacilityId) {
      throw new ForbiddenError('Only the referring health centre staff can respond to this information request');
    }

    const validated = validateRespondInfoRequest(payload);

    const updatedReq = await coordinationRepository.recordInfoResponse(requestId, {
      ...validated,
      responding_user_id: userContext.id || null,
      responding_facility_id: userFacilityId || referral.origin_facility_id
    });

    // Check if any other info requests are still pending
    const allRequests = await coordinationRepository.getInfoRequests(referral.id);
    const hasRemainingPending = allRequests.some((r) => r.id !== req.id && r.request_status === 'PENDING');

    // If all requests are answered, return referral status to SUBMITTED
    if (!hasRemainingPending && referral.status === 'INFO_REQUESTED') {
      await referralRepository.updateStatus(referral.id, 'SUBMITTED', {
        userId: userContext.id,
        facilityId: userFacilityId || referral.origin_facility_id,
        reason: 'Additional requested clinical information provided by referring facility'
      });
    }

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_INFO_REQUEST_RESPONDED',
      category: 'REFERRAL_COORDINATION',
      userId: userContext.id || null,
      facilityId: userFacilityId || referral.origin_facility_id,
      action: 'REFERRAL_INFO_REQUEST_RESPONDED',
      resourceType: 'referral_information_request',
      resourceId: requestId,
      details: {
        referralId: referral.id,
        requestId,
        status: updatedReq.request_status
      }
    });

    return updatedReq;
  }

  /**
   * List all information requests for a referral
   */
  async getInfoRequests(referralId, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }
    return coordinationRepository.getInfoRequests(referralId);
  }

  // ==========================================
  // 4. HUMAN-MANAGED REFERRAL REASSIGNMENT
  // ==========================================

  /**
   * Human-managed referral reassignment with mandatory explanation
   */
  async reassignReferral(referralId, payload, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    // Transport coordinators (Role 4) cannot reassign hospitals
    if (userRoleId === 4) {
      throw new ForbiddenError('Transport coordinators are not authorized to execute referral reassignment');
    }

    if (['COMPLETED', 'CLOSED', 'CANCELLED'].includes(referral.status)) {
      throw new BadRequestError(`Cannot reassign referral in terminal status [${referral.status}]`);
    }

    const validated = validateReassignment(payload);

    if (validated.new_facility_id === referral.destination_facility_id) {
      throw new BadRequestError(`Referral is already assigned to hospital [${validated.new_facility_id}]`);
    }

    const newHospital = await facilityRepository.findById(validated.new_facility_id);
    if (!newHospital && !validated.new_facility_id.startsWith('fac-')) {
      throw new NotFoundError(`Target destination hospital [${validated.new_facility_id}] not found`);
    }

    const previousHospitalId = referral.destination_facility_id;

    // Record reassignment history
    const record = await coordinationRepository.recordReassignment({
      referral_id: referralId,
      previous_facility_id: previousHospitalId,
      new_facility_id: validated.new_facility_id,
      reassignment_reason: validated.reassignment_reason,
      reassignment_notes: validated.reassignment_notes,
      authorized_by_user_id: userContext.id || 1
    });

    // Update referral destination and status to ASSIGNED
    await referralRepository.updateStatus(referralId, 'ASSIGNED', {
      userId: userContext.id,
      facilityId: userContext.facilityId,
      destinationFacilityId: validated.new_facility_id,
      reason: `Human-managed reassignment from [${previousHospitalId || 'None'}] to [${validated.new_facility_id}]: ${validated.reassignment_notes}`
    });

    // Recalculate response deadlines based on new hospital policy
    await this.applyPolicyToReferral(referralId);

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_REASSIGNED',
      category: 'REFERRAL_COORDINATION',
      userId: userContext.id || null,
      facilityId: validated.new_facility_id,
      action: 'REFERRAL_REASSIGNED',
      resourceType: 'referral_reassignment',
      resourceId: record.id,
      details: {
        referralId,
        previousHospitalId,
        newHospitalId: validated.new_facility_id,
        reason: validated.reassignment_reason
      }
    });

    return referralRepository.findById(referralId);
  }

  /**
   * Get reassignment history for a referral
   */
  async getReassignments(referralId, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }
    return coordinationRepository.getReassignments(referralId);
  }

  // ==========================================
  // 5. OPERATIONAL ESCALATION RULES
  // ==========================================

  /**
   * Create an operational escalation (Levels 1-3)
   */
  async createEscalation(referralId, payload, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    if (['COMPLETED', 'CLOSED', 'CANCELLED'].includes(referral.status)) {
      throw new BadRequestError(`Cannot trigger operational escalation on referral in [${referral.status}] status`);
    }

    const validated = validateCreateEscalation(payload);

    // Prevent duplicate open escalations for the exact same unresolved condition
    const duplicate = await coordinationRepository.findActiveEscalation(referralId, validated.escalation_condition);
    if (duplicate) {
      throw new ConflictError(`An active escalation for condition [${validated.escalation_condition}] already exists on this referral`);
    }

    const responsibleFacilityId = referral.destination_facility_id || referral.origin_facility_id;

    const record = await coordinationRepository.createEscalation({
      ...validated,
      referral_id: referralId,
      responsible_facility_id: responsibleFacilityId
    });

    // Update referral escalation level (monotonically non-decreasing until resolved)
    const newLevel = Math.max(Number(referral.escalation_level || 0), validated.escalation_level);
    await referralRepository.update(referralId, { escalation_level: newLevel });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_ESCALATED',
      category: 'OPERATIONAL_ESCALATION',
      userId: userContext.id || null,
      facilityId: responsibleFacilityId,
      action: 'REFERRAL_ESCALATED',
      resourceType: 'referral_escalation',
      resourceId: record.id,
      details: {
        referralId,
        level: validated.escalation_level,
        condition: validated.escalation_condition,
        reason: validated.escalation_reason
      }
    });

    return record;
  }

  /**
   * Resolve an operational escalation with explanation
   */
  async resolveEscalation(escalationId, payload, userContext = {}) {
    const escalation = await coordinationRepository.findEscalationById(escalationId);
    if (!escalation) {
      throw new NotFoundError(`Escalation record [${escalationId}] not found`);
    }

    if (escalation.escalation_status === 'RESOLVED') {
      throw new BadRequestError(`Escalation [${escalationId}] is already resolved`);
    }

    const validated = validateResolveEscalation(payload);

    const resolved = await coordinationRepository.resolveEscalation(escalationId, {
      ...validated,
      resolved_by_user_id: userContext.id || null
    });

    // Check remaining active escalations on this referral
    const remaining = await coordinationRepository.getEscalations(escalation.referral_id);
    const activeRemaining = remaining.filter((e) => e.id !== escalation.id && e.escalation_status === 'OPEN');

    // Reset or downgrade referral escalation level
    const maxActiveLevel = activeRemaining.length > 0 ? Math.max(...activeRemaining.map((e) => e.escalation_level)) : 0;
    await referralRepository.update(escalation.referral_id, { escalation_level: maxActiveLevel });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_ESCALATION_RESOLVED',
      category: 'OPERATIONAL_ESCALATION',
      userId: userContext.id || null,
      facilityId: escalation.responsible_facility_id,
      action: 'REFERRAL_ESCALATION_RESOLVED',
      resourceType: 'referral_escalation',
      resourceId: escalationId,
      details: {
        referralId: escalation.referral_id,
        explanation: validated.resolution_explanation
      }
    });

    return resolved;
  }

  /**
   * List escalations with filtering
   */
  async listEscalations(options = {}, userContext = {}) {
    return coordinationRepository.listEscalations(options);
  }

  /**
   * Get escalations for a specific referral
   */
  async getEscalations(referralId, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }
    return coordinationRepository.getEscalations(referralId);
  }

  // ==========================================
  // 6. DELAY MONITORING & EXCEPTION MANAGEMENT
  // ==========================================

  /**
   * Measure actual durations vs configured targets
   */
  async getReferralDelays(referralId, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const now = new Date();
    const delays = {
      referral_id: referral.id,
      reference_number: referral.reference_number,
      status: referral.status,
      priority: referral.priority,
      submitted_at: referral.submitted_at || null,
      acknowledged_at: referral.acknowledged_at || null,
      decision_at: referral.decision_at || null,
      arrived_at: referral.arrived_at || null,
      completed_at: referral.completed_at || null,
      acknowledgement_deadline: referral.acknowledgement_deadline || null,
      decision_deadline: referral.decision_deadline || null,
      metrics: {
        submission_to_ack_minutes: null,
        ack_to_decision_minutes: null,
        decision_to_arrival_minutes: null,
        arrival_to_completion_minutes: null,
        total_cycle_minutes: null
      },
      exceptions: {
        is_ack_overdue: false,
        is_decision_overdue: false,
        ack_overdue_minutes: 0,
        decision_overdue_minutes: 0
      }
    };

    if (referral.submitted_at && referral.acknowledged_at) {
      const diffMs = new Date(referral.acknowledged_at) - new Date(referral.submitted_at);
      delays.metrics.submission_to_ack_minutes = Math.max(0, Math.round(diffMs / 60000));
    }

    if (referral.acknowledged_at && referral.decision_at) {
      const diffMs = new Date(referral.decision_at) - new Date(referral.acknowledged_at);
      delays.metrics.ack_to_decision_minutes = Math.max(0, Math.round(diffMs / 60000));
    }

    if (referral.decision_at && referral.arrived_at) {
      const diffMs = new Date(referral.arrived_at) - new Date(referral.decision_at);
      delays.metrics.decision_to_arrival_minutes = Math.max(0, Math.round(diffMs / 60000));
    }

    if (referral.arrived_at && referral.completed_at) {
      const diffMs = new Date(referral.completed_at) - new Date(referral.arrived_at);
      delays.metrics.arrival_to_completion_minutes = Math.max(0, Math.round(diffMs / 60000));
    }

    if (referral.submitted_at && referral.completed_at) {
      const diffMs = new Date(referral.completed_at) - new Date(referral.submitted_at);
      delays.metrics.total_cycle_minutes = Math.max(0, Math.round(diffMs / 60000));
    }

    // Check deadlines
    if (!referral.acknowledged_at && referral.acknowledgement_deadline) {
      const ackDeadline = new Date(referral.acknowledgement_deadline);
      if (now > ackDeadline && !['DRAFT', 'COMPLETED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(referral.status)) {
        delays.exceptions.is_ack_overdue = true;
        delays.exceptions.ack_overdue_minutes = Math.round((now - ackDeadline) / 60000);
      }
    }

    if (!referral.decision_at && referral.decision_deadline) {
      const decDeadline = new Date(referral.decision_deadline);
      if (now > decDeadline && !['DRAFT', 'COMPLETED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(referral.status)) {
        delays.exceptions.is_decision_overdue = true;
        delays.exceptions.decision_overdue_minutes = Math.round((now - decDeadline) / 60000);
      }
    }

    return delays;
  }

  /**
   * List operational exceptions
   */
  async listExceptions(options = {}, userContext = {}) {
    return coordinationRepository.listExceptions(options);
  }

  /**
   * Resolve an operational exception
   */
  async resolveException(exceptionId, payload, userContext = {}) {
    const validated = validateResolveException(payload);
    const resolved = await coordinationRepository.resolveException(exceptionId, {
      ...validated,
      resolved_by_user_id: userContext.id || null
    });
    if (!resolved) {
      throw new NotFoundError(`Exception record [${exceptionId}] not found`);
    }

    await securityAuditService.recordEvent({
      eventName: 'OPERATIONAL_EXCEPTION_RESOLVED',
      category: 'OPERATIONAL_COORDINATION',
      userId: userContext.id || null,
      facilityId: userContext.facilityId || null,
      action: 'OPERATIONAL_EXCEPTION_RESOLVED',
      resourceType: 'referral_operational_exception',
      resourceId: exceptionId,
      details: { exceptionId, notes: validated.resolution_notes }
    });

    return resolved;
  }

  // ==========================================
  // 7. UNIFIED COORDINATION TIMELINE
  // ==========================================

  /**
   * Build chronological multi-source coordination timeline with privacy protection
   */
  async getUnifiedTimeline(referralId, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const [statusHistory, decisions, followUps, infoRequests, reassignments, escalations] =
      await Promise.all([
        referralRepository.getStatusHistory(referralId),
        referralRepository.getDecisions(referralId),
        coordinationRepository.getFollowUps(referralId),
        coordinationRepository.getInfoRequests(referralId),
        coordinationRepository.getReassignments(referralId),
        coordinationRepository.getEscalations(referralId)
      ]);

    const timeline = [];

    // 1. Status Transitions
    for (const h of statusHistory) {
      timeline.push({
        event_type: 'STATUS_TRANSITION',
        timestamp: h.created_at,
        actor_user_id: h.changed_by_user_id,
        facility_id: h.changed_at_facility_id,
        description: `Referral status progressed from [${h.from_status || 'INITIAL'}] to [${h.to_status}]`,
        details: { fromStatus: h.from_status, toStatus: h.to_status, reason: h.reason_text }
      });
    }

    // 2. Clinical Decisions
    for (const d of decisions) {
      timeline.push({
        event_type: 'CLINICAL_DECISION',
        timestamp: d.decision_timestamp,
        actor_user_id: d.evaluating_clinician_id,
        facility_id: d.hospital_id,
        description: `Hospital recorded clinical triage decision: [${d.decision}]`,
        details: { decision: d.decision, notes: d.decision_notes, bedAllocated: d.bed_allocated }
      });
    }

    // 3. Follow-up Attempts
    for (const f of followUps) {
      timeline.push({
        event_type: 'COORDINATION_FOLLOWUP',
        timestamp: f.attempted_at,
        actor_user_id: f.responsible_user_id,
        facility_id: f.facility_id,
        description: `Referral follow-up attempted via [${f.communication_channel}] with outcome [${f.outcome}]`,
        details: { channel: f.communication_channel, outcome: f.outcome, notes: f.reason_or_notes }
      });
    }

    // 4. Additional Information Requests & Responses
    for (const r of infoRequests) {
      timeline.push({
        event_type: 'INFO_REQUESTED',
        timestamp: r.requested_at,
        actor_user_id: r.requesting_user_id,
        facility_id: r.requesting_facility_id,
        description: `Hospital requested additional clinical information`,
        details: { requestedInfo: r.requested_information, reason: r.clinical_reason }
      });

      if (r.responded_at) {
        timeline.push({
          event_type: 'INFO_RESPONDED',
          timestamp: r.responded_at,
          actor_user_id: r.responding_user_id,
          facility_id: r.responding_facility_id,
          description: `Health centre provided response to information request`,
          details: { responseNotes: r.response_notes }
        });
      }
    }

    // 5. Reassignments
    for (const re of reassignments) {
      timeline.push({
        event_type: 'HOSPITAL_REASSIGNED',
        timestamp: re.reassigned_at,
        actor_user_id: re.authorized_by_user_id,
        facility_id: re.new_facility_id,
        description: `Human-managed reassignment to hospital [${re.new_facility_id}]`,
        details: { reason: re.reassignment_reason, notes: re.reassignment_notes }
      });
    }

    // 6. Operational Escalations
    for (const esc of escalations) {
      timeline.push({
        event_type: 'OPERATIONAL_ESCALATION',
        timestamp: esc.created_at,
        actor_user_id: null,
        facility_id: esc.responsible_facility_id,
        description: `Operational escalation Level ${esc.escalation_level} triggered: [${esc.escalation_condition}]`,
        details: { level: esc.escalation_level, condition: esc.escalation_condition, reason: esc.escalation_reason }
      });

      if (esc.resolved_at) {
        timeline.push({
          event_type: 'ESCALATION_RESOLVED',
          timestamp: esc.resolved_at,
          actor_user_id: esc.resolved_by_user_id,
          facility_id: esc.responsible_facility_id,
          description: `Operational escalation Level ${esc.escalation_level} resolved`,
          details: { explanation: esc.resolution_explanation }
        });
      }
    }

    // Sort chronologically ascending
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return {
      referral_id: referral.id,
      reference_number: referral.reference_number,
      status: referral.status,
      priority: referral.priority,
      total_events: timeline.length,
      timeline
    };
  }
}

export default new CoordinationService();
