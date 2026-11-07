/**
 * CareConnect Ethiopia - Referral Deadline & Escalation Processing Unit Tests
 * Verifies SLA deadline monitoring, automated operational escalation, outbox event generation,
 * terminal state suppression, and duplicate escalation prevention.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ReferralDeadlineService } from '../src/services/referralDeadlineService.js';
import { outboxService } from '../src/services/outboxService.js';
import { OUTBOX_EVENT_TYPES } from '../src/constants/jobs.js';

describe('Referral Deadline & Escalation Processing — Commit 093', () => {
  let service;

  beforeEach(() => {
    service = new ReferralDeadlineService();
    outboxService.clearInMemory();
  });

  test('Overdue SUBMITTED referral triggers escalation and records operational exception', async () => {
    const pastDeadline = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hr ago
    service.seedReferral({
      id: 'ref-sla-001',
      referral_code: 'REF-2026-0001',
      status: 'SUBMITTED',
      priority: 'URGENT',
      acknowledgement_deadline: pastDeadline,
      escalation_level: 0
    });

    let outboxFired = false;
    outboxService.subscribe(OUTBOX_EVENT_TYPES.ESCALATION_CREATED, async (ev) => {
      outboxFired = true;
      assert.equal(ev.payload.referralId, 'ref-sla-001');
      assert.equal(ev.payload.escalationLevel, 1);
    });

    const result = await service.evaluateDeadlines();

    assert.equal(result.evaluated, 1);
    assert.equal(result.escalated, 1);
    assert.equal(result.exceptionsRecorded, 1);

    // Outbox event was created in PENDING status; claim and dispatch it
    const [claimed] = await outboxService.claimPendingEvents(1);
    assert.ok(claimed);
    assert.equal(claimed.eventType, OUTBOX_EVENT_TYPES.ESCALATION_CREATED);
    await outboxService.dispatchEvent(claimed);
    assert.equal(outboxFired, true);
  });

  test('Terminal referrals (CANCELLED, REJECTED, COMPLETED) are never escalated', async () => {
    const pastDeadline = new Date(Date.now() - 7200 * 1000).toISOString();

    service.seedReferral({
      id: 'ref-cancelled-1',
      status: 'CANCELLED',
      acknowledgement_deadline: pastDeadline,
      escalation_level: 0
    });
    service.seedReferral({
      id: 'ref-completed-2',
      status: 'COMPLETED',
      decision_deadline: pastDeadline,
      escalation_level: 0
    });

    const result = await service.evaluateDeadlines();

    assert.equal(result.escalated, 0, 'Terminal referrals must not be escalated');
    assert.equal(result.exceptionsRecorded, 0);
  });

  test('Subsequent evaluations do not create duplicate open escalations', async () => {
    const pastDeadline = new Date(Date.now() - 1800 * 1000).toISOString();
    service.seedReferral({
      id: 'ref-dedup-1',
      referral_code: 'REF-2026-0099',
      status: 'UNDER_REVIEW',
      priority: 'EMERGENCY',
      decision_deadline: pastDeadline,
      escalation_level: 0
    });

    // 1st run
    const run1 = await service.evaluateDeadlines();
    assert.equal(run1.escalated, 1);

    // 2nd run immediately after
    const run2 = await service.evaluateDeadlines();
    assert.equal(run2.escalated, 0, 'Must not duplicate open escalation for same condition');
  });

  test('Escalation preserves human clinical authority without modifying medical triage', async () => {
    const ref = {
      id: 'ref-human-check',
      referral_code: 'REF-2026-0777',
      status: 'SUBMITTED',
      priority: 'ROUTINE',
      acknowledgement_deadline: new Date(Date.now() - 60000).toISOString(),
      escalation_level: 0
    };
    service.seedReferral(ref);

    await service.evaluateDeadlines();

    // Verify clinical status remains SUBMITTED (not autonomously approved or rejected)
    assert.equal(ref.status, 'SUBMITTED');
    assert.equal(ref.priority, 'ROUTINE');
    assert.equal(ref.escalation_level, 1);
  });
});
