/**
 * CareConnect Ethiopia - Background Job, Outbox & Notification Constants
 */

export const JOB_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  SCHEDULED: 'SCHEDULED'
});

export const JOB_PRIORITY = Object.freeze({
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

export const PRIORITY_WEIGHTS = Object.freeze({
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1
});

export const JOB_TYPES = Object.freeze({
  REFERRAL_SLA_CHECK: 'referral:sla_check',
  REFERRAL_ESCALATION: 'referral:escalation',
  NOTIFICATION_DISPATCH: 'notification:dispatch',
  DOCUMENT_OCR_PROCESS: 'document:ocr_process',
  OUTBOX_DISPATCH: 'outbox:dispatch',
  DATABASE_MAINTENANCE: 'system:database_maintenance',
  SCHEDULED_TASK_RUN: 'scheduler:task_run'
});

export const OUTBOX_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED'
});

export const DELIVERY_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
});

export const NOTIFICATION_CHANNELS = Object.freeze({
  IN_APP: 'IN_APP',
  SMS: 'SMS',
  EMAIL: 'EMAIL'
});

export const OUTBOX_EVENT_TYPES = Object.freeze({
  REFERRAL_SUBMITTED: 'referral:submitted',
  REFERRAL_ACKNOWLEDGED: 'referral:acknowledged',
  REFERRAL_ACCEPTED: 'referral:accepted',
  REFERRAL_REJECTED: 'referral:rejected',
  REFERRAL_INFO_REQUESTED: 'referral:info_requested',
  REFERRAL_REASSIGNED: 'referral:reassigned',
  REFERRAL_STATUS_CHANGED: 'referral:status_changed',
  REFERRAL_COMPLETED: 'referral:completed',
  REFERRAL_CANCELLED: 'referral:cancelled',
  ESCALATION_CREATED: 'escalation:created'
});

export default {
  JOB_STATUS,
  JOB_PRIORITY,
  PRIORITY_WEIGHTS,
  JOB_TYPES,
  OUTBOX_STATUS,
  DELIVERY_STATUS,
  NOTIFICATION_CHANNELS,
  OUTBOX_EVENT_TYPES
};
