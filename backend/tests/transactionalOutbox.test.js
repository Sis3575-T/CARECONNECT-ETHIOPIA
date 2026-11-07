/**
 * CareConnect Ethiopia - Transactional Outbox Unit Tests
 * Verifies atomic event creation, deduplication keys, row-level event claiming,
 * subscriber delivery, retry management, and crash recovery.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { outboxService } from '../src/services/outboxService.js';
import { OUTBOX_STATUS, OUTBOX_EVENT_TYPES } from '../src/constants/jobs.js';

describe('Transactional Outbox Event Processing — Commit 091', () => {
  beforeEach(() => {
    outboxService.clearInMemory();
  });

  test('createEvent stores outbox event in PENDING status', async () => {
    const payload = { referralId: 'ref-901', priority: 'EMERGENCY', facilityId: 'fac-01' };
    const event = await outboxService.createEvent(
      'referral',
      'ref-901',
      OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
      payload
    );

    assert.ok(event.id);
    assert.equal(event.aggregateType, 'referral');
    assert.equal(event.aggregateId, 'ref-901');
    assert.equal(event.eventType, OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED);
    assert.deepEqual(event.payload, payload);
    assert.equal(event.status, OUTBOX_STATUS.PENDING);
    assert.ok(event.idempotencyKey);
  });

  test('Duplicate event with same idempotencyKey returns existing event without creating duplicate', async () => {
    const key = 'idem-ref-submission-unique-123';
    const ev1 = await outboxService.createEvent(
      'referral',
      'ref-dup-test',
      OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
      { count: 1 },
      { idempotencyKey: key }
    );

    const ev2 = await outboxService.createEvent(
      'referral',
      'ref-dup-test',
      OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
      { count: 2 },
      { idempotencyKey: key }
    );

    assert.equal(ev1.id, ev2.id);
    assert.equal(ev2.idempotencyKey, key);
  });

  test('claimPendingEvents claims events and prevents duplicate claiming by another worker', async () => {
    await outboxService.createEvent('referral', 'ref-claim-1', OUTBOX_EVENT_TYPES.REFERRAL_ACCEPTED);

    const claimedWorkerA = await outboxService.claimPendingEvents(5, 'outbox-worker-A');
    const claimedWorkerB = await outboxService.claimPendingEvents(5, 'outbox-worker-B');

    assert.equal(claimedWorkerA.length, 1);
    assert.equal(claimedWorkerB.length, 0, 'Worker B must not claim event locked by Worker A');
    assert.equal(claimedWorkerA[0].status, OUTBOX_STATUS.PROCESSING);
    assert.equal(claimedWorkerA[0].lockedBy, 'outbox-worker-A');
  });

  test('dispatchEvent invokes subscriber and updates event status to PUBLISHED', async () => {
    let subscriberInvoked = false;
    outboxService.subscribe(OUTBOX_EVENT_TYPES.REFERRAL_ACCEPTED, async (event) => {
      subscriberInvoked = true;
      assert.equal(event.aggregateId, 'ref-published-test');
    });

    const event = await outboxService.createEvent(
      'referral',
      'ref-published-test',
      OUTBOX_EVENT_TYPES.REFERRAL_ACCEPTED,
      { hospital: 'Tikur Anbessa' }
    );

    const [claimed] = await outboxService.claimPendingEvents(1, 'dispatcher');
    const success = await outboxService.dispatchEvent(claimed);

    assert.equal(subscriberInvoked, true);
    assert.equal(success, true);

    const mem = outboxService.inMemoryStore.get(event.id);
    if (mem) {
      assert.equal(mem.status, OUTBOX_STATUS.PUBLISHED);
      assert.ok(mem.published_at);
      assert.equal(mem.locked_by, null);
    }
  });

  test('Failed subscriber increments attempts and reschedules event for retry', async () => {
    outboxService.subscribe(OUTBOX_EVENT_TYPES.ESCALATION_CREATED, async () => {
      throw new Error('Downstream message bus unavailable');
    });

    const event = await outboxService.createEvent(
      'coordination',
      'esc-fail-test',
      OUTBOX_EVENT_TYPES.ESCALATION_CREATED,
      { level: 2 },
      { maxAttempts: 3 }
    );

    const [claimed] = await outboxService.claimPendingEvents(1, 'dispatcher');
    const success = await outboxService.dispatchEvent(claimed);

    assert.equal(success, false);

    const mem = outboxService.inMemoryStore.get(event.id);
    if (mem) {
      assert.equal(mem.status, OUTBOX_STATUS.PENDING); // Retried
      assert.equal(mem.locked_by, null);
      assert.match(mem.error_summary, /Downstream message bus unavailable/);
    }
  });

  test('recoverAbandonedEvents unlocks events abandoned by crashed worker instances', async () => {
    const event = await outboxService.createEvent('referral', 'ref-abandon-1', OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED);
    const [claimed] = await outboxService.claimPendingEvents(1, 'crashed-worker');

    // Simulate stale lock (200ms old)
    const mem = outboxService.inMemoryStore.get(event.id);
    if (mem) {
      mem.locked_at = new Date(Date.now() - 300).toISOString();
    }

    const recoveredCount = await outboxService.recoverAbandonedEvents(100);
    assert.equal(recoveredCount, 1);

    if (mem) {
      assert.equal(mem.status, OUTBOX_STATUS.PENDING);
      assert.equal(mem.locked_by, null);
      assert.match(mem.error_summary, /Recovered from abandoned outbox lock/);
    }
  });
});
