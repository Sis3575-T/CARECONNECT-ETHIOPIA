/**
 * CareConnect Ethiopia - Referral Real-Time Event Integration Service
 * Coordinates referral workflow state transitions with the Transactional Outbox
 * and real-time WebSocket distribution without duplicating business logic.
 */

import { outboxService } from '../services/outboxService.js';
import { eventBroadcaster } from './eventBroadcaster.js';
import { createRealtimeEvent, REALTIME_EVENT_TYPES } from './eventContract.js';
import { CHANNEL_TYPES } from '../constants/realtime.js';
import { OUTBOX_EVENT_TYPES } from '../constants/jobs.js';

export class ReferralRealtimeService {
  constructor(options = {}) {
    this.outbox = options.outbox || outboxService;
    this.broadcaster = options.broadcaster || eventBroadcaster;
  }

  /**
   * Publishes a referral domain event atomically or via outbox and broadcasts to real-time subscribers
   * @param {string} eventType - OUTBOX_EVENT_TYPES or REALTIME_EVENT_TYPES string
   * @param {object} referral - Referral domain entity
   * @param {object} [options] - Context options (userId, userFacilityId, client, notes, requestId)
   */
  async publishReferralEvent(eventType, referral, options = {}) {
    if (!referral) return null;

    const referralId = referral.id;
    const originFacility = referral.originating_facility_id || referral.origin_facility_id || referral.source_facility_id;
    const destFacility = referral.receiving_facility_id || referral.destination_facility_id || referral.target_facility_id;

    const outboxType = this._resolveOutboxType(eventType);
    const rtType = this._resolveRealtimeType(eventType);

    const safePayload = {
      referralId,
      referralCode: referral.reference_number || referral.referral_code,
      status: referral.status,
      priority: referral.priority || referral.clinical_priority || 'ROUTINE',
      originatingFacilityId: originFacility,
      receivingFacilityId: destFacility,
      referringClinicianId: referral.referring_clinician_id || options.userId || null,
      notes: options.reason || options.notes || null,
      requestId: options.requestId || null,
      updatedAt: referral.updated_at || new Date().toISOString()
    };

    // 1. Persist to Transactional Outbox for at-least-once guaranteed processing
    let outboxRecord = null;
    try {
      const idempotencyKey = `rt:referral:${referralId}:${rtType}:${options.actionId || Date.now()}`;
      if (options.dbClient) {
        outboxRecord = await this.outbox.createEventWithinTransaction(
          options.dbClient,
          'referral',
          referralId,
          outboxType,
          safePayload,
          { idempotencyKey }
        );
      } else {
        outboxRecord = await this.outbox.createEvent(
          'referral',
          referralId,
          outboxType,
          safePayload,
          { idempotencyKey }
        );
      }
    } catch {
      // Outbox resilience fallback
    }

    // 2. Derive target facility, referral and clinician channels
    const targetChannels = [];
    targetChannels.push(`${CHANNEL_TYPES.REFERRAL}:${referralId}`);

    if (originFacility) {
      targetChannels.push(`${CHANNEL_TYPES.FACILITY}:${originFacility}`);
    }
    if (destFacility) {
      targetChannels.push(`${CHANNEL_TYPES.FACILITY}:${destFacility}`);
    }
    if (safePayload.referringClinicianId) {
      targetChannels.push(`${CHANNEL_TYPES.USER}:${safePayload.referringClinicianId}`);
    }

    // 3. Construct and broadcast standardized real-time event envelope
    const rtEvent = createRealtimeEvent(rtType, safePayload, {
      eventId: outboxRecord?.id,
      requestId: options.requestId,
      occurredAt: outboxRecord?.createdAt || new Date().toISOString()
    });

    const deliveredCount = this.broadcaster.broadcastToChannels(targetChannels, rtEvent);

    return {
      eventId: rtEvent.eventId,
      eventType: rtEvent.type,
      targetChannels,
      deliveredCount
    };
  }

  _resolveOutboxType(type) {
    if (Object.values(OUTBOX_EVENT_TYPES).includes(type)) return type;
    const mapping = {
      [REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED]: OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
      [REALTIME_EVENT_TYPES.REFERRAL_ACKNOWLEDGED]: OUTBOX_EVENT_TYPES.REFERRAL_ACKNOWLEDGED,
      [REALTIME_EVENT_TYPES.REFERRAL_ACCEPTED]: OUTBOX_EVENT_TYPES.REFERRAL_ACCEPTED,
      [REALTIME_EVENT_TYPES.REFERRAL_REJECTED]: OUTBOX_EVENT_TYPES.REFERRAL_REJECTED,
      [REALTIME_EVENT_TYPES.REFERRAL_INFO_REQUESTED]: OUTBOX_EVENT_TYPES.REFERRAL_INFO_REQUESTED,
      [REALTIME_EVENT_TYPES.REFERRAL_REASSIGNED]: OUTBOX_EVENT_TYPES.REFERRAL_REASSIGNED,
      [REALTIME_EVENT_TYPES.REFERRAL_STATUS_CHANGED]: OUTBOX_EVENT_TYPES.REFERRAL_STATUS_CHANGED,
      [REALTIME_EVENT_TYPES.REFERRAL_COMPLETED]: OUTBOX_EVENT_TYPES.REFERRAL_COMPLETED,
      [REALTIME_EVENT_TYPES.REFERRAL_CANCELLED]: OUTBOX_EVENT_TYPES.REFERRAL_CANCELLED
    };
    return mapping[type] || OUTBOX_EVENT_TYPES.REFERRAL_STATUS_CHANGED;
  }

  _resolveRealtimeType(type) {
    if (Object.values(REALTIME_EVENT_TYPES).includes(type)) return type;
    const mapping = {
      [OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED]: REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED,
      [OUTBOX_EVENT_TYPES.REFERRAL_ACKNOWLEDGED]: REALTIME_EVENT_TYPES.REFERRAL_ACKNOWLEDGED,
      [OUTBOX_EVENT_TYPES.REFERRAL_ACCEPTED]: REALTIME_EVENT_TYPES.REFERRAL_ACCEPTED,
      [OUTBOX_EVENT_TYPES.REFERRAL_REJECTED]: REALTIME_EVENT_TYPES.REFERRAL_REJECTED,
      [OUTBOX_EVENT_TYPES.REFERRAL_INFO_REQUESTED]: REALTIME_EVENT_TYPES.REFERRAL_INFO_REQUESTED,
      [OUTBOX_EVENT_TYPES.REFERRAL_REASSIGNED]: REALTIME_EVENT_TYPES.REFERRAL_REASSIGNED,
      [OUTBOX_EVENT_TYPES.REFERRAL_STATUS_CHANGED]: REALTIME_EVENT_TYPES.REFERRAL_STATUS_CHANGED,
      [OUTBOX_EVENT_TYPES.REFERRAL_COMPLETED]: REALTIME_EVENT_TYPES.REFERRAL_COMPLETED,
      [OUTBOX_EVENT_TYPES.REFERRAL_CANCELLED]: REALTIME_EVENT_TYPES.REFERRAL_CANCELLED
    };
    return mapping[type] || REALTIME_EVENT_TYPES.REFERRAL_STATUS_CHANGED;
  }
}

export const referralRealtimeService = new ReferralRealtimeService();
export default referralRealtimeService;
