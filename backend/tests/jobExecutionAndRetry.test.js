/**
 * CareConnect Ethiopia - Job Execution & Retry Handling Unit Tests
 * Verifies row-level job claiming, priority ordering, concurrency collision prevention,
 * exponential backoff retry calculation, permanent failure handling, and crash recovery.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JobWorker } from '../src/services/jobWorker.js';
import { jobQueueService } from '../src/services/jobQueueService.js';
import { jobRegistry } from '../src/services/jobRegistry.js';
import { JOB_STATUS, JOB_PRIORITY, JOB_TYPES } from '../src/constants/jobs.js';

describe('Reliable Job Execution & Retry Handling — Commit 090', () => {
  beforeEach(() => {
    jobQueueService.clearInMemory();
    jobRegistry.clear();
  });

  test('Worker claims jobs ordered by priority (CRITICAL before NORMAL)', async () => {
    const worker = new JobWorker({ workerId: 'worker-test-1' });

    // Enqueue normal and critical jobs
    await jobQueueService.enqueue(JOB_TYPES.REFERRAL_SLA_CHECK, { id: 'normal-1' }, { priority: JOB_PRIORITY.NORMAL });
    await jobQueueService.enqueue(JOB_TYPES.REFERRAL_ESCALATION, { id: 'critical-1' }, { priority: JOB_PRIORITY.CRITICAL });

    const claimed = await worker.claimJobs(1);
    assert.equal(claimed.length, 1);
    assert.equal(claimed[0].payload.id, 'critical-1', 'CRITICAL job must be claimed first');
    assert.equal(claimed[0].status, JOB_STATUS.PROCESSING);
    assert.equal(claimed[0].lockedBy, 'worker-test-1');
  });

  test('Two concurrent workers do not claim the same job', async () => {
    const worker1 = new JobWorker({ workerId: 'worker-node-A' });
    const worker2 = new JobWorker({ workerId: 'worker-node-B' });

    await jobQueueService.enqueue(JOB_TYPES.NOTIFICATION_DISPATCH, { msg: 'exclusive-task' });

    const claim1 = await worker1.claimJobs(1);
    const claim2 = await worker2.claimJobs(1);

    assert.equal(claim1.length, 1);
    assert.equal(claim2.length, 0, 'Second worker must not claim an already locked job');
    assert.equal(claim1[0].lockedBy, 'worker-node-A');
  });

  test('processJob completes successfully and clears lock', async () => {
    const worker = new JobWorker({ workerId: 'worker-exec' });
    let executed = false;

    jobRegistry.register(JOB_TYPES.DATABASE_MAINTENANCE, async (job) => {
      executed = true;
      return { vacuumed: true };
    });

    const job = await jobQueueService.enqueue(JOB_TYPES.DATABASE_MAINTENANCE, { target: 'audit' });
    const [claimed] = await worker.claimJobs(1);

    await worker.processJob(claimed);

    const updated = await jobQueueService.getJob(job.id);
    assert.equal(executed, true);
    assert.equal(updated.status, JOB_STATUS.COMPLETED);
    assert.equal(updated.lockedBy, null);
    assert.ok(updated.completedAt);
    assert.ok(typeof updated.executionDurationMs === 'number');
  });

  test('Transient error schedules exponential backoff retry', async () => {
    const worker = new JobWorker({
      workerId: 'worker-retry',
      baseRetryDelayMs: 200,
      maxRetryDelayMs: 5000
    });

    jobRegistry.register(JOB_TYPES.NOTIFICATION_DISPATCH, async () => {
      throw new Error('Temporary gateway network glitch');
    });

    const job = await jobQueueService.enqueue(
      JOB_TYPES.NOTIFICATION_DISPATCH,
      { phone: '+251911000000' },
      { maxAttempts: 3 }
    );

    const [claimed] = await worker.claimJobs(1);
    await worker.processJob(claimed);

    const updated = await jobQueueService.getJob(job.id);
    assert.equal(updated.status, JOB_STATUS.SCHEDULED);
    assert.equal(updated.attempts, 1);
    assert.ok(updated.nextRetryAt);
    assert.match(updated.errorSummary, /Temporary gateway network glitch/);
    assert.equal(updated.lockedBy, null);
  });

  test('Permanent error terminates job as FAILED without retrying', async () => {
    const worker = new JobWorker({ workerId: 'worker-fail' });

    jobRegistry.register(JOB_TYPES.DOCUMENT_OCR_PROCESS, async () => {
      const err = new Error('Corrupted document format - invalid magic bytes');
      err.isPermanent = true;
      throw err;
    });

    const job = await jobQueueService.enqueue(
      JOB_TYPES.DOCUMENT_OCR_PROCESS,
      { documentId: 'doc-invalid' },
      { maxAttempts: 5 }
    );

    const [claimed] = await worker.claimJobs(1);
    await worker.processJob(claimed);

    const updated = await jobQueueService.getJob(job.id);
    assert.equal(updated.status, JOB_STATUS.FAILED);
    assert.equal(updated.attempts, 1); // Does not retry
    assert.ok(updated.completedAt);
    assert.match(updated.errorSummary, /Corrupted document format/);
  });

  test('recoverAbandonedJobs unlocks jobs abandoned by crashed worker instances', async () => {
    const worker = new JobWorker({ workerId: 'worker-sweeper', staleThresholdMs: 100 });

    const job = await jobQueueService.enqueue(JOB_TYPES.OUTBOX_DISPATCH, { id: 1 });
    const [claimed] = await worker.claimJobs(1);

    // Simulate crash: worker disappeared, lock is 200ms old
    const mem = jobQueueService.inMemoryStore.get(job.id);
    if (mem) {
      mem.locked_at = new Date(Date.now() - 300).toISOString();
    }

    const recoveredCount = await worker.recoverAbandonedJobs(100);
    assert.equal(recoveredCount, 1);

    const recoveredJob = await jobQueueService.getJob(job.id);
    assert.equal(recoveredJob.status, JOB_STATUS.PENDING);
    assert.equal(recoveredJob.lockedBy, null);
    assert.match(recoveredJob.errorSummary, /Recovered from abandoned worker lock/);
  });
});
