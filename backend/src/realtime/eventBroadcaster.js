/**
 * CareConnect Ethiopia - Real-Time Event Broadcaster
 * Routes standardized real-time events to authorized channel subscribers,
 * handles connection deduplication, and integrates with the Transactional Outbox.
 */

import { subscriptionManager } from './subscriptionManager.js';
import { createRealtimeEvent, REALTIME_EVENT_TYPES } from './eventContract.js';
import { SERVER_MESSAGE_TYPES, CHANNEL_TYPES } from '../constants/realtime.js';
import { OUTBOX_EVENT_TYPES } from '../constants/jobs.js';
import outboxServiceInstance from '../services/outboxService.js';

export class EventBroadcaster {
  constructor(options = {}) {
    this.subscriptionManager = options.subscriptionManager || subscriptionManager;
    this.outboxService = options.outboxService || outboxServiceInstance;

    this.metrics = {
      eventsBroadcast: 0,
      framesDelivered: 0,
      deliveryFailures: 0,
      lastEventAt: null
    };

    // In-memory circular buffer of recent events for recovery (last 500 events)
    this.recentEvents = [];
    this.maxRecentEvents = options.maxRecentEvents || 500;
  }

  /**
   * Broadcasts a standardized event to one or more channels with connection deduplication
   * @param {string|string[]} channels - Target channel or array of channels
   * @param {object} event - Standard real-time event envelope
   * @returns {number} Count of unique connections the event was delivered to
   */
  broadcastToChannels(channels, event) {
    const channelList = Array.isArray(channels) ? channels : [channels];
    if (channelList.length === 0 || !event) return 0;

    // Record in circular buffer for missed-event recovery
    this._recordEvent(event, channelList);

    const targetConnections = new Map(); // connectionId -> meta

    // 1. Gather all subscribers across channels
    for (const channel of channelList) {
      const subscribers = this.subscriptionManager.getSubscribers(channel);
      for (const meta of subscribers) {
        if (!targetConnections.has(meta.connectionId)) {
          targetConnections.set(meta.connectionId, { meta, matchedChannels: [channel] });
        } else {
          targetConnections.get(meta.connectionId).matchedChannels.push(channel);
        }
      }
    }

    // 2. Deliver event frame once per unique connection
    let deliveredCount = 0;
    for (const { meta, matchedChannels } of targetConnections.values()) {
      try {
        if (meta.ws && meta.ws.readyState === 1 /* OPEN */) {
          const frame = JSON.stringify({
            type: SERVER_MESSAGE_TYPES.EVENT,
            channel: matchedChannels[0],
            matchedChannels,
            event
          });
          meta.ws.send(frame);
          deliveredCount++;
        }
      } catch (err) {
        this.metrics.deliveryFailures++;
      }
    }

    this.metrics.eventsBroadcast++;
    this.metrics.framesDelivered += deliveredCount;
    this.metrics.lastEventAt = new Date().toISOString();

    return deliveredCount;
  }

  /**
   * Translates outbox domain events to standardized real-time events and broadcasts them
   * @param {object} outboxEvent - Event from outbox_events table
   */
  async handleOutboxEvent(outboxEvent) {
    if (!outboxEvent) return;

    const { aggregateType, aggregateId, eventType, payload = {} } = outboxEvent;
    const rtType = this._mapOutboxTypeToRealtimeType(eventType);
    if (!rtType) return; // Unmapped event type

    // Derive target channels based on aggregate and tenancy
    const channels = this._resolveChannelsForOutboxEvent(aggregateType, aggregateId, payload);
    if (channels.length === 0) return;

    // Create standardized event envelope
    const rtEvent = createRealtimeEvent(rtType, {
      ...payload,
      aggregateId,
      aggregateType
    }, {
      eventId: outboxEvent.id,
      requestId: payload.requestId || null,
      occurredAt: outboxEvent.createdAt || new Date().toISOString()
    });

    return this.broadcastToChannels(channels, rtEvent);
  }

  /**
   * Maps outbox domain event types to standardized real-time event types
   */
  _mapOutboxTypeToRealtimeType(eventType) {
    const map = {
      [OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED]: REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED,
      [OUTBOX_EVENT_TYPES.REFERRAL_ACKNOWLEDGED]: REALTIME_EVENT_TYPES.REFERRAL_ACKNOWLEDGED,
      [OUTBOX_EVENT_TYPES.REFERRAL_ACCEPTED]: REALTIME_EVENT_TYPES.REFERRAL_ACCEPTED,
      [OUTBOX_EVENT_TYPES.REFERRAL_REJECTED]: REALTIME_EVENT_TYPES.REFERRAL_REJECTED,
      [OUTBOX_EVENT_TYPES.REFERRAL_INFO_REQUESTED]: REALTIME_EVENT_TYPES.REFERRAL_INFO_REQUESTED,
      [OUTBOX_EVENT_TYPES.REFERRAL_REASSIGNED]: REALTIME_EVENT_TYPES.REFERRAL_REASSIGNED,
      [OUTBOX_EVENT_TYPES.REFERRAL_STATUS_CHANGED]: REALTIME_EVENT_TYPES.REFERRAL_STATUS_CHANGED,
      [OUTBOX_EVENT_TYPES.REFERRAL_COMPLETED]: REALTIME_EVENT_TYPES.REFERRAL_COMPLETED,
      [OUTBOX_EVENT_TYPES.REFERRAL_CANCELLED]: REALTIME_EVENT_TYPES.REFERRAL_CANCELLED,
      [OUTBOX_EVENT_TYPES.ESCALATION_CREATED]: REALTIME_EVENT_TYPES.COORDINATION_ESCALATION_CREATED,
      [OUTBOX_EVENT_TYPES.AMBULANCE_DISPATCHED]: REALTIME_EVENT_TYPES.TRANSPORT_DISPATCHED
    };
    return map[eventType] || null;
  }

  /**
   * Resolves target channels for an outbox event ensuring strict tenancy isolation
   */
  _resolveChannelsForOutboxEvent(aggregateType, aggregateId, payload = {}) {
    const channels = [];

    if (aggregateType === 'referral') {
      channels.push(`${CHANNEL_TYPES.REFERRAL}:${aggregateId}`);

      const origFacility = payload.originatingFacilityId || payload.sourceFacilityId || payload.fromFacility;
      if (origFacility) {
        channels.push(`${CHANNEL_TYPES.FACILITY}:${origFacility}`);
      }

      const recvFacility = payload.receivingFacilityId || payload.targetFacilityId || payload.toFacility;
      if (recvFacility) {
        channels.push(`${CHANNEL_TYPES.FACILITY}:${recvFacility}`);
      }

      if (payload.referringClinicianId) {
        channels.push(`${CHANNEL_TYPES.USER}:${payload.referringClinicianId}`);
      }
    } else if (aggregateType === 'notification') {
      const recipientUserId = payload.recipientUserId || payload.userId;
      if (recipientUserId) {
        channels.push(`${CHANNEL_TYPES.USER}:${recipientUserId}`);
      }
    } else if (aggregateType === 'coordination') {
      if (payload.referralId) {
        channels.push(`${CHANNEL_TYPES.REFERRAL}:${payload.referralId}`);
      }
      if (payload.facilityId) {
        channels.push(`${CHANNEL_TYPES.FACILITY}:${payload.facilityId}`);
      }
    } else if (aggregateType === 'transport') {
      channels.push(CHANNEL_TYPES.TRANSPORT);
      if (payload.facilityId) {
        channels.push(`${CHANNEL_TYPES.FACILITY}:${payload.facilityId}`);
      }
      if (payload.referralId) {
        channels.push(`${CHANNEL_TYPES.REFERRAL}:${payload.referralId}`);
      }
    }

    return channels;
  }

  /**
   * Records event in circular in-memory buffer
   */
  _recordEvent(event, channels) {
    if (this.recentEvents.length >= this.maxRecentEvents) {
      this.recentEvents.shift();
    }
    this.recentEvents.push({
      event,
      channels,
      recordedAt: new Date().toISOString()
    });
  }

  /**
   * Connects this broadcaster to the outbox service subscriber feed
   */
  registerOutboxSubscriber(outbox = this.outboxService) {
    if (outbox && typeof outbox.subscribe === 'function') {
      outbox.subscribe('*', async (event) => {
        try {
          await this.handleOutboxEvent(event);
        } catch {
          // Broadcaster isolation from outbox processor
        }
      });
    }
  }

  /**
   * Returns recent event history for recovery
   */
  getRecentEvents(options = {}) {
    const since = options.since ? new Date(options.since).getTime() : 0;
    const limit = Number(options.limit) || 100;

    return this.recentEvents
      .filter((item) => new Date(item.event.occurredAt).getTime() >= since)
      .slice(-limit)
      .map((item) => ({ event: item.event, channels: item.channels }));
  }

  clear() {
    this.recentEvents = [];
    this.metrics = {
      eventsBroadcast: 0,
      framesDelivered: 0,
      deliveryFailures: 0,
      lastEventAt: null
    };
  }
}

export const eventBroadcaster = new EventBroadcaster();
export default eventBroadcaster;
