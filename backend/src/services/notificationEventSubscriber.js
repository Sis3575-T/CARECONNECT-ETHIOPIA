/**
 * CareConnect Ethiopia - Notification Event Subscriber & Ingestion Engine
 * Listens to domain and transactional outbox events, resolves recipients,
 * renders safe non-PII templates, and persists in-app notification records.
 */

import { outboxService } from './outboxService.js';
import { notificationRecipientResolver } from './notificationRecipientResolver.js';
import { notificationTemplateService } from './notificationTemplateService.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { notificationDeliveryService } from './notificationDeliveryService.js';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES
} from '../constants/notifications.js';
import { OUTBOX_EVENT_TYPES, NOTIFICATION_CHANNELS } from '../constants/jobs.js';
import { eventBroadcaster } from '../realtime/eventBroadcaster.js';
import { createRealtimeEvent, REALTIME_EVENT_TYPES } from '../realtime/eventContract.js';

export class NotificationEventSubscriber {
  constructor(options = {}) {
    this.resolver = options.resolver || notificationRecipientResolver;
    this.templateService = options.templateService || notificationTemplateService;
    this.repo = options.repo || notificationRepository;
    this.deliveryService = options.deliveryService || notificationDeliveryService;
  }

  /**
   * Registers event listeners for all transactional outbox domain events
   */
  registerSubscribers() {
    // 1. Referral lifecycle outbox events
    outboxService.subscribe(OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED, async (event) => {
      await this.handleReferralEvent(event, NOTIFICATION_TYPES.REFERRAL_SUBMITTED);
    });

    outboxService.subscribe(OUTBOX_EVENT_TYPES.ESCALATION_CREATED, async (event) => {
      await this.handleReferralEvent(event, NOTIFICATION_TYPES.ESCALATION_CREATED);
    });

    outboxService.subscribe(OUTBOX_EVENT_TYPES.AMBULANCE_DISPATCHED, async (event) => {
      await this.handleTransportEvent(event, NOTIFICATION_TYPES.TRANSPORT_DISPATCHED);
    });
  }

  /**
   * Handles referral domain events and creates recipient in-app notifications
   */
  async handleReferralEvent(event, overrideNotificationType = null) {
    const payload = event.payload || {};
    const notifType = overrideNotificationType || this._mapEventToNotifType(event.eventType);
    const referral = {
      id: event.aggregateId || payload.referralId,
      referral_code: payload.referralCode,
      source_facility_id: payload.sourceFacilityId || payload.fromFacility,
      originating_facility_id: payload.originatingFacilityId || payload.sourceFacilityId || payload.fromFacility,
      target_facility_id: payload.targetFacilityId || payload.toFacility || payload.receivingFacilityId,
      receiving_facility_id: payload.receivingFacilityId || payload.targetFacilityId || payload.toFacility,
      referring_clinician_id: payload.referringClinicianId,
      escalation_level: payload.escalationLevel || 1,
      priority: payload.urgency || payload.priority || 'NORMAL'
    };

    // 1. Resolve authorized recipients
    const recipients = await this.resolver.resolveReferralRecipients(referral, notifType);
    if (!recipients || recipients.length === 0) return [];

    // 2. Render safe notification content
    const rendered = this.templateService.render(notifType, {
      ...payload,
      referralId: referral.id,
      referralCode: referral.referral_code
    });

    const priority = referral.priority === 'EMERGENCY'
      ? NOTIFICATION_PRIORITIES.CRITICAL
      : (referral.priority === 'URGENT' ? NOTIFICATION_PRIORITIES.HIGH : NOTIFICATION_PRIORITIES.NORMAL);

    const createdNotifications = [];

    // 3. Persist in-app notification per recipient with deduplication
    for (const recipient of recipients) {
      const dedupKey = `inapp:${recipient.userId}:${notifType}:${referral.id}`;
      const notifRecord = await this.repo.create({
        recipientUserId: recipient.userId,
        recipientFacilityId: recipient.facilityId,
        recipientRole: recipient.roleName,
        title: rendered.title,
        message: rendered.message,
        notificationType: notifType,
        category: rendered.category,
        entityType: 'referral',
        entityId: referral.id,
        priority,
        deduplicationKey: dedupKey,
        metadata: {
          actionUrl: rendered.actionUrl,
          referralCode: referral.referral_code,
          facilityId: recipient.facilityId
        }
      });

      createdNotifications.push(notifRecord);

      // Real-time transport notification event broadcast
      try {
        const rtNotif = createRealtimeEvent(REALTIME_EVENT_TYPES.NOTIFICATION_CREATED, {
          notificationId: notifRecord.id,
          uuid: notifRecord.uuid,
          title: notifRecord.title,
          message: notifRecord.message,
          category: notifRecord.category,
          priority: notifRecord.priority,
          entityType: notifRecord.entityType,
          entityId: notifRecord.entityId,
          actionUrl: notifRecord.metadata?.actionUrl,
          createdAt: notifRecord.createdAt
        });
        eventBroadcaster.broadcastToChannels(`user:${recipient.userId}`, rtNotif);
      } catch {
        // Broadcaster resilience
      }

      // Real-time notification event broadcast to recipient user channel
      try {
        const rtNotif = createRealtimeEvent(REALTIME_EVENT_TYPES.NOTIFICATION_CREATED, {
          notificationId: notifRecord.id,
          uuid: notifRecord.uuid,
          title: notifRecord.title,
          message: notifRecord.message,
          category: notifRecord.category,
          priority: notifRecord.priority,
          entityType: notifRecord.entityType,
          entityId: notifRecord.entityId,
          actionUrl: notifRecord.metadata?.actionUrl,
          createdAt: notifRecord.createdAt
        });
        eventBroadcaster.broadcastToChannels(`user:${recipient.userId}`, rtNotif);
      } catch {
        // Broadcaster resilience
      }

      // Optional multi-channel delivery trigger
      if (recipient.email) {
        this.deliveryService.dispatch({
          channel: NOTIFICATION_CHANNELS.EMAIL,
          recipientAddress: recipient.email,
          title: rendered.title,
          message: rendered.message,
          deduplicationKey: `email:${recipient.userId}:${notifType}:${referral.id}`
        }).catch(() => {});
      }
    }

    return createdNotifications;
  }

  /**
   * Handles transport coordination events
   */
  async handleTransportEvent(event, overrideNotificationType = null) {
    const payload = event.payload || {};
    const notifType = overrideNotificationType || NOTIFICATION_TYPES.TRANSPORT_DISPATCHED;
    const transportRecord = {
      id: event.aggregateId || payload.transportId,
      managing_facility_id: payload.managingFacilityId || payload.sourceFacilityId,
      destination_facility_id: payload.destinationFacilityId || payload.targetFacilityId,
      coordinator_user_id: payload.coordinatorUserId,
      assigned_driver_id: payload.assignedDriverId
    };

    const recipients = await this.resolver.resolveTransportRecipients(transportRecord, notifType);
    if (!recipients || recipients.length === 0) return [];

    const rendered = this.templateService.render(notifType, payload);
    const createdNotifications = [];

    for (const recipient of recipients) {
      const dedupKey = `inapp:${recipient.userId}:${notifType}:${transportRecord.id}`;
      const notifRecord = await this.repo.create({
        recipientUserId: recipient.userId,
        recipientFacilityId: recipient.facilityId,
        recipientRole: recipient.roleName,
        title: rendered.title,
        message: rendered.message,
        notificationType: notifType,
        category: NOTIFICATION_CATEGORIES.TRANSPORT,
        entityType: 'transport',
        entityId: transportRecord.id,
        priority: NOTIFICATION_PRIORITIES.NORMAL,
        deduplicationKey: dedupKey,
        metadata: {
          actionUrl: rendered.actionUrl,
          transportId: transportRecord.id
        }
      });
      createdNotifications.push(notifRecord);

      // Real-time transport notification event broadcast
      try {
        const rtNotif = createRealtimeEvent(REALTIME_EVENT_TYPES.NOTIFICATION_CREATED, {
          notificationId: notifRecord.id,
          uuid: notifRecord.uuid,
          title: notifRecord.title,
          message: notifRecord.message,
          category: notifRecord.category,
          priority: notifRecord.priority,
          entityType: notifRecord.entityType,
          entityId: notifRecord.entityId,
          actionUrl: notifRecord.metadata?.actionUrl,
          createdAt: notifRecord.createdAt
        });
        eventBroadcaster.broadcastToChannels(`user:${recipient.userId}`, rtNotif);
      } catch {
        // Broadcaster resilience
      }
    }

    return createdNotifications;
  }

  _mapEventToNotifType(outboxEventType) {
    switch (outboxEventType) {
      case OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED:
        return NOTIFICATION_TYPES.REFERRAL_SUBMITTED;
      case OUTBOX_EVENT_TYPES.ESCALATION_CREATED:
        return NOTIFICATION_TYPES.ESCALATION_CREATED;
      case OUTBOX_EVENT_TYPES.AMBULANCE_DISPATCHED:
        return NOTIFICATION_TYPES.TRANSPORT_DISPATCHED;
      default:
        return NOTIFICATION_TYPES.REFERRAL_SUBMITTED;
    }
  }
}

export const notificationEventSubscriber = new NotificationEventSubscriber();
export default notificationEventSubscriber;
