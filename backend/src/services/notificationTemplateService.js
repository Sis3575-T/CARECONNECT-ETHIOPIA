/**
 * CareConnect Ethiopia - Safe Notification Template Rendering Engine
 * Renders non-PII operational messages with portal deep-links and rigorous XSS/HTML sanitization.
 */

import { NOTIFICATION_TYPES, NOTIFICATION_CATEGORIES, TYPE_TO_CATEGORY_MAP } from '../constants/notifications.js';

export class NotificationTemplateService {
  /**
   * Escapes dangerous characters to prevent HTML/script injection
   */
  sanitize(input) {
    if (input === null || input === undefined) return '';
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generates title, message, portal link, and category for a notification type
   * @param {string} notificationType - Value from NOTIFICATION_TYPES
   * @param {object} payload - Domain event payload
   * @returns {{ title: string, message: string, actionUrl: string, category: string }}
   */
  render(notificationType, payload = {}) {
    const safeRefCode = this.sanitize(payload.referralCode || payload.referralId || 'Referral');
    const safeFacility = this.sanitize(payload.facilityName || payload.sourceFacilityName || payload.targetFacilityName || 'Healthcare Facility');
    const safeReason = this.sanitize(payload.reason || payload.breachType || '');
    const safeAmbCode = this.sanitize(payload.ambulanceCode || payload.vehicleId || 'Ambulance');

    let title = 'CareConnect Operational Alert';
    let message = 'An operational update has occurred requiring your attention.';
    let actionUrl = '/dashboard';

    switch (notificationType) {
      // Referral Lifecycle
      case NOTIFICATION_TYPES.REFERRAL_SUBMITTED:
      case NOTIFICATION_TYPES.REFERRAL_RECEIVED:
        title = `New Incoming Referral: ${safeRefCode}`;
        message = `A new referral (${safeRefCode}) has been received from ${safeFacility}. Triage review is requested.`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}`;
        break;

      case NOTIFICATION_TYPES.REFERRAL_ACKNOWLEDGED:
        title = `Referral Acknowledged: ${safeRefCode}`;
        message = `Referral ${safeRefCode} has been acknowledged by ${safeFacility}. Full clinical review in progress.`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}`;
        break;

      case NOTIFICATION_TYPES.REFERRAL_ACCEPTED:
        title = `Referral Accepted: ${safeRefCode}`;
        message = `Referral ${safeRefCode} has been accepted by ${safeFacility}. Prepare patient transfer.`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}`;
        break;

      case NOTIFICATION_TYPES.REFERRAL_REJECTED:
        title = `Referral Decision Update: ${safeRefCode}`;
        message = `Referral ${safeRefCode} was declined by ${safeFacility}.${safeReason ? ` Reason: ${safeReason}` : ''}`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}`;
        break;

      case NOTIFICATION_TYPES.REFERRAL_INFO_REQUESTED:
        title = `Information Requested: ${safeRefCode}`;
        message = `${safeFacility} requested additional clinical documentation for referral ${safeRefCode}.`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}/details`;
        break;

      case NOTIFICATION_TYPES.REFERRAL_REASSIGNED:
        title = `Referral Reassigned: ${safeRefCode}`;
        message = `Referral ${safeRefCode} has been reassigned to ${safeFacility} for specialized clinical care.`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}`;
        break;

      case NOTIFICATION_TYPES.REFERRAL_COMPLETED:
        title = `Referral Care Completed: ${safeRefCode}`;
        message = `Clinical episode for referral ${safeRefCode} has been completed at ${safeFacility}. Discharge summary available.`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}/summary`;
        break;

      case NOTIFICATION_TYPES.REFERRAL_CANCELLED:
        title = `Referral Cancelled: ${safeRefCode}`;
        message = `Referral ${safeRefCode} was cancelled.${safeReason ? ` Note: ${safeReason}` : ''}`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}`;
        break;

      // Coordination & Operational Escalation
      case NOTIFICATION_TYPES.COORDINATION_TASK_CREATED:
      case NOTIFICATION_TYPES.COORDINATION_TASK_ASSIGNED:
        title = `Coordination Task Assigned: ${safeRefCode}`;
        message = `A coordination task for referral ${safeRefCode} has been assigned to your unit.`;
        actionUrl = `/coordination/tasks/${encodeURIComponent(payload.taskId || '')}`;
        break;

      case NOTIFICATION_TYPES.SLA_DEADLINE_APPROACHING:
        title = `Urgent SLA Warning: ${safeRefCode}`;
        message = `Response SLA deadline for referral ${safeRefCode} is approaching. Prompt review is required.`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}`;
        break;

      case NOTIFICATION_TYPES.ESCALATION_CREATED:
        title = `Operational Escalation: ${safeRefCode}`;
        message = `Referral ${safeRefCode} has been escalated to Level ${payload.escalationLevel || 1} due to SLA breach.`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}/escalation`;
        break;

      case NOTIFICATION_TYPES.ESCALATION_RESOLVED:
        title = `Escalation Resolved: ${safeRefCode}`;
        message = `The operational escalation for referral ${safeRefCode} has been resolved by triage staff.`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}`;
        break;

      // Transport Coordination
      case NOTIFICATION_TYPES.TRANSPORT_REQUEST_ASSIGNED:
      case NOTIFICATION_TYPES.TRANSPORT_DISPATCHED:
        title = `Transport Dispatched: ${safeAmbCode}`;
        message = `${safeAmbCode} dispatched for transfer related to referral ${safeRefCode}.`;
        actionUrl = `/transport/dispatches/${encodeURIComponent(payload.transportId || '')}`;
        break;

      case NOTIFICATION_TYPES.TRANSPORT_DELAY_REPORTED:
        title = `Transport Delay Reported: ${safeAmbCode}`;
        message = `A delay was reported for ${safeAmbCode}.${safeReason ? ` Cause: ${safeReason}` : ''} Estimated arrival updated.`;
        actionUrl = `/transport/tracking/${encodeURIComponent(payload.transportId || '')}`;
        break;

      case NOTIFICATION_TYPES.PATIENT_ARRIVED:
        title = `Patient Arrival Confirmed: ${safeRefCode}`;
        message = `Patient transfer for referral ${safeRefCode} has safely arrived at ${safeFacility}.`;
        actionUrl = `/referrals/${encodeURIComponent(payload.referralId || '')}`;
        break;

      // Security & System Alerts
      case NOTIFICATION_TYPES.ACCOUNT_SECURITY_ALERT:
        title = 'Account Security Alert';
        message = 'A new session login or credential update was recorded for your account. If this was not you, contact administrator.';
        actionUrl = '/settings/security';
        break;

      case NOTIFICATION_TYPES.ACCOUNT_STATUS_CHANGED:
        title = 'Account Status Update';
        message = 'Your portal account permissions or facility assignment were modified by system administrator.';
        actionUrl = '/profile';
        break;

      case NOTIFICATION_TYPES.SYSTEM_MAINTENANCE:
        title = 'System Maintenance Notice';
        message = 'CareConnect Ethiopia scheduled infrastructure maintenance is planned. Operational services will remain active.';
        actionUrl = '/announcements';
        break;

      default:
        title = 'CareConnect Platform Alert';
        message = this.sanitize(payload.message || 'New operational update available in portal.');
        actionUrl = '/dashboard';
        break;
    }

    const category = TYPE_TO_CATEGORY_MAP[notificationType] || NOTIFICATION_CATEGORIES.SYSTEM;

    return {
      title,
      message,
      actionUrl,
      category
    };
  }
}

export const notificationTemplateService = new NotificationTemplateService();
export default notificationTemplateService;
