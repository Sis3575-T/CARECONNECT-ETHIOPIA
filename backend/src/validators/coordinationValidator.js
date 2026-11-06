/**
 * CareConnect Ethiopia - Referral Coordination Validation Engine
 * Validates Response Policies (SLAs), Follow-ups, Info Requests, Reassignments, Escalations, and Exceptions.
 */

import { ValidationError } from '../utils/errors.js';
import {
  REFERRAL_PRIORITY,
  FOLLOWUP_CHANNEL,
  REASSIGNMENT_REASON,
  ESCALATION_LEVEL
} from '../constants/index.js';

export function validateCreatePolicy(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Policy payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3) {
    errors.push({ field: 'name', message: 'Policy name is required (minimum 3 characters)' });
  }

  const ackMinutes = Number(data.acknowledgement_deadline_minutes);
  if (isNaN(ackMinutes) || ackMinutes < 1) {
    errors.push({ field: 'acknowledgement_deadline_minutes', message: 'acknowledgement_deadline_minutes must be a positive integer' });
  }

  const decMinutes = Number(data.decision_deadline_minutes);
  if (isNaN(decMinutes) || decMinutes < 1) {
    errors.push({ field: 'decision_deadline_minutes', message: 'decision_deadline_minutes must be a positive integer' });
  }

  if (data.priority && !Object.values(REFERRAL_PRIORITY).includes(String(data.priority).toUpperCase())) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${Object.values(REFERRAL_PRIORITY).join(', ')}` });
  }

  if (errors.length > 0) {
    throw new ValidationError('Policy validation failed', errors);
  }

  return {
    ...data,
    name: data.name.trim(),
    acknowledgement_deadline_minutes: ackMinutes,
    decision_deadline_minutes: decMinutes,
    follow_up_interval_minutes: Number(data.follow_up_interval_minutes || 180),
    escalation_threshold_minutes: Number(data.escalation_threshold_minutes || 240),
    priority: data.priority ? data.priority.toUpperCase() : null,
    working_hours_only: Boolean(data.working_hours_only),
    is_active: data.is_active !== undefined ? Boolean(data.is_active) : true
  };
}

export function validateCreateFollowUp(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Follow-up payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  const channel = data.communication_channel ? String(data.communication_channel).toUpperCase() : null;
  if (!channel || !Object.values(FOLLOWUP_CHANNEL).includes(channel)) {
    errors.push({ field: 'communication_channel', message: `communication_channel must be one of: ${Object.values(FOLLOWUP_CHANNEL).join(', ')}` });
  }

  if (!data.outcome || typeof data.outcome !== 'string' || data.outcome.trim().length < 2) {
    errors.push({ field: 'outcome', message: 'Follow-up outcome is required' });
  }

  const notes = data.reason_or_notes || data.notes || data.reason;
  if (!notes || typeof notes !== 'string' || notes.trim().length < 3) {
    errors.push({ field: 'reason_or_notes', message: 'reason_or_notes is required (minimum 3 characters)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Follow-up validation failed', errors);
  }

  return {
    communication_channel: channel,
    channel_delivery_status: data.channel_delivery_status || (channel === 'PHONE_CALL' || channel === 'MANUAL' ? 'MANUAL_RECORD' : 'DELIVERED'),
    outcome: data.outcome.trim().toUpperCase(),
    reason_or_notes: notes.trim(),
    scheduled_next_follow_up: data.scheduled_next_follow_up || null
  };
}

export function validateCreateInfoRequest(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Information request payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  const requestedInfo = data.requested_information || data.missing_information || data.information;
  if (!requestedInfo || typeof requestedInfo !== 'string' || requestedInfo.trim().length < 5) {
    errors.push({ field: 'requested_information', message: 'Detailed description of requested information is required (minimum 5 characters)' });
  }

  const clinicalReason = data.clinical_reason || data.reason || data.notes;
  if (!clinicalReason || typeof clinicalReason !== 'string' || clinicalReason.trim().length < 5) {
    errors.push({ field: 'clinical_reason', message: 'Clinical reason for requesting additional information is required (minimum 5 characters)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Information request validation failed', errors);
  }

  return {
    requested_information: requestedInfo.trim(),
    clinical_reason: clinicalReason.trim(),
    deadline: data.deadline || null
  };
}

export function validateRespondInfoRequest(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Response payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  const notes = data.response_notes || data.notes || data.response;
  if (!notes || typeof notes !== 'string' || notes.trim().length < 5) {
    errors.push({ field: 'response_notes', message: 'Detailed response notes are required (minimum 5 characters)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Information response validation failed', errors);
  }

  return {
    response_notes: notes.trim(),
    supporting_document_ids: Array.isArray(data.supporting_document_ids) ? data.supporting_document_ids : []
  };
}

export function validateReassignment(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Reassignment payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  const newFacId = data.new_facility_id || data.destination_facility_id;
  if (!newFacId || typeof newFacId !== 'string') {
    errors.push({ field: 'new_facility_id', message: 'new_facility_id is required' });
  }

  const reason = data.reassignment_reason ? String(data.reassignment_reason).toUpperCase() : null;
  if (!reason || !Object.values(REASSIGNMENT_REASON).includes(reason)) {
    errors.push({ field: 'reassignment_reason', message: `reassignment_reason must be one of: ${Object.values(REASSIGNMENT_REASON).join(', ')}` });
  }

  const notes = data.reassignment_notes || data.notes || data.reason;
  if (!notes || typeof notes !== 'string' || notes.trim().length < 5) {
    errors.push({ field: 'reassignment_notes', message: 'Detailed reassignment explanation is required (minimum 5 characters)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Reassignment validation failed', errors);
  }

  return {
    new_facility_id: newFacId.trim(),
    reassignment_reason: reason,
    reassignment_notes: notes.trim()
  };
}

export function validateCreateEscalation(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Escalation payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  const level = Number(data.escalation_level || 1);
  if (!Object.values(ESCALATION_LEVEL).includes(level)) {
    errors.push({ field: 'escalation_level', message: 'escalation_level must be 1 (Staff), 2 (Supervisor), or 3 (Administrator)' });
  }

  const condition = data.escalation_condition ? String(data.escalation_condition).toUpperCase() : null;
  if (!condition || condition.trim().length < 3) {
    errors.push({ field: 'escalation_condition', message: 'escalation_condition is required' });
  }

  const reason = data.escalation_reason || data.reason || data.notes;
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    errors.push({ field: 'escalation_reason', message: 'Operational escalation reason is required (minimum 5 characters)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Escalation validation failed', errors);
  }

  return {
    escalation_level: level,
    escalation_condition: condition,
    escalation_reason: reason.trim(),
    assigned_recipient_user_id: data.assigned_recipient_user_id ? Number(data.assigned_recipient_user_id) : null
  };
}

export function validateResolveEscalation(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Resolution payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  const explanation = data.resolution_explanation || data.explanation || data.notes;
  if (!explanation || typeof explanation !== 'string' || explanation.trim().length < 5) {
    errors.push({ field: 'resolution_explanation', message: 'Detailed resolution explanation is required (minimum 5 characters)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Escalation resolution validation failed', errors);
  }

  return {
    resolution_explanation: explanation.trim()
  };
}

export function validateResolveException(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Exception resolution payload is required', [
      { field: 'body', message: 'Payload must be an object' }
    ]);
  }

  const notes = data.resolution_notes || data.notes || data.explanation;
  if (!notes || typeof notes !== 'string' || notes.trim().length < 5) {
    errors.push({ field: 'resolution_notes', message: 'Detailed exception resolution notes are required (minimum 5 characters)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('Exception resolution validation failed', errors);
  }

  return {
    resolution_notes: notes.trim()
  };
}

export default {
  validateCreatePolicy,
  validateCreateFollowUp,
  validateCreateInfoRequest,
  validateRespondInfoRequest,
  validateReassignment,
  validateCreateEscalation,
  validateResolveEscalation,
  validateResolveException
};
