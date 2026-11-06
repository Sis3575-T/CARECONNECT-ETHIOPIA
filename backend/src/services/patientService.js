/**
 * CareConnect Ethiopia - Patient Service Domain Logic
 * Handles patient registration, sanitization, Ethiopian demographic rules,
 * duplicate detection scoring, emergency contacts, corrections, and merge governance.
 */

import patientRepository from '../repositories/patientRepository.js';
import {
  validateRegisterPatient,
  validateUpdatePatient,
  validateUpdateStatus,
  validateEmergencyContact,
  validateRecordCorrection,
  validateDuplicateReview,
  validateMergeRequest
} from '../validators/patientValidator.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError
} from '../utils/errors.js';
import securityAuditService from './securityAuditService.js';

export class PatientService {
  /**
   * Format full patronymic name according to Ethiopian standard: First Father Grandfather
   */
  formatFullName(patient) {
    if (!patient) return '';
    const parts = [patient.first_name, patient.father_name, patient.grandfather_name].filter(Boolean);
    return parts.join(' ').trim();
  }

  /**
   * Sanitizes patient record depending on caller role and privacy boundary
   */
  sanitizePatient(patient, userContext = {}) {
    if (!patient) return null;

    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    const fullName = this.formatFullName(patient);

    // Baseline sanitized representation
    const base = {
      id: patient.id,
      uuid: patient.uuid,
      full_name: fullName,
      first_name: patient.first_name,
      father_name: patient.father_name,
      grandfather_name: patient.grandfather_name || null,
      gender: patient.gender,
      date_of_birth: patient.date_of_birth || null,
      age_years: patient.age_years,
      age_months: patient.age_months || 0,
      is_dob_estimated: Boolean(patient.is_dob_estimated),
      national_id: patient.national_id || null,
      kebele_id: patient.kebele_id || null,
      phone_number: patient.phone_number || null,
      region: patient.region,
      subcity_zone: patient.subcity_zone || null,
      woreda: patient.woreda || null,
      kebele: patient.kebele || null,
      house_number: patient.house_number || null,
      status: patient.status || 'ACTIVE',
      confidentiality_level: patient.confidentiality_level || 'STANDARD',
      registered_facility_id: patient.registered_facility_id,
      registered_facility_name: patient.registered_facility_name || null,
      medical_record_number: patient.medical_record_number,
      primary_language: patient.primary_language || 'AMHARIC',
      is_pregnant: Boolean(patient.is_pregnant),
      edd_date: patient.edd_date || null,
      merged_into_patient_id: patient.merged_into_patient_id || null,
      created_at: patient.created_at,
      updated_at: patient.updated_at
    };

    // Transport Coordinator / Driver role (4 & 5): Minimum necessary transit information
    if (userRoleId === 4 || userRoleId === 5) {
      return {
        id: base.id,
        full_name: base.full_name,
        gender: base.gender,
        age_years: base.age_years,
        region: base.region,
        woreda: base.woreda,
        phone_number: base.phone_number,
        status: base.status,
        emergency_contacts: patient.emergency_contacts ? patient.emergency_contacts.slice(0, 1) : []
      };
    }

    // System Administrator (Role 6): Administrative oversight; omit clinical notes unless authorized
    if (userRoleId === 6) {
      return {
        ...base,
        identifiers: patient.identifiers || [],
        emergency_contacts: patient.emergency_contacts || []
      };
    }

    // Health Centre and Hospital Staff: Include full emergency contacts and clinical baseline
    return {
      ...base,
      blood_type: patient.blood_type || null,
      known_allergies: patient.known_allergies || null,
      chronic_conditions: patient.chronic_conditions || null,
      identifiers: patient.identifiers || [],
      emergency_contacts: patient.emergency_contacts || [],
      medical_baseline: patient.medical_baseline || null
    };
  }

  /**
   * Register a new patient
   */
  async registerPatient(payload, creatorUser = {}) {
    const validated = validateRegisterPatient(payload);

    // Enforce Facility context: Health Centre staff must register under their assigned facility
    const userRoleId = Number(creatorUser.roleId || creatorUser.role_id || 0);
    const userFacilityId = creatorUser.facilityId || creatorUser.facility_id;

    if (userRoleId === 1 && !userFacilityId) {
      throw new ForbiddenError('Healthcare staff must be assigned to an active facility to register patients');
    }

    const targetFacilityId = userFacilityId || validated.registered_facility_id || null;
    validated.registered_facility_id = targetFacilityId;
    validated.recorded_by_user_id = creatorUser.id || null;

    // Check for duplicate Fayda National ID if provided
    if (validated.national_id) {
      const existing = await patientRepository.findByNationalId(validated.national_id);
      if (existing) {
        throw new ConflictError(
          `A patient record with Fayda National ID [${validated.national_id}] already exists (${existing.id})`
        );
      }
    }

    // Check for duplicate MRN if provided
    if (validated.medical_record_number) {
      const existingMrn = await patientRepository.findByMrn(validated.medical_record_number);
      if (existingMrn) {
        throw new ConflictError(
          `A patient with Medical Record Number [${validated.medical_record_number}] already exists`
        );
      }
    }

    const created = await patientRepository.create(validated);

    // Record audit event
    await securityAuditService.recordEvent({
      userId: creatorUser.id || null,
      facilityId: targetFacilityId,
      action: 'PATIENT_RECORD_CREATED',
      resourceType: 'patient',
      resourceId: created.id,
      details: {
        patientId: created.id,
        fullName: this.formatFullName(created),
        nationalId: created.national_id ? 'PROVIDED' : 'NONE',
        hasPhone: Boolean(created.phone_number),
        facilityId: targetFacilityId
      }
    });

    return this.sanitizePatient(created, creatorUser);
  }

  /**
   * Get patient by ID with tenancy & access check
   */
  async getPatientById(patientId, userContext = {}) {
    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundError(`Patient record [${patientId}] not found`);
    }

    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    const userFacilityId = userContext.facilityId || userContext.facility_id;

    // Health Centre Staff (Role 1): isolated to own facility
    if (userRoleId === 1 && userFacilityId && patient.registered_facility_id) {
      if (patient.registered_facility_id !== userFacilityId) {
        throw new ForbiddenError('Access denied: Patient is registered at a different healthcare facility');
      }
    }

    return this.sanitizePatient(patient, userContext);
  }

  /**
   * Update patient demographics
   */
  async updatePatient(patientId, updates, userContext = {}) {
    const existing = await patientRepository.findById(patientId);
    if (!existing) {
      throw new NotFoundError(`Patient record [${patientId}] not found`);
    }

    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    const userFacilityId = userContext.facilityId || userContext.facility_id;

    if (userRoleId === 1 && userFacilityId && existing.registered_facility_id !== userFacilityId) {
      throw new ForbiddenError('You can only update patients registered at your healthcare facility');
    }

    const validated = validateUpdatePatient(updates);

    if (validated.national_id && validated.national_id !== existing.national_id) {
      const conflict = await patientRepository.findByNationalId(validated.national_id);
      if (conflict && conflict.id !== patientId) {
        throw new ConflictError(`Another patient already possesses Fayda National ID [${validated.national_id}]`);
      }
    }

    const updated = await patientRepository.update(patientId, validated);

    await securityAuditService.recordEvent({
      userId: userContext.id || null,
      facilityId: userFacilityId || existing.registered_facility_id,
      action: 'PATIENT_RECORD_UPDATED',
      resourceType: 'patient',
      resourceId: patientId,
      details: {
        updatedFields: Object.keys(validated),
        patientId
      }
    });

    return this.sanitizePatient(updated, userContext);
  }

  /**
   * Update patient lifecycle status (ACTIVE, INACTIVE, DECEASED, MERGED)
   */
  async updatePatientStatus(patientId, statusPayload, userContext = {}) {
    const existing = await patientRepository.findById(patientId);
    if (!existing) {
      throw new NotFoundError(`Patient record [${patientId}] not found`);
    }

    const validated = validateUpdateStatus(statusPayload);
    const updated = await patientRepository.updateStatus(
      patientId,
      validated.status,
      validated.merged_into_patient_id
    );

    // Record correction or audit note
    await patientRepository.recordCorrection(patientId, {
      field_name: 'status',
      old_value: existing.status,
      new_value: validated.status,
      reason: validated.reason || `Status updated to ${validated.status}`,
      corrected_by_user_id: userContext.id || null
    });

    await securityAuditService.recordEvent({
      userId: userContext.id || null,
      facilityId: userContext.facilityId || existing.registered_facility_id,
      action: 'PATIENT_STATUS_CHANGED',
      resourceType: 'patient',
      resourceId: patientId,
      details: {
        oldStatus: existing.status,
        newStatus: validated.status,
        reason: validated.reason
      }
    });

    return this.sanitizePatient(updated, userContext);
  }

  /**
   * Record demographic correction with audit history
   */
  async recordDemographicCorrection(patientId, payload, userContext = {}) {
    const existing = await patientRepository.findById(patientId);
    if (!existing) {
      throw new NotFoundError(`Patient record [${patientId}] not found`);
    }

    const validated = validateRecordCorrection(payload);

    // Apply change to patients table
    const oldValue = existing[validated.field_name] !== undefined ? existing[validated.field_name] : null;
    const updateObj = { [validated.field_name]: validated.new_value };
    await patientRepository.update(patientId, updateObj);

    // Record immutable correction entry
    const correction = await patientRepository.recordCorrection(patientId, {
      field_name: validated.field_name,
      old_value: oldValue,
      new_value: validated.new_value,
      reason: validated.reason,
      corrected_by_user_id: userContext.id || null
    });

    await securityAuditService.recordEvent({
      userId: userContext.id || null,
      facilityId: userContext.facilityId || existing.registered_facility_id,
      action: 'PATIENT_RECORD_CORRECTED',
      resourceType: 'patient',
      resourceId: patientId,
      details: {
        field: validated.field_name,
        reason: validated.reason
      }
    });

    return correction;
  }

  /**
   * Get patient history (corrections and reviews)
   */
  async getPatientHistory(patientId, userContext = {}) {
    const existing = await patientRepository.findById(patientId);
    if (!existing) {
      throw new NotFoundError(`Patient record [${patientId}] not found`);
    }

    const corrections = await patientRepository.getCorrections(patientId);
    const reviews = await patientRepository.getDuplicateReviews(patientId);

    return {
      patient_id: patientId,
      corrections,
      duplicate_reviews: reviews
    };
  }

  /**
   * Search patients with facility tenancy isolation
   */
  async searchPatients(options = {}, userContext = {}) {
    const userRoleId = Number(userContext.roleId || userContext.role_id || 0);
    const userFacilityId = userContext.facilityId || userContext.facility_id;

    const queryOpts = { ...options };

    // Health Centre Staff: enforce facility tenancy
    if (userRoleId === 1 && userFacilityId) {
      queryOpts.facilityId = userFacilityId;
    }

    const [patients, total] = await Promise.all([
      patientRepository.search(queryOpts),
      patientRepository.count(queryOpts)
    ]);

    const sanitized = patients.map((p) => this.sanitizePatient(p, userContext));
    return {
      data: sanitized,
      total,
      limit: queryOpts.limit || 20,
      offset: queryOpts.offset || 0
    };
  }

  /* =========================================================================
   * IDENTIFICATION & DUPLICATE DETECTION LOGIC
   * ========================================================================= */
  /**
   * Identify matching candidates using deterministic & probabilistic scoring signals
   */
  async identifyPatients(criteria = {}, userContext = {}) {
    const {
      national_id,
      phone_number,
      mrn,
      first_name,
      father_name,
      grandfather_name,
      region,
      woreda,
      age_years
    } = criteria;

    const candidates = [];
    const allPatients = await patientRepository.search({ limit: 1000, offset: 0 });

    for (const p of allPatients) {
      let score = 0;
      const signals = [];

      // Signal 1: Fayda National ID exact match (100% confidence)
      if (national_id && p.national_id && p.national_id.toUpperCase() === national_id.trim().toUpperCase()) {
        score += 100;
        signals.push('EXACT_NATIONAL_ID_MATCH');
      }

      // Signal 2: MRN match (95% confidence)
      if (mrn && p.medical_record_number && p.medical_record_number.toUpperCase() === mrn.trim().toUpperCase()) {
        score += 95;
        signals.push('EXACT_MRN_MATCH');
      }

      // Signal 3: Phone number exact match (80% confidence)
      if (phone_number && p.phone_number) {
        const cleanReqPhone = phone_number.replace(/[\s-]/g, '');
        const cleanPatPhone = p.phone_number.replace(/[\s-]/g, '');
        if (cleanReqPhone === cleanPatPhone) {
          score += 60;
          signals.push('EXACT_PHONE_MATCH');
        }
      }

      // Signal 4: Patronymic Name Match (first_name + father_name)
      if (first_name && father_name) {
        const fMatch = p.first_name.toLowerCase() === first_name.trim().toLowerCase();
        const fatMatch = p.father_name.toLowerCase() === father_name.trim().toLowerCase();
        if (fMatch && fatMatch) {
          score += 40;
          signals.push('EXACT_FIRST_AND_FATHER_NAME');

          if (grandfather_name && p.grandfather_name && p.grandfather_name.toLowerCase() === grandfather_name.trim().toLowerCase()) {
            score += 20;
            signals.push('EXACT_GRANDFATHER_NAME');
          }
        }
      }

      // Signal 5: Location Match (Region + Woreda)
      if (woreda && p.woreda && p.woreda.toLowerCase() === woreda.trim().toLowerCase()) {
        score += 15;
        signals.push('MATCHING_WOREDA');
      }

      // Signal 6: Age proximity (+/- 2 years)
      if (age_years !== undefined && p.age_years !== undefined) {
        const diff = Math.abs(Number(age_years) - Number(p.age_years));
        if (diff === 0) {
          score += 15;
          signals.push('EXACT_AGE_MATCH');
        } else if (diff <= 2) {
          score += 10;
          signals.push('PROXIMATE_AGE_MATCH');
        }
      }

      // Normalize max score to 100
      const finalScore = Math.min(score, 100);

      if (finalScore >= 40) {
        candidates.push({
          patient: this.sanitizePatient(p, userContext),
          match_score: finalScore,
          match_signals: signals,
          match_category: finalScore >= 90 ? 'CONFIRMED_MATCH' : finalScore >= 60 ? 'HIGH_PROBABILITY' : 'POSSIBLE_MATCH'
        });
      }
    }

    candidates.sort((a, b) => b.match_score - a.match_score);
    return candidates;
  }

  /**
   * Find possible duplicate records for an existing patient
   */
  async findPossibleDuplicates(patientId, userContext = {}) {
    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundError(`Patient record [${patientId}] not found`);
    }

    const matches = await this.identifyPatients({
      national_id: patient.national_id,
      phone_number: patient.phone_number,
      first_name: patient.first_name,
      father_name: patient.father_name,
      grandfather_name: patient.grandfather_name,
      region: patient.region,
      woreda: patient.woreda,
      age_years: patient.age_years
    }, userContext);

    // Filter out the patient themselves
    return matches.filter((m) => m.patient.id !== patientId);
  }

  /**
   * Record clinical duplicate review
   */
  async recordDuplicateReview(targetId, payload, userContext = {}) {
    const target = await patientRepository.findById(targetId);
    if (!target) {
      throw new NotFoundError(`Target patient [${targetId}] not found`);
    }

    const validated = validateDuplicateReview(payload);
    const candidate = await patientRepository.findById(validated.candidate_patient_id);
    if (!candidate) {
      throw new NotFoundError(`Candidate duplicate patient [${validated.candidate_patient_id}] not found`);
    }

    const review = await patientRepository.recordDuplicateReview(targetId, validated.candidate_patient_id, {
      review_status: validated.review_status,
      match_score: validated.match_score,
      match_signals: validated.match_signals,
      reviewed_by_user_id: userContext.id || null,
      notes: validated.notes
    });

    await securityAuditService.recordEvent({
      userId: userContext.id || null,
      facilityId: userContext.facilityId || target.registered_facility_id,
      action: 'DUPLICATE_REVIEW_RECORDED',
      resourceType: 'patient',
      resourceId: targetId,
      details: {
        candidatePatientId: validated.candidate_patient_id,
        outcome: validated.review_status,
        notes: validated.notes
      }
    });

    return review;
  }

  /**
   * Submit formal merge request
   */
  async submitMergeRequest(payload, userContext = {}) {
    const validated = validateMergeRequest(payload);

    const source = await patientRepository.findById(validated.source_patient_id);
    if (!source) {
      throw new NotFoundError(`Source patient [${validated.source_patient_id}] not found`);
    }

    const target = await patientRepository.findById(validated.target_patient_id);
    if (!target) {
      throw new NotFoundError(`Target patient [${validated.target_patient_id}] not found`);
    }

    if (source.status === 'MERGED') {
      throw new BadRequestError(`Source patient [${source.id}] is already merged`);
    }

    const req = await patientRepository.createMergeRequest(
      validated.source_patient_id,
      validated.target_patient_id,
      {
        reason: validated.reason,
        requested_by_user_id: userContext.id || null
      }
    );

    await securityAuditService.recordEvent({
      userId: userContext.id || null,
      facilityId: userContext.facilityId || target.registered_facility_id,
      action: 'PATIENT_MERGE_REQUESTED',
      resourceType: 'patient',
      resourceId: target.id,
      details: {
        sourcePatientId: source.id,
        targetPatientId: target.id,
        reason: validated.reason
      }
    });

    return req;
  }

  /* =========================================================================
   * EMERGENCY CONTACTS MANAGEMENT
   * ========================================================================= */
  async getEmergencyContacts(patientId, userContext = {}) {
    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundError(`Patient [${patientId}] not found`);
    }
    return patientRepository.getEmergencyContacts(patientId);
  }

  async addEmergencyContact(patientId, payload, userContext = {}) {
    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundError(`Patient [${patientId}] not found`);
    }

    const validated = validateEmergencyContact(payload);
    const contact = await patientRepository.addEmergencyContact(patientId, validated);

    await securityAuditService.recordEvent({
      userId: userContext.id || null,
      facilityId: userContext.facilityId || patient.registered_facility_id,
      action: 'PATIENT_CONTACT_ADDED',
      resourceType: 'patient',
      resourceId: patientId,
      details: {
        contactId: contact.id,
        relationship: contact.relationship
      }
    });

    return contact;
  }

  async updateEmergencyContact(patientId, contactId, payload, userContext = {}) {
    const existing = await patientRepository.getEmergencyContactById(patientId, contactId);
    if (!existing) {
      throw new NotFoundError(`Emergency contact [${contactId}] not found for patient [${patientId}]`);
    }

    const updated = await patientRepository.updateEmergencyContact(patientId, contactId, payload);

    await securityAuditService.recordEvent({
      userId: userContext.id || null,
      facilityId: userContext.facilityId || null,
      action: 'PATIENT_CONTACT_UPDATED',
      resourceType: 'patient',
      resourceId: patientId,
      details: { contactId }
    });

    return updated;
  }

  async deleteEmergencyContact(patientId, contactId, userContext = {}) {
    const existing = await patientRepository.getEmergencyContactById(patientId, contactId);
    if (!existing) {
      throw new NotFoundError(`Emergency contact [${contactId}] not found`);
    }

    await patientRepository.deleteEmergencyContact(patientId, contactId);

    await securityAuditService.recordEvent({
      userId: userContext.id || null,
      facilityId: userContext.facilityId || null,
      action: 'PATIENT_CONTACT_DELETED',
      resourceType: 'patient',
      resourceId: patientId,
      details: { contactId }
    });

    return { success: true, message: 'Emergency contact deleted' };
  }
}

export default new PatientService();
