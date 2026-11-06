/**
 * CareConnect Ethiopia - Referral Request Validation Engine
 * Validates clinical referral creation, triage decisions, state transitions,
 * priority assignments, and corrections.
 */

import { ValidationError } from '../utils/errors.js';

const VALID_PRIORITIES = ['ROUTINE', 'URGENT', 'EMERGENCY'];
const VALID_REJECTION_CODES = [
  'CAPACITY_FULL',
  'CAPACITY_EXCEEDED',
  'NO_BEDS_AVAILABLE',
  'SPECIALIST_UNAVAILABLE',
  'INAPPROPRIATE_CLINICAL_TIER',
  'EQUIPMENT_MAINTENANCE',
  'OTHER'
];

export function validateCreateReferral(data, isSubmitting = false) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Referral creation payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  // 1. Patient ID
  if (!data.patient_id || typeof data.patient_id !== 'string') {
    errors.push({ field: 'patient_id', message: 'patient_id is required' });
  }

  // 2. Priority
  if (data.priority && !VALID_PRIORITIES.includes(String(data.priority).toUpperCase())) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  // 3. Clinical Fields (strictly required if submitting directly, relaxed if drafting)
  if (isSubmitting || data.status === 'SUBMITTED') {
    if (!data.primary_diagnosis || typeof data.primary_diagnosis !== 'string' || data.primary_diagnosis.trim().length < 2) {
      errors.push({ field: 'primary_diagnosis', message: 'primary_diagnosis is required for submission (minimum 2 characters)' });
    }

    if (!data.clinical_summary || typeof data.clinical_summary !== 'string' || data.clinical_summary.trim().length < 5) {
      errors.push({ field: 'clinical_summary', message: 'clinical_summary is required for submission (minimum 5 characters)' });
    }

    if (!data.reason_for_referral || typeof data.reason_for_referral !== 'string' || data.reason_for_referral.trim().length < 5) {
      errors.push({ field: 'reason_for_referral', message: 'reason_for_referral is required for submission (minimum 5 characters)' });
    }
  }

  // 4. Vitals validation (if provided)
  if (data.vitals_pulse_rate !== undefined && data.vitals_pulse_rate !== null) {
    const pulse = Number(data.vitals_pulse_rate);
    if (isNaN(pulse) || pulse < 20 || pulse > 250) {
      errors.push({ field: 'vitals_pulse_rate', message: 'vitals_pulse_rate must be between 20 and 250 bpm' });
    }
  }

  if (data.vitals_respiratory_rate !== undefined && data.vitals_respiratory_rate !== null) {
    const resp = Number(data.vitals_respiratory_rate);
    if (isNaN(resp) || resp < 4 || resp > 80) {
      errors.push({ field: 'vitals_respiratory_rate', message: 'vitals_respiratory_rate must be between 4 and 80 breaths/min' });
    }
  }

  if (data.vitals_temperature !== undefined && data.vitals_temperature !== null) {
    const temp = Number(data.vitals_temperature);
    if (isNaN(temp) || temp < 25.0 || temp > 45.0) {
      errors.push({ field: 'vitals_temperature', message: 'vitals_temperature must be between 25.0 and 45.0 °C' });
    }
  }

  if (data.vitals_spo2 !== undefined && data.vitals_spo2 !== null) {
    const spo2 = Number(data.vitals_spo2);
    if (isNaN(spo2) || spo2 < 40 || spo2 > 100) {
      errors.push({ field: 'vitals_spo2', message: 'vitals_spo2 must be between 40 and 100%' });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Referral creation validation failed', errors);
  }

  return {
    ...data,
    priority: data.priority ? data.priority.toUpperCase() : 'ROUTINE',
    status: isSubmitting || data.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
    transport_required: Boolean(data.transport_required)
  };
}

export function validateUpdateReferral(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    throw new ValidationError('Referral update payload cannot be empty', [
      { field: 'body', message: 'At least one field must be provided to update' }
    ]);
  }

  if (data.priority && !VALID_PRIORITIES.includes(String(data.priority).toUpperCase())) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  if (errors.length > 0) {
    throw new ValidationError('Referral update validation failed', errors);
  }

  return data;
}

export function validateRejectReferral(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Rejection payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  const reason = data.reason || data.decision_notes || data.rejection_reason;
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    errors.push({
      field: 'reason',
      message: 'Detailed clinical/administrative rejection reason is required (minimum 5 characters)'
    });
  }

  if (data.rejection_reason_code && !VALID_REJECTION_CODES.includes(String(data.rejection_reason_code).toUpperCase())) {
    errors.push({
      field: 'rejection_reason_code',
      message: `Rejection code must be one of: ${VALID_REJECTION_CODES.join(', ')}`
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Referral rejection validation failed', errors);
  }

  return {
    reason: reason.trim(),
    decision_notes: reason.trim(),
    rejection_reason_code: data.rejection_reason_code ? data.rejection_reason_code.toUpperCase() : 'OTHER',
    recommended_alternative_facility_id: data.recommended_alternative_facility_id || null
  };
}

export function validateRequestInfo(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Additional information request payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  const notes = data.notes || data.reason || data.info_request_notes;
  if (!notes || typeof notes !== 'string' || notes.trim().length < 5) {
    errors.push({
      field: 'notes',
      message: 'Detailed explanation of required information is required (minimum 5 characters)'
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Request additional information validation failed', errors);
  }

  return {
    notes: notes.trim(),
    decision_notes: notes.trim()
  };
}

export function validateUpdatePriority(data) {
  const errors = [];

  if (!data || !data.priority || !VALID_PRIORITIES.includes(String(data.priority).toUpperCase())) {
    errors.push({ field: 'priority', message: `Priority is required and must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length < 5) {
    errors.push({ field: 'reason', message: 'Clinical reason for priority change is required (minimum 5 characters)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Priority update validation failed', errors);
  }

  return {
    priority: data.priority.toUpperCase(),
    reason: data.reason.trim()
  };
}

export function validateCancelReferral(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Cancellation payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  const reason = data.reason || data.cancellation_reason;
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    errors.push({ field: 'reason', message: 'Cancellation reason is required (minimum 5 characters)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Cancellation validation failed', errors);
  }

  return {
    reason: reason.trim()
  };
}

export function validateRecordCorrection(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Correction payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  if (!data.field_name || typeof data.field_name !== 'string') {
    errors.push({ field: 'field_name', message: 'field_name being corrected is required' });
  }

  if (data.new_value === undefined) {
    errors.push({ field: 'new_value', message: 'new_value must be provided' });
  }

  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length < 5) {
    errors.push({ field: 'reason', message: 'Clinical/administrative reason for correction is required (minimum 5 characters)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Correction validation failed', errors);
  }

  return {
    field_name: data.field_name.trim(),
    old_value: data.old_value !== undefined ? String(data.old_value) : null,
    new_value: String(data.new_value),
    reason: data.reason.trim()
  };
}

export default {
  validateCreateReferral,
  validateUpdateReferral,
  validateRejectReferral,
  validateRequestInfo,
  validateUpdatePriority,
  validateCancelReferral,
  validateRecordCorrection
};
