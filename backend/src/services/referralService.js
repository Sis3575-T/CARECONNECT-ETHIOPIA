/**
 * CareConnect Ethiopia - Referral Service Domain Logic
 * Implements referral creation, state machine transitions, hospital triage decisions,
 * arrival, progress, completion, reference generation, and privacy-governed tracking.
 */

import referralRepository from '../repositories/referralRepository.js';
import patientRepository from '../repositories/patientRepository.js';
import facilityRepository from '../repositories/facilityRepository.js';
import coordinationService from './coordinationService.js';
import securityAuditService from './securityAuditService.js';
import {
  validateCreateReferral,
  validateUpdateReferral,
  validateRejectReferral,
  validateRequestInfo,
  validateUpdatePriority,
  validateCancelReferral,
  validateRecordCorrection
} from '../validators/referralValidator.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError
} from '../utils/errors.js';

// Strict Finite State Machine: Permitted Transitions
export const ALLOWED_TRANSITIONS = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['PENDING_ASSIGNMENT', 'ASSIGNED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'INFO_REQUESTED', 'CANCELLED'],
  PENDING_ASSIGNMENT: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'INFO_REQUESTED', 'CANCELLED'],
  ACKNOWLEDGED: ['ACCEPTED', 'REJECTED', 'INFO_REQUESTED', 'CANCELLED'],
  INFO_REQUESTED: ['SUBMITTED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['TRANSPORT_ASSIGNED', 'IN_TRANSIT', 'PATIENT_ARRIVED', 'ARRIVED', 'CANCELLED'],
  TRANSPORT_ASSIGNED: ['IN_TRANSIT', 'PATIENT_ARRIVED', 'ARRIVED', 'CANCELLED'],
  IN_TRANSIT: ['PATIENT_ARRIVED', 'ARRIVED', 'CANCELLED'],
  ARRIVED: ['PATIENT_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'],
  PATIENT_ARRIVED: ['IN_PROGRESS', 'COMPLETED', 'CLOSED'],
  IN_PROGRESS: ['COMPLETED', 'CLOSED'],
  COMPLETED: ['CLOSED'],
  REJECTED: [], // Terminal state
  CANCELLED: [], // Terminal state
  CLOSED: [] // Terminal state
};

export class ReferralService {
  /**
   * Enforces finite state machine transition rules
   */
  assertValidTransition(currentStatus, newStatus) {
    const from = String(currentStatus || 'DRAFT').toUpperCase();
    const to = String(newStatus).toUpperCase();

    if (from === to) return true; // Idempotent no-op

    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new BadRequestError(
        `Invalid referral status transition: Cannot transition from [${from}] to [${to}]. Allowed target states: [${(allowed || []).join(', ') || 'None (Terminal state)'}]`
      );
    }
    return true;
  }

  /**
   * Sanitize referral representation depending on actor role and privacy scope
   */
  sanitizeReferral(referral, userContext = {}, isPublicTracking = false) {
    if (!referral) return null;

    // 1. Public reference tracking (Strict minimum: NO demographic names, NO phone, NO diagnosis)
    if (isPublicTracking) {
      return {
        reference_number: referral.reference_number || referral.id,
        status: referral.status,
        priority: referral.priority,
        origin_facility_name: referral.origin_facility_name || null,
        destination_facility_name: referral.destination_facility_name || null,
        submitted_at: referral.submitted_at,
        acknowledged_at: referral.acknowledged_at,
        decision_at: referral.decision_at,
        arrived_at: referral.arrived_at,
        completed_at: referral.completed_at,
        created_at: referral.created_at
      };
    }

    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);

    const base = {
      id: referral.id,
      uuid: referral.uuid,
      reference_number: referral.reference_number || referral.id,
      patient_id: referral.patient_id,
      patient_name: referral.patient_first_name
        ? `${referral.patient_first_name} ${referral.patient_father_name || ''}`.trim()
        : null,
      patient_gender: referral.patient_gender,
      patient_age_years: referral.patient_age_years,
      patient_phone_number: referral.patient_phone_number,
      origin_facility_id: referral.origin_facility_id,
      origin_facility_name: referral.origin_facility_name || null,
      destination_facility_id: referral.destination_facility_id,
      destination_facility_name: referral.destination_facility_name || null,
      priority: referral.priority,
      status: referral.status,
      transport_required: Boolean(referral.transport_required),
      submitted_at: referral.submitted_at,
      acknowledged_at: referral.acknowledged_at,
      decision_at: referral.decision_at,
      arrived_at: referral.arrived_at,
      completed_at: referral.completed_at,
      closed_at: referral.closed_at,
      cancelled_at: referral.cancelled_at,
      policy_id: referral.policy_id || null,
      policy_version: referral.policy_version || 1,
      acknowledgement_deadline: referral.acknowledgement_deadline || null,
      decision_deadline: referral.decision_deadline || null,
      escalation_level: referral.escalation_level || 0,
      followup_count: referral.followup_count || 0,
      last_followup_at: referral.last_followup_at || null,
      created_at: referral.created_at,
      updated_at: referral.updated_at
    };

    // 2. Transport Coordinator (Roles 4 & 5): Transit-essential details ONLY
    if (userRoleId === 4 || userRoleId === 5) {
      return {
        ...base,
        pickup_location: referral.origin_facility_name || referral.origin_facility_id,
        dropoff_location: referral.destination_facility_name || referral.destination_facility_id,
        patient_woreda: referral.patient_woreda || null
        // Notice: primary_diagnosis, clinical_summary, vitals, and sensitive notes are strictly OMITTED
      };
    }

    // 3. Clinical Staff (Health Centre & Hospital) and Administrators: Full clinical referral record
    return {
      ...base,
      required_specialty: referral.required_specialty,
      primary_diagnosis: referral.primary_diagnosis,
      clinical_summary: referral.clinical_summary,
      reason_for_referral: referral.reason_for_referral,
      vitals_blood_pressure: referral.vitals_blood_pressure,
      vitals_pulse_rate: referral.vitals_pulse_rate,
      vitals_respiratory_rate: referral.vitals_respiratory_rate,
      vitals_temperature: referral.vitals_temperature,
      vitals_spo2: referral.vitals_spo2,
      provisional_treatment_given: referral.provisional_treatment_given,
      rejection_reason: referral.rejection_reason,
      rejection_category: referral.rejection_category,
      info_request_notes: referral.info_request_notes,
      assigned_bed_type: referral.assigned_bed_type,
      current_progress_notes: referral.current_progress_notes,
      closure_reason: referral.closure_reason,
      cancellation_reason: referral.cancellation_reason,
      status_history: referral.status_history || [],
      decisions: referral.decisions || []
    };
  }

  /**
   * Create a new referral (Draft or Immediate Submission)
   */
  async createReferral(payload, userContext = {}) {
    const isSubmitting = payload.status === 'SUBMITTED';
    const validated = validateCreateReferral(payload, isSubmitting);

    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    const userFacilityId = userContext.facilityId || userContext.facility_id;

    // Enforce origin facility tenancy: Health Centre staff cannot create referrals for other facilities
    if (userRoleId === 1 && !userFacilityId) {
      throw new ForbiddenError('Referring clinician must be assigned to an active healthcare facility');
    }

    const originFacilityId = userFacilityId || validated.origin_facility_id;
    if (!originFacilityId) {
      throw new BadRequestError('origin_facility_id is required to create a referral');
    }

    // Verify patient existence and active status
    const patient = await patientRepository.findById(validated.patient_id);
    if (!patient) {
      throw new NotFoundError(`Patient record [${validated.patient_id}] not found`);
    }

    // Verify destination facility if supplied
    if (validated.destination_facility_id) {
      const destFacility = await facilityRepository.findById(validated.destination_facility_id);
      if (!destFacility && !validated.destination_facility_id.startsWith('fac-')) {
        throw new NotFoundError(`Destination facility [${validated.destination_facility_id}] not found`);
      }
    }

    // Determine initial status: if submitting without destination, set to PENDING_ASSIGNMENT
    let initialStatus = 'DRAFT';
    if (isSubmitting) {
      initialStatus = validated.destination_facility_id ? 'SUBMITTED' : 'PENDING_ASSIGNMENT';
    }

    let created = await referralRepository.create({
      ...validated,
      origin_facility_id: originFacilityId,
      referring_clinician_id: userContext.id || null,
      status: initialStatus
    });

    if (isSubmitting) {
      try {
        created = await coordinationService.applyPolicyToReferral(created.id);
      } catch {
        // Fallback
      }
    }

    await securityAuditService.recordEvent({
      eventName: isSubmitting ? 'REFERRAL_SUBMITTED' : 'REFERRAL_CREATED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: originFacilityId,
      action: isSubmitting ? 'REFERRAL_SUBMITTED' : 'REFERRAL_CREATED',
      resourceType: 'referral',
      resourceId: created.id,
      details: {
        referralId: created.id,
        referenceNumber: created.reference_number,
        patientId: patient.id,
        status: created.status,
        priority: created.priority
      }
    });

    return this.sanitizeReferral(created, userContext);
  }

  /**
   * Update referral clinical and demographic fields (Only allowed in DRAFT status)
   */
  async updateReferral(referralId, updates, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    const userFacilityId = userContext.facilityId || userContext.facility_id;

    if (userRoleId === 1 && userFacilityId && referral.origin_facility_id !== userFacilityId) {
      throw new ForbiddenError('You can only update referrals created by your healthcare facility');
    }

    if (referral.status !== 'DRAFT') {
      throw new BadRequestError(`Cannot directly update referral in [${referral.status}] status; use clinical progress or corrections`);
    }

    const validated = validateUpdateReferral(updates);

    if (validated.destination_facility_id) {
      const destFacility = await facilityRepository.findById(validated.destination_facility_id);
      if (!destFacility && !validated.destination_facility_id.startsWith('fac-')) {
        throw new NotFoundError(`Destination facility [${validated.destination_facility_id}] not found`);
      }
    }

    const updated = await referralRepository.update(referralId, validated);

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_UPDATED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: referral.origin_facility_id,
      action: 'REFERRAL_UPDATED',
      resourceType: 'referral',
      resourceId: referralId,
      details: {
        referralId,
        updatedFields: Object.keys(validated)
      }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Alias for updateReferral
   */
  async update(referralId, updates, userContext = {}) {
    return this.updateReferral(referralId, updates, userContext);
  }

  /**
   * Submit an existing draft referral
   */
  async submitReferral(referralId, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userFacilityId = userContext.facilityId || userContext.facility_id;
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);

    if (userRoleId === 1 && userFacilityId && referral.origin_facility_id !== userFacilityId) {
      throw new ForbiddenError('You can only submit referrals created by your healthcare facility');
    }

    // Validate current status permits submission
    this.assertValidTransition(referral.status, 'SUBMITTED');

    // Ensure clinical requirements are satisfied before formal submission
    if (!referral.primary_diagnosis || !referral.clinical_summary || !referral.reason_for_referral) {
      throw new BadRequestError('Referral cannot be submitted without primary_diagnosis, clinical_summary, and reason_for_referral');
    }

    const targetStatus = referral.destination_facility_id ? 'SUBMITTED' : 'PENDING_ASSIGNMENT';

    let updated = await referralRepository.updateStatus(referralId, targetStatus, {
      userId: userContext.id,
      facilityId: userFacilityId || referral.origin_facility_id,
      reason: 'Referral submitted for receiving hospital review'
    });

    try {
      updated = await coordinationService.applyPolicyToReferral(referralId);
    } catch {
      // Fallback
    }

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_SUBMITTED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userFacilityId || referral.origin_facility_id,
      action: 'REFERRAL_SUBMITTED',
      resourceType: 'referral',
      resourceId: referralId,
      details: {
        referralId,
        referenceNumber: updated.reference_number,
        status: targetStatus
      }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Hospital Clinician acknowledges receipt of referral
   */
  async acknowledgeReferral(referralId, notes, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userFacilityId = userContext.facilityId || userContext.facility_id;
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);

    // Enforce receiving hospital tenancy
    if ((userRoleId === 2 || userRoleId === 3) && userFacilityId && referral.destination_facility_id !== userFacilityId) {
      throw new ForbiddenError('Access denied: This referral is not assigned to your hospital');
    }

    this.assertValidTransition(referral.status, 'ACKNOWLEDGED');

    const updated = await referralRepository.updateStatus(referralId, 'ACKNOWLEDGED', {
      userId: userContext.id,
      facilityId: userFacilityId || referral.destination_facility_id,
      receivingClinicianId: userContext.id,
      reason: notes || 'Receipt acknowledged by receiving hospital triage staff'
    });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_ACKNOWLEDGED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userFacilityId || referral.destination_facility_id,
      action: 'REFERRAL_ACKNOWLEDGED',
      resourceType: 'referral',
      resourceId: referralId,
      details: { referralId, referenceNumber: updated.reference_number }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Hospital Clinician accepts referral
   */
  async acceptReferral(referralId, payload = {}, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userFacilityId = userContext.facilityId || userContext.facility_id;
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);

    if ((userRoleId === 2 || userRoleId === 3) && userFacilityId && referral.destination_facility_id !== userFacilityId) {
      throw new ForbiddenError('You can only accept referrals assigned to your hospital');
    }

    this.assertValidTransition(referral.status, 'ACCEPTED');

    // Record decision in referral_decisions
    await referralRepository.recordDecision(referralId, {
      hospital_id: userFacilityId || referral.destination_facility_id,
      evaluating_clinician_id: userContext.id,
      decision: 'ACCEPT',
      decision_notes: payload.decision_notes || 'Accepted for tertiary admission and specialist treatment',
      bed_allocated: Boolean(payload.assigned_bed_type),
      allocated_ward_department: payload.allocated_ward_department || 'General Admission'
    });

    // Update status to ACCEPTED
    let updated = await referralRepository.updateStatus(referralId, 'ACCEPTED', {
      userId: userContext.id,
      facilityId: userFacilityId || referral.destination_facility_id,
      receivingClinicianId: userContext.id,
      reason: payload.decision_notes || 'Referral accepted'
    });

    if (payload.assigned_bed_type) {
      updated = await referralRepository.update(referralId, { assigned_bed_type: payload.assigned_bed_type });
    }

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_ACCEPTED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userFacilityId || referral.destination_facility_id,
      action: 'REFERRAL_ACCEPTED',
      resourceType: 'referral',
      resourceId: referralId,
      details: { referralId, referenceNumber: updated.reference_number }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Hospital Clinician rejects referral with mandatory reason
   */
  async rejectReferral(referralId, payload, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userFacilityId = userContext.facilityId || userContext.facility_id;
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);

    if ((userRoleId === 2 || userRoleId === 3) && userFacilityId && referral.destination_facility_id !== userFacilityId) {
      throw new ForbiddenError('You can only reject referrals assigned to your hospital');
    }

    this.assertValidTransition(referral.status, 'REJECTED');
    const validated = validateRejectReferral(payload);

    await referralRepository.recordDecision(referralId, {
      hospital_id: userFacilityId || referral.destination_facility_id,
      evaluating_clinician_id: userContext.id,
      decision: 'REJECT',
      decision_notes: validated.reason,
      rejection_reason_code: validated.rejection_reason_code,
      recommended_alternative_facility_id: validated.recommended_alternative_facility_id
    });

    const updated = await referralRepository.updateStatus(referralId, 'REJECTED', {
      userId: userContext.id,
      facilityId: userFacilityId || referral.destination_facility_id,
      receivingClinicianId: userContext.id,
      reason: validated.reason
    });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_REJECTED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userFacilityId || referral.destination_facility_id,
      action: 'REFERRAL_REJECTED',
      resourceType: 'referral',
      resourceId: referralId,
      details: {
        referralId,
        referenceNumber: updated.reference_number,
        rejectionReason: validated.reason,
        rejectionCode: validated.rejection_reason_code
      }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Hospital Clinician requests additional clinical info
   */
  async requestInformation(referralId, payload, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userFacilityId = userContext.facilityId || userContext.facility_id;
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);

    if ((userRoleId === 2 || userRoleId === 3) && userFacilityId && referral.destination_facility_id !== userFacilityId) {
      throw new ForbiddenError('You can only request information for referrals assigned to your hospital');
    }

    this.assertValidTransition(referral.status, 'INFO_REQUESTED');
    const validated = validateRequestInfo(payload);

    await referralRepository.recordDecision(referralId, {
      hospital_id: userFacilityId || referral.destination_facility_id,
      evaluating_clinician_id: userContext.id,
      decision: 'REQUEST_INFO',
      decision_notes: validated.notes
    });

    const updated = await referralRepository.updateStatus(referralId, 'INFO_REQUESTED', {
      userId: userContext.id,
      facilityId: userFacilityId || referral.destination_facility_id,
      receivingClinicianId: userContext.id,
      reason: validated.notes
    });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_INFO_REQUESTED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userFacilityId || referral.destination_facility_id,
      action: 'REFERRAL_INFO_REQUESTED',
      resourceType: 'referral',
      resourceId: referralId,
      details: { referralId, notes: validated.notes }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Assign or Reassign Receiving Hospital
   */
  async assignHospital(referralId, destinationFacilityId, userContext = {}) {
    if (!destinationFacilityId) {
      throw new BadRequestError('destination_facility_id is required');
    }

    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    // Transport coordinators (role 4) cannot assign hospitals
    if (userRoleId === 4) {
      throw new ForbiddenError('Transport coordinators cannot assign receiving hospitals');
    }

    const targetHospital = await facilityRepository.findById(destinationFacilityId);
    if (!targetHospital && !destinationFacilityId.startsWith('fac-')) {
      throw new NotFoundError(`Destination hospital [${destinationFacilityId}] not found`);
    }

    const targetHospitalName = targetHospital ? targetHospital.name : destinationFacilityId;
    const newStatus = referral.status === 'PENDING_ASSIGNMENT' ? 'ASSIGNED' : referral.status;

    const updated = await referralRepository.updateStatus(referralId, newStatus, {
      userId: userContext.id,
      facilityId: userContext.facilityId,
      destinationFacilityId,
      reason: `Assigned receiving hospital to [${targetHospitalName}]`
    });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_ASSIGNED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: destinationFacilityId,
      action: 'REFERRAL_ASSIGNED',
      resourceType: 'referral',
      resourceId: referralId,
      details: {
        referralId,
        destinationFacilityId,
        destinationHospitalName: targetHospitalName
      }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Update clinical triage priority
   */
  async updatePriority(referralId, payload, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    // Transport coordinators (role 4) cannot alter clinical priority
    if (userRoleId === 4) {
      throw new ForbiddenError('Transport coordinators are not authorized to modify clinical triage priorities');
    }

    const validated = validateUpdatePriority(payload);
    const oldPriority = referral.priority;

    await referralRepository.update(referralId, { priority: validated.priority });

    // Record correction entry for priority change
    await referralRepository.recordCorrection(referralId, {
      field_name: 'priority',
      old_value: oldPriority,
      new_value: validated.priority,
      reason: validated.reason,
      corrected_by_user_id: userContext.id || null
    });

    const updated = await referralRepository.findById(referralId);

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_PRIORITY_CHANGED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userContext.facilityId || referral.origin_facility_id,
      action: 'REFERRAL_PRIORITY_CHANGED',
      resourceType: 'referral',
      resourceId: referralId,
      details: {
        oldPriority,
        newPriority: validated.priority,
        reason: validated.reason
      }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Confirm physical patient arrival at hospital
   */
  async confirmArrival(referralId, payload = {}, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userFacilityId = userContext.facilityId || userContext.facility_id;
    this.assertValidTransition(referral.status, 'PATIENT_ARRIVED');

    const updated = await referralRepository.updateStatus(referralId, 'PATIENT_ARRIVED', {
      userId: userContext.id,
      facilityId: userFacilityId || referral.destination_facility_id,
      reason: payload.arrival_notes || 'Physical patient arrival confirmed at hospital triage'
    });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_ARRIVAL_CONFIRMED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userFacilityId || referral.destination_facility_id,
      action: 'REFERRAL_ARRIVAL_CONFIRMED',
      resourceType: 'referral',
      resourceId: referralId,
      details: { referralId, referenceNumber: updated.reference_number }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Update clinical progress
   */
  async updateProgress(referralId, payload = {}, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const notes = payload.progress_notes || payload.current_progress_notes || 'Treatment ongoing in assigned ward';
    await referralRepository.update(referralId, { current_progress_notes: notes });

    let updated = referral;
    if (referral.status === 'PATIENT_ARRIVED' || referral.status === 'ARRIVED') {
      updated = await referralRepository.updateStatus(referralId, 'IN_PROGRESS', {
        userId: userContext.id,
        facilityId: userContext.facilityId || referral.destination_facility_id,
        reason: notes
      });
    }

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_PROGRESS_UPDATED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userContext.facilityId || referral.destination_facility_id,
      action: 'REFERRAL_PROGRESS_UPDATED',
      resourceType: 'referral',
      resourceId: referralId,
      details: { referralId, notes }
    });

    return this.sanitizeReferral(await referralRepository.findById(referralId), userContext);
  }

  /**
   * Mark referral clinical care completed
   */
  async completeReferral(referralId, payload = {}, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    this.assertValidTransition(referral.status, 'COMPLETED');

    const updated = await referralRepository.updateStatus(referralId, 'COMPLETED', {
      userId: userContext.id,
      facilityId: userContext.facilityId || referral.destination_facility_id,
      reason: payload.outcome_notes || 'Specialist treatment and tertiary clinical care concluded'
    });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_COMPLETED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userContext.facilityId || referral.destination_facility_id,
      action: 'REFERRAL_COMPLETED',
      resourceType: 'referral',
      resourceId: referralId,
      details: { referralId, referenceNumber: updated.reference_number }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Administrative closure of completed referral
   */
  async closeReferral(referralId, payload = {}, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    this.assertValidTransition(referral.status, 'CLOSED');

    const updated = await referralRepository.updateStatus(referralId, 'CLOSED', {
      userId: userContext.id,
      facilityId: userContext.facilityId || referral.destination_facility_id,
      closureReason: payload.closure_reason || 'Referral discharge and administrative dossier closed'
    });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_CLOSED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userContext.facilityId || referral.destination_facility_id,
      action: 'REFERRAL_CLOSED',
      resourceType: 'referral',
      resourceId: referralId,
      details: { referralId, referenceNumber: updated.reference_number }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Cancel referral with required reason
   */
  async cancelReferral(referralId, payload = {}, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    this.assertValidTransition(referral.status, 'CANCELLED');
    const validated = validateCancelReferral(payload);

    const updated = await referralRepository.updateStatus(referralId, 'CANCELLED', {
      userId: userContext.id,
      facilityId: userContext.facilityId || referral.origin_facility_id,
      cancellationReason: validated.reason
    });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_CANCELLED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userContext.facilityId || referral.origin_facility_id,
      action: 'REFERRAL_CANCELLED',
      resourceType: 'referral',
      resourceId: referralId,
      details: { referralId, reason: validated.reason }
    });

    return this.sanitizeReferral(updated, userContext);
  }

  /**
   * Record demographic or clinical correction
   */
  async recordCorrection(referralId, payload, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const validated = validateRecordCorrection(payload);
    const oldValue = referral[validated.field_name] !== undefined ? referral[validated.field_name] : null;

    await referralRepository.update(referralId, { [validated.field_name]: validated.new_value });

    const correction = await referralRepository.recordCorrection(referralId, {
      field_name: validated.field_name,
      old_value: oldValue,
      new_value: validated.new_value,
      reason: validated.reason,
      corrected_by_user_id: userContext.id || null
    });

    await securityAuditService.recordEvent({
      eventName: 'REFERRAL_CORRECTED',
      category: 'REFERRAL_MANAGEMENT',
      userId: userContext.id || null,
      facilityId: userContext.facilityId || referral.origin_facility_id,
      action: 'REFERRAL_CORRECTED',
      resourceType: 'referral',
      resourceId: referralId,
      details: {
        field: validated.field_name,
        reason: validated.reason
      }
    });

    return correction;
  }

  /**
   * Get single referral with authorization & tenancy check
   */
  async getReferralById(referralId, userContext = {}) {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral [${referralId}] not found`);
    }

    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    const userFacilityId = userContext.facilityId || userContext.facility_id;

    // Tenancy Check:
    // Health Centre Staff: origin facility match
    if (userRoleId === 1 && userFacilityId && referral.origin_facility_id !== userFacilityId) {
      throw new ForbiddenError('Access denied: You can only view referrals originating from your healthcare facility');
    }

    // Hospital Staff: destination facility match
    if ((userRoleId === 2 || userRoleId === 3) && userFacilityId && referral.destination_facility_id && referral.destination_facility_id !== userFacilityId) {
      throw new ForbiddenError('Access denied: You can only view referrals assigned to your hospital');
    }

    return this.sanitizeReferral(referral, userContext);
  }

  /**
   * Reference-based tracking (non-identifying public / authenticated tracking)
   */
  async trackByReference(referenceNumber) {
    const referral = await referralRepository.findByReference(referenceNumber);
    if (!referral) {
      throw new NotFoundError(`Referral with reference [${referenceNumber}] not found`);
    }

    // Return sanitized public tracking object (zero sensitive demographic or clinical text)
    return this.sanitizeReferral(referral, {}, true);
  }

  /**
   * Hospital incoming referrals queue
   */
  async getIncomingQueue(userContext = {}, options = {}) {
    const userFacilityId = userContext.facilityId || userContext.facility_id;
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);

    const hospitalId = (userRoleId === 2 || userRoleId === 3) ? userFacilityId : (options.hospitalId || userFacilityId);
    if (!hospitalId && userRoleId !== 6) {
      throw new ForbiddenError('Hospital facility assignment required to inspect incoming referrals queue');
    }

    const queryOpts = {
      ...options,
      destinationFacilityId: hospitalId
    };

    const [items, total] = await Promise.all([
      referralRepository.search(queryOpts),
      referralRepository.count(queryOpts)
    ]);

    const sanitized = items.map((r) => this.sanitizeReferral(r, userContext));
    return {
      data: sanitized,
      total,
      limit: queryOpts.limit || 20,
      offset: queryOpts.offset || 0
    };
  }

  /**
   * Search referrals with facility tenancy isolation
   */
  async searchReferrals(options = {}, userContext = {}) {
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    const userFacilityId = userContext.facilityId || userContext.facility_id;

    const queryOpts = { ...options };

    // Health Centre Staff: strictly isolated to origin facility
    if (userRoleId === 1 && userFacilityId) {
      queryOpts.originFacilityId = userFacilityId;
    }

    // Hospital Staff: strictly isolated to destination hospital
    if ((userRoleId === 2 || userRoleId === 3) && userFacilityId) {
      queryOpts.destinationFacilityId = userFacilityId;
    }

    const [items, total] = await Promise.all([
      referralRepository.search(queryOpts),
      referralRepository.count(queryOpts)
    ]);

    const sanitized = items.map((r) => this.sanitizeReferral(r, userContext));
    return {
      data: sanitized,
      total,
      limit: queryOpts.limit || 20,
      offset: queryOpts.offset || 0
    };
  }
}

export default new ReferralService();
