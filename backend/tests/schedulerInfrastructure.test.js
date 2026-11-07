/**
 * CareConnect Ethiopia - Scheduler & Recurring Job Infrastructure Unit Tests
 * Verifies delayed job scheduling, distributed task leasing, lease exclusivity,
 * Ethiopian timezone conversions, and working hours evaluation.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SchedulerService, ETHIOPIA_TIMEZONE_OFFSET_HOURS } from '../src/services/schedulerService.js';
import { jobQueueService } from '../src/services/jobQueueService.js';
import { JOB_STATUS, JOB_TYPES } from '../src/constants/jobs.js';

describe('Scheduling and Recurring Job Infrastructure — Commit 092', () => {
  beforeEach(() => {
    jobQueueService.clearInMemory();
  });

  test('scheduleOneTimeJob creates delayed job with future scheduledAt in SCHEDULED status', async () => {
    const scheduler = new SchedulerService();
    const runAt = new Date(Date.now() + 1800 * 1000); // 30 minutes from now

    const job = await scheduler.scheduleOneTimeJob(
      JOB_TYPES.REFERRAL_SLA_CHECK,
      { referralId: 'ref-delayed-1' },
      runAt
    );

    assert.ok(job.id);
    assert.equal(job.status, JOB_STATUS.SCHEDULED);
    assert.equal(new Date(job.scheduledAt).toISOString(), runAt.toISOString());
  });

  test('acquireTaskLease grants exclusive lease to leader instance and rejects competitor', async () => {
    const instanceA = new SchedulerService({ instanceId: 'node-alpha' });
    const instanceB = new SchedulerService({ instanceId: 'node-beta' });
    const taskName = 'sla_breach_monitor';

    // Instance A acquires lease
    const acquiredA = await instanceA.acquireTaskLease(taskName, 60000);
    assert.equal(acquiredA, true, 'Instance A must acquire the lease');

    // Instance B attempts to acquire simultaneously
    const acquiredB = await instanceB.acquireTaskLease(taskName, 60000);
    assert.equal(acquiredB, false, 'Instance B must be rejected due to active lease hold');
  });

  test('evaluateRecurringTasks runs registered task when lease is acquired', async () => {
    const scheduler = new SchedulerService({ instanceId: 'leader-node' });
    let executionContext = null;

    scheduler.registerRecurringTask('cleanup_temp_files', 5000, async (ctx) => {
      executionContext = ctx;
    });

    await scheduler.evaluateRecurringTasks();

    assert.ok(executionContext);
    assert.equal(executionContext.taskName, 'cleanup_temp_files');
    assert.equal(executionContext.instanceId, 'leader-node');
  });

  test('formatEthiopianTime calculates UTC+3 East Africa Time accurately', () => {
    // 2026-11-07 07:00:00 UTC = 2026-11-07 10:00:00 EAT
    const utcDate = new Date('2026-11-07T07:00:00.000Z');
    const formatted = SchedulerService.formatEthiopianTime(utcDate);

    assert.equal(formatted, '2026-11-07 10:00:00 EAT');
  });

  test('isWorkingHours correctly assesses Ethiopian clinical working hours', () => {
    // Wednesday 09:00 EAT (06:00 UTC) -> Working hours
    const wedMorningUtc = new Date('2026-11-04T06:00:00.000Z');
    assert.equal(SchedulerService.isWorkingHours(wedMorningUtc), true);

    // Wednesday 20:00 EAT (17:00 UTC) -> Outside working hours
    const wedNightUtc = new Date('2026-11-04T17:00:00.000Z');
    assert.equal(SchedulerService.isWorkingHours(wedNightUtc), false);

    // Sunday 11:00 EAT (08:00 UTC) -> Weekend (outside working hours)
    const sundayUtc = new Date('2026-11-08T08:00:00.000Z');
    assert.equal(SchedulerService.isWorkingHours(sundayUtc), false);
  });
});
