/**
 * CareConnect Ethiopia - Document Request Validation Engine
 * Validates document association, category parameters, version replacements,
 * and verification workflow transitions.
 */

import { ValidationError } from '../utils/errors.js';
import { DOCUMENT_CATEGORIES, DOCUMENT_VERIFICATION_STATUS } from '../constants/index.js';

const ALLOWED_CATEGORIES = Object.values(DOCUMENT_CATEGORIES);
const ALLOWED_VERIFICATION_STATUSES = Object.values(DOCUMENT_VERIFICATION_STATUS);

/**
 * Validates document upload metadata
 */
export function validateDocumentMetadata(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Document metadata payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  // 1. Patient ID or Referral ID must be present
  const hasPatient = Boolean(data.patient_id && String(data.patient_id).trim());
  const hasReferral = Boolean(data.referral_id && String(data.referral_id).trim());

  if (!hasPatient && !hasReferral) {
    errors.push({
      field: 'referral_id',
      message: 'Either referral_id or patient_id must be provided to attach document'
    });
  }

  // 2. Document category validation
  if (data.document_category) {
    const categoryUpper = String(data.document_category).toUpperCase().trim();
    if (!ALLOWED_CATEGORIES.includes(categoryUpper)) {
      errors.push({
        field: 'document_category',
        message: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
      });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Document metadata validation failed', errors);
  }

  return {
    referral_id: data.referral_id ? String(data.referral_id).trim() : null,
    patient_id: data.patient_id ? String(data.patient_id).trim() : null,
    facility_id: data.facility_id ? String(data.facility_id).trim() : null,
    document_category: data.document_category ? String(data.document_category).toUpperCase().trim() : DOCUMENT_CATEGORIES.REFERRAL_LETTER,
    document_type: data.document_type || data.document_category || 'REFERRAL_LETTER',
    replacement_reason: data.replacement_reason ? String(data.replacement_reason).trim() : null
  };
}

/**
 * Validates document version replacement payload
 */
export function validateDocumentReplacement(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Document replacement payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  if (!data.replacement_reason || typeof data.replacement_reason !== 'string' || data.replacement_reason.trim().length < 5) {
    errors.push({
      field: 'replacement_reason',
      message: 'replacement_reason is required when uploading a new version (minimum 5 characters)'
    });
  }

  if (data.document_category) {
    const categoryUpper = String(data.document_category).toUpperCase().trim();
    if (!ALLOWED_CATEGORIES.includes(categoryUpper)) {
      errors.push({
        field: 'document_category',
        message: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
      });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Document replacement validation failed', errors);
  }

  return {
    replacement_reason: String(data.replacement_reason).trim(),
    document_category: data.document_category ? String(data.document_category).toUpperCase().trim() : null
  };
}

/**
 * Validates document verification review payload
 */
export function validateDocumentVerification(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Document verification payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  if (!data.status || typeof data.status !== 'string') {
    errors.push({ field: 'status', message: 'Verification status is required' });
  } else {
    const statusUpper = data.status.toUpperCase().trim();
    if (!ALLOWED_VERIFICATION_STATUSES.includes(statusUpper)) {
      errors.push({
        field: 'status',
        message: `status must be one of: ${ALLOWED_VERIFICATION_STATUSES.join(', ')}`
      });
    }

    if (statusUpper === DOCUMENT_VERIFICATION_STATUS.REJECTED) {
      if (!data.rejection_reason || typeof data.rejection_reason !== 'string' || data.rejection_reason.trim().length < 5) {
        errors.push({
          field: 'rejection_reason',
          message: 'rejection_reason is required when rejecting a document (minimum 5 characters)'
        });
      }
    }

    if (statusUpper === DOCUMENT_VERIFICATION_STATUS.REQUIRES_CORRECTION) {
      if (!data.verification_notes || typeof data.verification_notes !== 'string' || data.verification_notes.trim().length < 5) {
        errors.push({
          field: 'verification_notes',
          message: 'verification_notes is required when requesting correction (minimum 5 characters)'
        });
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Document verification validation failed', errors);
  }

  return {
    status: data.status.toUpperCase().trim(),
    rejection_reason: data.rejection_reason ? String(data.rejection_reason).trim() : null,
    verification_notes: data.verification_notes ? String(data.verification_notes).trim() : null
  };
}

export default {
  validateDocumentMetadata,
  validateDocumentReplacement,
  validateDocumentVerification
};
