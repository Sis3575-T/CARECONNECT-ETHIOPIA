/**
 * CareConnect Ethiopia - Patient Validation Engine
 * Validates Ethiopian patronymic demographics, optional identifiers, phone numbers,
 * emergency contacts, duplicate reviews, corrections, and merge requests.
 */

import { ValidationError } from '../utils/errors.js';

const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'DECEASED', 'MERGED'];
const VALID_CONFIDENTIALITY = ['STANDARD', 'VIP', 'SENSITIVE'];
const VALID_CONTACT_RELATIONSHIPS = [
  'SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'GUARDIAN', 'FAMILY', 'NEIGHBOR', 'OTHER'
];
const VALID_REVIEW_STATUSES = ['CONFIRMED_MATCH', 'FALSE_POSITIVE', 'UNDER_INVESTIGATION'];

// Ethiopian phone regex: allows +251..., 09..., 07..., or general 9-15 digit formats
const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

export function validateRegisterPatient(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Patient registration payload is required', [
      { field: 'body', message: 'Payload must be a non-empty object' }
    ]);
  }

  // 1. Patronymic Given Name (first_name)
  if (!data.first_name || typeof data.first_name !== 'string' || data.first_name.trim().length < 2) {
    errors.push({ field: 'first_name', message: 'Given name (first_name) is required and must be at least 2 characters' });
  }

  // 2. Father's Name (father_name)
  if (!data.father_name || typeof data.father_name !== 'string' || data.father_name.trim().length < 2) {
    errors.push({ field: 'father_name', message: "Father's name (father_name) is required and must be at least 2 characters" });
  }

  // 3. Grandfather's Name (optional)
  if (data.grandfather_name && typeof data.grandfather_name === 'string' && data.grandfather_name.trim().length < 2) {
    errors.push({ field: 'grandfather_name', message: "Grandfather's name must be at least 2 characters when provided" });
  }

  // 4. Gender
  if (!data.gender || !VALID_GENDERS.includes(String(data.gender).toUpperCase())) {
    errors.push({ field: 'gender', message: `Gender must be one of: ${VALID_GENDERS.join(', ')}` });
  }

  // 5. Date of Birth & Age logic (Ethiopian operational reality)
  let calculatedAgeYears = data.age_years !== undefined ? Number(data.age_years) : null;
  let isDobEstimated = Boolean(data.is_dob_estimated);

  if (data.date_of_birth) {
    const dob = new Date(data.date_of_birth);
    if (isNaN(dob.getTime())) {
      errors.push({ field: 'date_of_birth', message: 'Date of birth must be a valid date (YYYY-MM-DD)' });
    } else if (dob > new Date()) {
      errors.push({ field: 'date_of_birth', message: 'Date of birth cannot be in the future' });
    } else if (calculatedAgeYears === null) {
      // Automatically derive age from DOB if age not explicitly entered
      const diffMs = Date.now() - dob.getTime();
      const ageDate = new Date(diffMs);
      calculatedAgeYears = Math.abs(ageDate.getUTCFullYear() - 1970);
    }
  } else if (calculatedAgeYears === null || isNaN(calculatedAgeYears)) {
    errors.push({
      field: 'age_years',
      message: 'Either a valid date_of_birth or age_years must be provided for patient registration'
    });
  } else {
    // If age is provided without DOB, mark DOB as estimated
    isDobEstimated = true;
  }

  if (calculatedAgeYears !== null && (calculatedAgeYears < 0 || calculatedAgeYears > 130)) {
    errors.push({ field: 'age_years', message: 'Age in years must be between 0 and 130' });
  }

  if (data.age_months !== undefined) {
    const months = Number(data.age_months);
    if (isNaN(months) || months < 0 || months > 11) {
      errors.push({ field: 'age_months', message: 'Age in months must be between 0 and 11' });
    }
  }

  // 6. Phone number (strictly OPTIONAL, but validated if present)
  if (data.phone_number) {
    const cleanPhone = String(data.phone_number).replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(cleanPhone)) {
      errors.push({
        field: 'phone_number',
        message: 'Phone number format is invalid. Must contain 9 to 15 digits'
      });
    }
  }

  // 7. National ID / Fayda ID (optional)
  if (data.national_id && String(data.national_id).trim().length < 4) {
    errors.push({ field: 'national_id', message: 'National ID must be at least 4 characters when provided' });
  }

  // 8. Blood Type (optional)
  if (data.blood_type && !VALID_BLOOD_TYPES.includes(String(data.blood_type).toUpperCase())) {
    errors.push({ field: 'blood_type', message: `Blood type must be one of: ${VALID_BLOOD_TYPES.join(', ')}` });
  }

  // 9. Confidentiality level (optional)
  if (data.confidentiality_level && !VALID_CONFIDENTIALITY.includes(String(data.confidentiality_level).toUpperCase())) {
    errors.push({ field: 'confidentiality_level', message: `Confidentiality level must be one of: ${VALID_CONFIDENTIALITY.join(', ')}` });
  }

  if (errors.length > 0) {
    throw new ValidationError('Patient registration validation failed', errors);
  }

  return {
    ...data,
    first_name: data.first_name.trim(),
    father_name: data.father_name.trim(),
    grandfather_name: data.grandfather_name ? data.grandfather_name.trim() : null,
    gender: data.gender.toUpperCase(),
    age_years: calculatedAgeYears,
    is_dob_estimated: isDobEstimated,
    phone_number: data.phone_number ? String(data.phone_number).replace(/[\s-]/g, '') : null,
    national_id: data.national_id ? String(data.national_id).trim().toUpperCase() : null,
    blood_type: data.blood_type ? data.blood_type.toUpperCase() : null,
    confidentiality_level: data.confidentiality_level ? data.confidentiality_level.toUpperCase() : 'STANDARD'
  };
}

export function validateUpdatePatient(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    throw new ValidationError('Update payload cannot be empty', [
      { field: 'body', message: 'At least one field must be provided to update' }
    ]);
  }

  if (data.first_name !== undefined && (typeof data.first_name !== 'string' || data.first_name.trim().length < 2)) {
    errors.push({ field: 'first_name', message: 'First name must be at least 2 characters' });
  }

  if (data.father_name !== undefined && (typeof data.father_name !== 'string' || data.father_name.trim().length < 2)) {
    errors.push({ field: 'father_name', message: "Father's name must be at least 2 characters" });
  }

  if (data.gender !== undefined && !VALID_GENDERS.includes(String(data.gender).toUpperCase())) {
    errors.push({ field: 'gender', message: `Gender must be one of: ${VALID_GENDERS.join(', ')}` });
  }

  if (data.age_years !== undefined) {
    const age = Number(data.age_years);
    if (isNaN(age) || age < 0 || age > 130) {
      errors.push({ field: 'age_years', message: 'Age in years must be between 0 and 130' });
    }
  }

  if (data.phone_number) {
    const cleanPhone = String(data.phone_number).replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(cleanPhone)) {
      errors.push({ field: 'phone_number', message: 'Invalid phone number format' });
    }
  }

  if (data.blood_type !== undefined && data.blood_type !== null && !VALID_BLOOD_TYPES.includes(String(data.blood_type).toUpperCase())) {
    errors.push({ field: 'blood_type', message: `Blood type must be one of: ${VALID_BLOOD_TYPES.join(', ')}` });
  }

  if (data.confidentiality_level !== undefined && !VALID_CONFIDENTIALITY.includes(String(data.confidentiality_level).toUpperCase())) {
    errors.push({ field: 'confidentiality_level', message: `Confidentiality level must be one of: ${VALID_CONFIDENTIALITY.join(', ')}` });
  }

  if (errors.length > 0) {
    throw new ValidationError('Patient update validation failed', errors);
  }

  return data;
}

export function validateUpdateStatus(data) {
  const errors = [];

  if (!data || !data.status) {
    errors.push({ field: 'status', message: 'Status field is required' });
  } else if (!VALID_STATUSES.includes(String(data.status).toUpperCase())) {
    errors.push({ field: 'status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  if (data.status && data.status.toUpperCase() === 'MERGED' && !data.merged_into_patient_id) {
    errors.push({ field: 'merged_into_patient_id', message: 'merged_into_patient_id is required when status is MERGED' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Patient status validation failed', errors);
  }

  return {
    status: data.status.toUpperCase(),
    merged_into_patient_id: data.merged_into_patient_id || null,
    reason: data.reason || null
  };
}

export function validateEmergencyContact(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Emergency contact payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  if (!data.full_name || typeof data.full_name !== 'string' || data.full_name.trim().length < 2) {
    errors.push({ field: 'full_name', message: 'Contact full name is required and must be at least 2 characters' });
  }

  if (!data.phone_number) {
    errors.push({ field: 'phone_number', message: 'Contact phone number is required' });
  } else {
    const cleanPhone = String(data.phone_number).replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(cleanPhone)) {
      errors.push({ field: 'phone_number', message: 'Valid contact phone number is required' });
    }
  }

  if (data.alternate_phone) {
    const cleanAlt = String(data.alternate_phone).replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(cleanAlt)) {
      errors.push({ field: 'alternate_phone', message: 'Alternate phone number format is invalid' });
    }
  }

  if (data.relationship) {
    const rel = String(data.relationship).toUpperCase();
    if (!VALID_CONTACT_RELATIONSHIPS.includes(rel)) {
      errors.push({
        field: 'relationship',
        message: `Relationship must be one of: ${VALID_CONTACT_RELATIONSHIPS.join(', ')}`
      });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Emergency contact validation failed', errors);
  }

  return {
    ...data,
    full_name: data.full_name.trim(),
    relationship: data.relationship ? data.relationship.toUpperCase() : 'FAMILY',
    phone_number: String(data.phone_number).replace(/[\s-]/g, ''),
    alternate_phone: data.alternate_phone ? String(data.alternate_phone).replace(/[\s-]/g, '') : null,
    is_primary_contact: data.is_primary_contact !== undefined ? Boolean(data.is_primary_contact) : true
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

export function validateDuplicateReview(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Duplicate review payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  if (!data.candidate_patient_id) {
    errors.push({ field: 'candidate_patient_id', message: 'candidate_patient_id is required' });
  }

  if (!data.review_status || !VALID_REVIEW_STATUSES.includes(String(data.review_status).toUpperCase())) {
    errors.push({
      field: 'review_status',
      message: `review_status must be one of: ${VALID_REVIEW_STATUSES.join(', ')}`
    });
  }

  if (!data.notes || typeof data.notes !== 'string' || data.notes.trim().length < 3) {
    errors.push({ field: 'notes', message: 'Reviewer clinical notes must be at least 3 characters' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Duplicate review validation failed', errors);
  }

  return {
    candidate_patient_id: data.candidate_patient_id,
    review_status: data.review_status.toUpperCase(),
    notes: data.notes.trim(),
    match_score: data.match_score !== undefined ? Number(data.match_score) : 0,
    match_signals: data.match_signals || {}
  };
}

export function validateMergeRequest(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Merge request payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  if (!data.source_patient_id) {
    errors.push({ field: 'source_patient_id', message: 'source_patient_id is required' });
  }

  if (!data.target_patient_id) {
    errors.push({ field: 'target_patient_id', message: 'target_patient_id is required' });
  }

  if (data.source_patient_id && data.target_patient_id && data.source_patient_id === data.target_patient_id) {
    errors.push({ field: 'target_patient_id', message: 'Cannot merge a patient record into itself' });
  }

  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length < 10) {
    errors.push({ field: 'reason', message: 'Detailed justification reason is required (minimum 10 characters)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Merge request validation failed', errors);
  }

  return {
    source_patient_id: data.source_patient_id,
    target_patient_id: data.target_patient_id,
    reason: data.reason.trim()
  };
}

export default {
  validateRegisterPatient,
  validateUpdatePatient,
  validateUpdateStatus,
  validateEmergencyContact,
  validateRecordCorrection,
  validateDuplicateReview,
  validateMergeRequest
};
