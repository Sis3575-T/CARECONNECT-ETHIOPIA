/**
 * CareConnect Ethiopia - Real-Time Missed Event Recovery Service
 * Supports offline event replay, sequence tracking, strict authorization filtering,
 * and deduplication over WebSocket frames and REST fallback endpoints.
 */

import { eventBroadcaster } from './eventBroadcaster.js';
import { subscriptionManager } from './subscriptionManager.js';
import { DbService } from '../services/dbService.js';
import { createRealtimeEvent, REALTIME_EVENT_TYPES } from './eventContract.js';
import { OUTBOX_STATUS } from '../constants/jobs.js';

export const RECONNECT_POLICY = Object.freeze({
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 1.5,
  jitter: 0.2
});

export class EventRecoveryService {
  constructor(options = {}) {
    this.broadcaster = options.broadcaster || eventBroadcaster;
    this.subscriptionManager = options.subscriptionManager || subscriptionManager;
    this.maxReplayLimit = options.maxReplayLimit || 100;
  }

  /**
   * Recovers missed events for an authenticated user, strictly filtered by authorization
   * @param {object} user - Authenticated user context
   * @param {object} [options] - Recovery parameters (since, lastEventId, limit)
   * @returns {Promise<{ replayedCount: number, events: object[], syncTimestamp: string, reconnectPolicy: object }>}
   */
  async recoverMissedEvents(user, options = {}) {
    if (!user) {
      throw new Error('Authenticated user context is required for event recovery');
    }

    const limit = Math.min(Math.max(1, Number(options.limit) || 50), this.maxReplayLimit);
    const sinceDate = options.since ? new Date(options.since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sinceTimestamp = isNaN(sinceDate.getTime()) ? 0 : sinceDate.getTime();
    const lastEventId = options.lastEventId ? String(options.lastEventId).trim() : null;

    // 1. Fetch raw candidate events from broadcaster memory buffer and persistent outbox
    const candidateEvents = await this._getCandidateEvents(sinceTimestamp, limit * 2);

    // 2. Filter, deduplicate, and authorize
    const seenEventIds = new Set();
    const authorizedReplayEvents = [];
    let skipUntilLastId = Boolean(lastEventId);

    for (const item of candidateEvents) {
      const { event, channels } = item;
      if (!event || !event.eventId) continue;

      if (skipUntilLastId) {
        if (event.eventId === lastEventId) {
          skipUntilLastId = false; // Found last event; resume collecting newer events
        }
        continue;
      }

      if (seenEventIds.has(event.eventId)) {
        continue; // Deduplicate
      }

      // Check if user is currently authorized to receive this event on any of its target channels
      const isAuthorized = await this._isUserAuthorizedForEvent(user, channels);
      if (isAuthorized) {
        seenEventIds.add(event.eventId);
        authorizedReplayEvents.push(event);
        if (authorizedReplayEvents.length >= limit) {
          break;
        }
      }
    }

    return {
      replayedCount: authorizedReplayEvents.length,
      events: authorizedReplayEvents,
      syncTimestamp: new Date().toISOString(),
      reconnectPolicy: RECONNECT_POLICY
    };
  }

  /**
   * Checks whether the user is authorized to receive an event on any of its target channels
   */
  async _isUserAuthorizedForEvent(user, channels = []) {
    if (!channels || channels.length === 0) return false;
    for (const channel of channels) {
      const check = await this.subscriptionManager.authorizeChannel(user, channel);
      if (check.authorized) {
        return true;
      }
    }
    return false;
  }

  /**
   * Retrieves candidate events from broadcaster circular buffer and/or outbox DB
   */
  async _getCandidateEvents(sinceTimestamp, limit) {
    const memoryEvents = this.broadcaster.getRecentEvents({
      since: sinceTimestamp ? new Date(sinceTimestamp).toISOString() : null,
      limit
    });

    if (memoryEvents && memoryEvents.length > 0) {
      return memoryEvents;
    }

    // Database fallback from outbox_events table
    try {
      const cutoff = new Date(sinceTimestamp || Date.now() - 3600000).toISOString();
      const sql = `
        SELECT id, aggregate_type, aggregate_id, event_type, payload, created_at
        FROM outbox_events
        WHERE created_at >= $1
        ORDER BY created_at ASC
        LIMIT $2;
      `;
      const res = await DbService.query(sql, [cutoff, limit]);
      if (res.rows && res.rows.length > 0) {
        return res.rows.map((row) => {
          let payload = row.payload;
          if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch { payload = {}; }
          }
          const rtType = this.broadcaster._mapOutboxTypeToRealtimeType(row.event_type) || REALTIME_EVENT_TYPES.REFERRAL_STATUS_CHANGED;
          const channels = this.broadcaster._resolveChannelsForOutboxEvent(row.aggregate_type, row.aggregate_id, payload);
          const ev = createRealtimeEvent(rtType, payload, {
            eventId: row.id,
            occurredAt: row.created_at
          });
          return { event: ev, channels };
        });
      }
    } catch {
      // In-memory fallback
    }

    return [];
  }
}

export const eventRecoveryService = new EventRecoveryService();
export default eventRecoveryService;
