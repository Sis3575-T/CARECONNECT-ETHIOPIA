/**
 * CareConnect Ethiopia - Background Job Queue Architecture Unit Tests
 * Verifies job enqueueing, scheduling states, registry mechanics, and cancellation.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { jobQueueService } from '../src/services/jobQueueService.js';
import { jobRegistry } from '../src/services/jobRegistry.js';
import { JOB_STATUS, JOB_PRIORITY, JOB_TYPES } from '../src/constants/jobs.js';

describe('Background Job Processing Architecture — Commit 089', () => {
  beforeEach(() => {
    jobQueueService.clearInMemory();
    jobRegistry.clear();
  });

  test('jobQueueService enqueues immediate job in PENDING status with defaults', async () => {
    const payload = { referralId: 'ref-uuid-001', facilityId: 'fac-uuid-100' };
    const job = await jobQueueService.enqueue(JOB_TYPES.REFERRAL_SLA_CHECK, payload);

    assert.ok(job.id);
    assert.equal(job.jobType, JOB_TYPES.REFERRAL_SLA_CHECK);
    assert.deepEqual(job.payload, payload);
    assert.equal(job.status, JOB_STATUS.PENDING);
    assert.equal(job.priority, JOB_PRIORITY.NORMAL);
    assert.equal(job.attempts, 0);
    assert.equal(job.maxAttempts, 5);
  });

  test('jobQueueService enqueues future job in SCHEDULED status', async () => {
    const futureDate = new Date(Date.now() + 3600 * 1000); // 1 hour ahead
    const job = await jobQueueService.enqueue(
      JOB_TYPES.NOTIFICATION_DISPATCH,
      { notificationId: 42 },
      { scheduledAt: futureDate, priority: JOB_PRIORITY.HIGH }
    );

    assert.equal(job.status, JOB_STATUS.SCHEDULED);
    assert.equal(job.priority, JOB_PRIORITY.HIGH);
    assert.equal(new Date(job.scheduledAt).toISOString(), futureDate.toISOString());
  });

  test('jobQueueService retrieves and cancels pending jobs safely', async () => {
    const job = await jobQueueService.enqueue(JOB_TYPES.OUTBOX_DISPATCH, { batch: 1 });
    const fetched = await jobQueueService.getJob(job.id);

    assert.equal(fetched.id, job.id);
    assert.equal(fetched.status, JOB_STATUS.PENDING);

    const cancelled = await jobQueueService.cancelJob(job.id, 'User manually revoked dispatch');
    assert.equal(cancelled.status, JOB_STATUS.CANCELLED);
    assert.equal(cancelled.errorSummary, 'User manually revoked dispatch');
  });

  test('jobQueueService filters jobs by status and jobType', async () => {
    await jobQueueService.enqueue(JOB_TYPES.REFERRAL_SLA_CHECK, { id: 1 });
    await jobQueueService.enqueue(JOB_TYPES.REFERRAL_SLA_CHECK, { id: 2 });
    await jobQueueService.enqueue(JOB_TYPES.NOTIFICATION_DISPATCH, { id: 3 });

    const slaJobs = await jobQueueService.listJobs({ jobType: JOB_TYPES.REFERRAL_SLA_CHECK });
    assert.equal(slaJobs.total, 2);
    assert.equal(slaJobs.items.length, 2);

    const notifJobs = await jobQueueService.listJobs({ jobType: JOB_TYPES.NOTIFICATION_DISPATCH });
    assert.equal(notifJobs.total, 1);
  });

  test('jobRegistry registers and invokes decoupled handlers', async () => {
    let executed = false;
    jobRegistry.register(JOB_TYPES.REFERRAL_SLA_CHECK, async (job) => {
      executed = true;
      return { checked: job.payload.referralId };
    });

    assert.ok(jobRegistry.has(JOB_TYPES.REFERRAL_SLA_CHECK));
    assert.equal(jobRegistry.list().length, 1);

    const handler = jobRegistry.get(JOB_TYPES.REFERRAL_SLA_CHECK);
    const result = await handler({ payload: { referralId: 'ref-123' } });

    assert.equal(executed, true);
    assert.deepEqual(result, { checked: 'ref-123' });

    assert.throws(() => {
      jobRegistry.register('invalid-type', 'not-a-function');
    }, /Handler for invalid-type must be a function/);
  });
});
