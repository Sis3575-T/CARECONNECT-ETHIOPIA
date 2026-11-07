/**
 * CareConnect Ethiopia - Standardized Real-Time Event Contract
 * Defines namespaced event type registry, strict envelope validation,
 * event schema versioning, non-PII sanitization, and serialization safety.
 */

import crypto from 'crypto';
import { REALTIME_EVENT_VERSION } from '../constants/realtime.js';

export const REALTIME_EVENT_TYPES = Object.freeze({
  // Referral lifecycle events
  REFERRAL_SUBMITTED: 'referral.submitted',
  REFERRAL_RECEIVED: 'referral.received',
  REFERRAL_ACKNOWLEDGED: 'referral.acknowledged',
  REFERRAL_ACCEPTED: 'referral.accepted',
  REFERRAL_REJECTED: 'referral.rejected',
  REFERRAL_INFO_REQUESTED: 'referral.info_requested',
  REFERRAL_INFO_RESPONDED: 'referral.info_responded',
  REFERRAL_REASSIGNED: 'referral.reassigned',
  REFERRAL_STATUS_CHANGED: 'referral.status_changed',
  REFERRAL_PRIORITY_UPDATED: 'referral.priority_updated',
  REFERRAL_COMPLETED: 'referral.completed',
  REFERRAL_CANCELLED: 'referral.cancelled',

  // Coordination & operational SLA events
  COORDINATION_TASK_ASSIGNED: 'coordination.task_assigned',
  COORDINATION_TASK_UPDATED: 'coordination.task_updated',
  COORDINATION_ESCALATION_CREATED: 'coordination.escalation_created',
  COORDINATION_ESCALATION_RESOLVED: 'coordination.escalation_resolved',
  COORDINATION_DEADLINE_APPROACHING: 'coordination.deadline_approaching',

  // Transport & ambulance events
  TRANSPORT_REQUESTED: 'transport.requested',
  TRANSPORT_DISPATCHED: 'transport.dispatched',
  TRANSPORT_STATUS_UPDATED: 'transport.status_updated',
  TRANSPORT_PATIENT_ARRIVED: 'transport.patient_arrived',

  // User notification events
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_UNREAD: 'notification.unread',
  NOTIFICATION_DISMISSED: 'notification.dismissed',
  NOTIFICATION_UNREAD_COUNT_CHANGED: 'notification.unread_count_changed',

  // System & administrative operational events
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_OPERATIONAL_ALERT: 'system.operational_alert'
});

/**
 * Fields prohibited in real-time payloads to guarantee clinical privacy (HIPAA/GDPR)
 */
export const PROHIBITED_PAYLOAD_FIELDS = Object.freeze([
  'password',
  'password_hash',
  'token',
  'access_token',
  'refresh_token',
  'clinical_notes',
  'chief_complaint',
  'history_of_presenting_illness',
  'physical_examination',
  'diagnostic_investigations',
  'patient_national_id',
  'patient_phone_number',
  'patient_address',
  'document_binary',
  'raw_ocr_text'
]);

/**
 * Sanitizes payload data by stripping prohibited clinical/PII fields
 * @param {object} data
 * @returns {object}
 */
export function sanitizePayloadData(data = {}) {
  if (!data || typeof data !== 'object') return {};
  const cleaned = {};

  for (const [key, value] of Object.entries(data)) {
    if (PROHIBITED_PAYLOAD_FIELDS.includes(key.toLowerCase())) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      cleaned[key] = sanitizePayloadData(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Validates a real-time event envelope against the CareConnect standard contract
 * @param {object} event
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEventEnvelope(event) {
  const errors = [];

  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['Event must be a non-null object'] };
  }

  // 1. eventId check
  if (!event.eventId || typeof event.eventId !== 'string') {
    errors.push('eventId is required and must be a string');
  }

  // 2. type check
  if (!event.type || typeof event.type !== 'string') {
    errors.push('type is required and must be a non-empty string');
  } else {
    const validTypes = Object.values(REALTIME_EVENT_TYPES);
    if (!validTypes.includes(event.type)) {
      errors.push(`Invalid event type '${event.type}'. Must be registered in REALTIME_EVENT_TYPES.`);
    }
  }

  // 3. version check
  if (typeof event.version !== 'number' || event.version < 1) {
    errors.push('version must be a positive integer >= 1');
  }

  // 4. occurredAt timestamp check
  if (!event.occurredAt || typeof event.occurredAt !== 'string') {
    errors.push('occurredAt is required as ISO-8601 string');
  } else {
    const parsedDate = new Date(event.occurredAt);
    if (isNaN(parsedDate.getTime())) {
      errors.push('occurredAt must be a valid UTC ISO-8601 timestamp');
    }
  }

  // 5. data check
  if (!event.data || typeof event.data !== 'object' || Array.isArray(event.data)) {
    errors.push('data must be a non-null object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Factory creating a standardized, versioned, non-PII real-time event
 * @param {string} type - REALTIME_EVENT_TYPES string
 * @param {object} data - Domain event payload
 * @param {object} [options] - Optional eventId, requestId, occurredAt, version
 * @returns {object} Standardized event envelope
 */
export function createRealtimeEvent(type, data = {}, options = {}) {
  const eventId = options.eventId || crypto.randomUUID();
  const version = options.version || REALTIME_EVENT_VERSION;
  const occurredAt = options.occurredAt || new Date().toISOString();
  const requestId = options.requestId || null;

  const sanitizedData = sanitizePayloadData(data);

  const event = {
    eventId,
    type,
    version,
    occurredAt,
    requestId,
    data: sanitizedData
  };

  const validation = validateEventEnvelope(event);
  if (!validation.valid) {
    throw new Error(`Real-time event contract validation failed: ${validation.errors.join('; ')}`);
  }

  return event;
}

export default {
  REALTIME_EVENT_TYPES,
  PROHIBITED_PAYLOAD_FIELDS,
  sanitizePayloadData,
  validateEventEnvelope,
  createRealtimeEvent
};
