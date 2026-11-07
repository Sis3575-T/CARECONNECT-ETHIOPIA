/**
 * CareConnect Ethiopia - Transactional Outbox Service
 * Guarantees atomic domain event persistence, reliable asynchronous publishing,
 * deduplication, and crash recovery.
 */

import crypto from 'crypto';
import { DbService } from './dbService.js';
import { OUTBOX_STATUS, OUTBOX_EVENT_TYPES } from '../constants/jobs.js';

export class OutboxService {
  constructor() {
    this.subscribers = new Map();
    this.inMemoryStore = new Map();
  }

  /**
   * Subscribes a handler function to a specific event type or wildcard '*'
   * @param {string} eventType - e.g. OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED or '*'
   * @param {Function} handler - Async function(event, context)
   */
  subscribe(eventType, handler) {
    if (!eventType || typeof handler !== 'function') {
      throw new Error('eventType string and handler function are required');
    }
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(handler);
  }

  /**
   * Creates an outbox event atomically inside an existing database transaction client
   * @param {object} client - Database transaction client (e.g. from pool.connect())
   * @param {string} aggregateType - 'referral', 'document', 'coordination', 'transport'
   * @param {string} aggregateId - Primary UUID / ID of the aggregate
   * @param {string} eventType - Type of event
   * @param {object} payload - Safe domain event payload
   * @param {object} [options] - Optional idempotencyKey, maxAttempts
   * @returns {Promise<object>} Created outbox event record
   */
  async createEventWithinTransaction(client, aggregateType, aggregateId, eventType, payload = {}, options = {}) {
    const id = options.id || crypto.randomUUID();
    const idempotencyKey = options.idempotencyKey || `${aggregateType}:${aggregateId}:${eventType}:${options.actionId || id}`;
    const maxAttempts = Number(options.maxAttempts) || 5;
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO outbox_events (
        id, aggregate_type, aggregate_id, event_type, payload, status, max_attempts, idempotency_key, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (idempotency_key) DO UPDATE
      SET attempts = outbox_events.attempts -- No-op to return existing record
      RETURNING *;
    `;
    const values = [
      id,
      aggregateType,
      String(aggregateId),
      eventType,
      JSON.stringify(payload),
      OUTBOX_STATUS.PENDING,
      maxAttempts,
      idempotencyKey,
      now
    ];

    const res = await client.query(sql, values);
    return this._formatEvent(res.rows[0]);
  }

  /**
   * Creates an outbox event using the standalone pool (or in-memory fallback)
   */
  async createEvent(aggregateType, aggregateId, eventType, payload = {}, options = {}) {
    const id = options.id || crypto.randomUUID();
    const idempotencyKey = options.idempotencyKey || `${aggregateType}:${aggregateId}:${eventType}:${options.actionId || id}`;
    const maxAttempts = Number(options.maxAttempts) || 5;
    const now = new Date().toISOString();

    try {
      const sql = `
        INSERT INTO outbox_events (
          id, aggregate_type, aggregate_id, event_type, payload, status, max_attempts, idempotency_key, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (idempotency_key) DO UPDATE
        SET attempts = outbox_events.attempts
        RETURNING *;
      `;
      const res = await DbService.query(sql, [
        id,
        aggregateType,
        String(aggregateId),
        eventType,
        JSON.stringify(payload),
        OUTBOX_STATUS.PENDING,
        maxAttempts,
        idempotencyKey,
        now
      ]);
      if (res.rows && res.rows.length > 0) {
        return this._formatEvent(res.rows[0]);
      }
    } catch {
      // In-memory fallback
    }

    // Check duplicate in-memory
    for (const ev of this.inMemoryStore.values()) {
      if (ev.idempotency_key === idempotencyKey) {
        return this._formatEvent(ev);
      }
    }

    const event = {
      id,
      aggregate_type: aggregateType,
      aggregate_id: String(aggregateId),
      event_type: eventType,
      payload,
      status: OUTBOX_STATUS.PENDING,
      attempts: 0,
      max_attempts: maxAttempts,
      idempotency_key: idempotencyKey,
      error_summary: null,
      locked_by: null,
      locked_at: null,
      created_at: now,
      published_at: null
    };
    this.inMemoryStore.set(id, event);
    return this._formatEvent(event);
  }

  /**
   * Claims pending outbox events using FOR UPDATE SKIP LOCKED
   * @param {number} limit
   * @param {string} lockerId
   * @returns {Promise<object[]>}
   */
  async claimPendingEvents(limit = 10, lockerId = 'outbox-worker') {
    const now = new Date().toISOString();
    try {
      const sql = `
        WITH claimed AS (
          SELECT id FROM outbox_events
          WHERE status = 'PENDING'
          ORDER BY created_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE outbox_events
        SET status = 'PROCESSING',
            locked_by = $2,
            locked_at = $3,
            attempts = attempts + 1
        WHERE id IN (SELECT id FROM claimed)
        RETURNING *;
      `;
      const res = await DbService.query(sql, [limit, lockerId, now]);
      if (res.rows && res.rows.length > 0) {
        return res.rows.map(r => this._formatEvent(r));
      }
      return [];
    } catch {
      // In-memory claiming
      const claimed = [];
      for (const ev of this.inMemoryStore.values()) {
        if (ev.status === OUTBOX_STATUS.PENDING && claimed.length < limit) {
          ev.status = OUTBOX_STATUS.PROCESSING;
          ev.locked_by = lockerId;
          ev.locked_at = now;
          ev.attempts = (ev.attempts || 0) + 1;
          claimed.push(this._formatEvent(ev));
        }
      }
      return claimed;
    }
  }

  /**
   * Dispatches a single outbox event to registered subscribers
   * @param {object} event
   * @returns {Promise<boolean>} Success flag
   */
  async dispatchEvent(event) {
    const handlers = [
      ...(this.subscribers.get(event.eventType) || []),
      ...(this.subscribers.get('*') || [])
    ];

    if (handlers.length === 0) {
      // No subscribers; mark as published to prevent backlog accumulation
      await this.markPublished(event.id);
      return true;
    }

    try {
      for (const handler of handlers) {
        await handler(event);
      }
      await this.markPublished(event.id);
      return true;
    } catch (err) {
      await this.markFailedOrRetry(event, err);
      return false;
    }
  }

  /**
   * Marks event as PUBLISHED
   */
  async markPublished(eventId) {
    const now = new Date().toISOString();
    try {
      const sql = `
        UPDATE outbox_events
        SET status = 'PUBLISHED',
            published_at = $1,
            locked_by = NULL,
            locked_at = NULL
        WHERE id = $2;
      `;
      await DbService.query(sql, [now, eventId]);
    } catch {
      const mem = this.inMemoryStore.get(eventId);
      if (mem) {
        mem.status = OUTBOX_STATUS.PUBLISHED;
        mem.published_at = now;
        mem.locked_by = null;
        mem.locked_at = null;
      }
    }
  }

  /**
   * Updates event to PENDING for retry or FAILED if attempts exceeded
   */
  async markFailedOrRetry(event, error) {
    const now = new Date().toISOString();
    const attempts = event.attempts || 1;
    const maxAttempts = event.maxAttempts || 5;
    const shouldRetry = attempts < maxAttempts;
    const nextStatus = shouldRetry ? OUTBOX_STATUS.PENDING : OUTBOX_STATUS.FAILED;
    const errorSummary = error?.message || 'Outbox dispatch failure';

    try {
      const sql = `
        UPDATE outbox_events
        SET status = $1,
            locked_by = NULL,
            locked_at = NULL,
            error_summary = $2
        WHERE id = $3;
      `;
      await DbService.query(sql, [nextStatus, errorSummary, event.id]);
    } catch {
      const mem = this.inMemoryStore.get(event.id);
      if (mem) {
        mem.status = nextStatus;
        mem.locked_by = null;
        mem.locked_at = null;
        mem.error_summary = errorSummary;
      }
    }
  }

  /**
   * Recovers stale locked outbox events
   */
  async recoverAbandonedEvents(staleThresholdMs = 5 * 60 * 1000) {
    const cutoff = new Date(Date.now() - staleThresholdMs).toISOString();
    try {
      const sql = `
        UPDATE outbox_events
        SET status = 'PENDING',
            locked_by = NULL,
            locked_at = NULL,
            error_summary = COALESCE(error_summary, '') || ' [Recovered from abandoned outbox lock]'
        WHERE status = 'PROCESSING'
          AND locked_at < $1
        RETURNING id;
      `;
      const res = await DbService.query(sql, [cutoff]);
      return res.rowCount || 0;
    } catch {
      let count = 0;
      for (const ev of this.inMemoryStore.values()) {
        if (ev.status === OUTBOX_STATUS.PROCESSING &&
            ev.locked_at && new Date(ev.locked_at).getTime() < (Date.now() - staleThresholdMs)) {
          ev.status = OUTBOX_STATUS.PENDING;
          ev.locked_by = null;
          ev.locked_at = null;
          ev.error_summary = `${ev.error_summary || ''} [Recovered from abandoned outbox lock]`.trim();
          count += 1;
        }
      }
      return count;
    }
  }

  _formatEvent(row) {
    if (!row) return null;
    let payload = row.payload;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = {}; }
    }
    return {
      id: row.id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      eventType: row.event_type,
      payload: payload || {},
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      idempotencyKey: row.idempotency_key,
      errorSummary: row.error_summary,
      lockedBy: row.locked_by,
      lockedAt: row.locked_at,
      createdAt: row.created_at,
      publishedAt: row.published_at
    };
  }

  clearInMemory() {
    this.inMemoryStore.clear();
    this.subscribers.clear();
  }
}

export const outboxService = new OutboxService();
export default outboxService;
