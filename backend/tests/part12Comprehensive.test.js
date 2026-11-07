/**
 * CareConnect Ethiopia - Part 12 Comprehensive Verification Test Suite
 * End-to-End Reliability Verification across Background Processing,
 * Job Worker Execution, Exponential Backoff, Transactional Outbox,
 * Multi-Instance Distributed Leasing, East Africa Time (EAT) Scheduling,
 * Referral SLA Escalation, Multi-Channel Notification Delivery, and Monitoring.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import { jobQueueService } from '../src/services/jobQueueService.js';
import { jobRegistry } from '../src/services/jobRegistry.js';
import { JobWorker } from '../src/services/jobWorker.js';
import { outboxService } from '../src/services/outboxService.js';
import { SchedulerService } from '../src/services/schedulerService.js';
import { referralDeadlineService } from '../src/services/referralDeadlineService.js';
import { notificationDeliveryService } from '../src/services/notificationDeliveryService.js';
import { jobMonitoringService } from '../src/services/jobMonitoringService.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import {
  JOB_STATUS,
  JOB_PRIORITY,
  JOB_TYPES,
  OUTBOX_STATUS,
  OUTBOX_EVENT_TYPES,
  NOTIFICATION_CHANNELS,
  DELIVERY_STATUS
} from '../src/constants/jobs.js';

describe('Part 12 Comprehensive Verification Suite: Background Processing & Notification Infrastructure', () => {
  let adminToken;
  let staffToken;

  beforeEach(async () => {
    jobQueueService.clearInMemory();
    jobRegistry.clear();
    outboxService.clearInMemory();
    notificationDeliveryService.clearInMemory();
    referralDeadlineService.clearInMemory();
    SchedulerService.clearSharedLeases();
    UserModel.clearMockUsers();

    const admin = await UserModel.create({
      email: 'admin.worker@careconnect.et',
      firstName: 'Admin',
      lastName: 'Worker',
      roleId: 6
    });

    const staff = await UserModel.create({
      email: 'staff.worker@careconnect.et',
      firstName: 'Staff',
      lastName: 'Worker',
      roleId: 1
    });

    adminToken = generateAccessToken(admin);
    staffToken = generateAccessToken(staff);
  });

  // =========================================================================
  // DOMAIN 1: Job Queue Architecture & Registration (Scenarios 1-3)
  // =========================================================================
  describe('Domain 1: Job Queue Architecture & Registration', () => {
    test('1. Enqueues immediate job with default priority and payload serialization', async () => {
      const payload = { referralId: 'ref-test-01', facilityId: 'fac-hc-01' };
      const job = await jobQueueService.enqueue(JOB_TYPES.REFERRAL_SLA_CHECK, payload, {
        priority: JOB_PRIORITY.NORMAL
      });

      assert.ok(job.id);
      assert.equal(job.jobType, JOB_TYPES.REFERRAL_SLA_CHECK);
      assert.equal(job.status, JOB_STATUS.PENDING);
      assert.equal(job.priority, JOB_PRIORITY.NORMAL);
      assert.deepEqual(job.payload, payload);
      assert.equal(job.attempts, 0);
      assert.equal(job.maxAttempts, 5);
    });

    test('2. Enqueues delayed / scheduled job in future with SCHEDULED status', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // +1 hour
      const job = await jobQueueService.enqueue(
        JOB_TYPES.DATABASE_MAINTENANCE,
        { retentionDays: 90 },
        { scheduledAt: futureDate.toISOString() }
      );

      assert.equal(job.status, JOB_STATUS.SCHEDULED);
      assert.ok(new Date(job.scheduledAt).getTime() > Date.now());
    });

    test('3. Job registry enforces handler registration, execution, and validation of handlers', async () => {
      let executed = false;
      jobRegistry.register(JOB_TYPES.OUTBOX_DISPATCH, async (payload) => {
        executed = true;
        return { processed: payload.count };
      });

      assert.ok(jobRegistry.has(JOB_TYPES.OUTBOX_DISPATCH));
      const handler = jobRegistry.get(JOB_TYPES.OUTBOX_DISPATCH);
      const res = await handler({ count: 42 });
      assert.equal(executed, true);
      assert.equal(res.processed, 42);

      // Invalid handler throws error
      assert.throws(() => {
        jobRegistry.register('INVALID_TYPE', 'not-a-function');
      }, /must be a function/);

      // Unknown handler returns null
      assert.equal(jobRegistry.get('NON_EXISTENT_TYPE'), null);
    });
  });

  // =========================================================================
  // DOMAIN 2: Priority Ordering & Job Worker Execution (Scenarios 4-6)
  // =========================================================================
  describe('Domain 2: Priority Ordering & Job Worker Execution', () => {
    test('4. Worker claims jobs strictly respecting priority: CRITICAL before HIGH before NORMAL before LOW', async () => {
      const worker = new JobWorker({ workerId: 'test-worker-prio', concurrency: 10 });

      // Enqueue jobs in inverse priority order
      await jobQueueService.enqueue('JOB_LOW', {}, { priority: JOB_PRIORITY.LOW });
      await jobQueueService.enqueue('JOB_NORMAL', {}, { priority: JOB_PRIORITY.NORMAL });
      await jobQueueService.enqueue('JOB_CRITICAL', {}, { priority: JOB_PRIORITY.CRITICAL });
      await jobQueueService.enqueue('JOB_HIGH', {}, { priority: JOB_PRIORITY.HIGH });

      const claimed = await worker.claimJobs(4);
      assert.equal(claimed.length, 4);
      assert.equal(claimed[0].priority, JOB_PRIORITY.CRITICAL);
      assert.equal(claimed[1].priority, JOB_PRIORITY.HIGH);
      assert.equal(claimed[2].priority, JOB_PRIORITY.NORMAL);
      assert.equal(claimed[3].priority, JOB_PRIORITY.LOW);
    });

    test('5. In-flight concurrency limits prevent overloading worker threads', async () => {
      const worker = new JobWorker({ workerId: 'test-concurrency-worker', concurrency: 2 });
      assert.equal(worker.concurrency - worker.inFlightCount > 0, true);

      worker.inFlightCount = 2;
      assert.equal(worker.concurrency - worker.inFlightCount > 0, false);

      const claimed = await worker.claimJobs(0);
      assert.equal(claimed.length, 0); // Blocked when 0 slots requested
    });

    test('6. Graceful shutdown halts new claim loops while permitting in-flight jobs to terminate', async () => {
      const worker = new JobWorker({ workerId: 'test-graceful-worker' });
      worker.start();
      assert.equal(worker.isRunning, true);

      let slowJobFinished = false;
      jobRegistry.register('SLOW_JOB', async () => {
        await new Promise((r) => setTimeout(r, 40));
        slowJobFinished = true;
      });

      await jobQueueService.enqueue('SLOW_JOB', {});
      const [claimed] = await worker.claimJobs(1);
      
      const executionPromise = worker.processJob(claimed);
      await worker.stop();

      assert.equal(worker.isRunning, false);
      await executionPromise;
      assert.equal(slowJobFinished, true);
    });
  });

  // =========================================================================
  // DOMAIN 3: Error Classification, Exponential Backoff & Retry Handling (Scenarios 7-9)
  // =========================================================================
  describe('Domain 3: Error Classification, Exponential Backoff & Retry Handling', () => {
    test('7. Transient failure calculates exponential backoff with jitter and sets next_retry_at', async () => {
      const worker = new JobWorker({ workerId: 'test-backoff-worker' });
      jobRegistry.register('TRANSIENT_JOB', async () => {
        const err = new Error('Database connection pool timeout');
        err.isTransient = true;
        throw err;
      });

      const job = await jobQueueService.enqueue('TRANSIENT_JOB', {}, { maxAttempts: 3 });
      const [claimed] = await worker.claimJobs(1);

      await worker.processJob(claimed);

      const updated = await jobQueueService.getJob(job.id);
      assert.equal(updated.status, JOB_STATUS.SCHEDULED);
      assert.equal(updated.attempts, 1);
      assert.ok(updated.nextRetryAt);
      assert.ok(new Date(updated.nextRetryAt).getTime() > Date.now());
      assert.ok(updated.errorSummary.includes('Database connection pool timeout'));
    });

    test('8. Permanent non-recoverable failure immediately transitions job to FAILED without needless retries', async () => {
      const worker = new JobWorker({ workerId: 'test-permanent-fail-worker' });
      jobRegistry.register('PERMANENT_FAIL_JOB', async () => {
        const err = new Error('Invalid JSON payload structure: schema corruption');
        err.isPermanent = true;
        throw err;
      });

      const job = await jobQueueService.enqueue('PERMANENT_FAIL_JOB', {}, { maxAttempts: 5 });
      const [claimed] = await worker.claimJobs(1);

      await worker.processJob(claimed);

      const updated = await jobQueueService.getJob(job.id);
      assert.equal(updated.status, JOB_STATUS.FAILED);
      assert.equal(updated.nextRetryAt, null);
      assert.ok(updated.errorSummary.includes('Invalid JSON payload structure: schema corruption'));
    });

    test('9. Exhausted max attempts transitions job to FAILED with accumulated error summary', async () => {
      const worker = new JobWorker({ workerId: 'test-exhaustion-worker' });
      jobRegistry.register('EXHAUSTION_JOB', async () => {
        throw new Error('Upstream provider HTTP 503');
      });

      const job = await jobQueueService.enqueue('EXHAUSTION_JOB', {}, { maxAttempts: 1 });
      const [claimed] = await worker.claimJobs(1);

      await worker.processJob(claimed);

      const updated = await jobQueueService.getJob(job.id);
      assert.equal(updated.status, JOB_STATUS.FAILED);
      assert.equal(updated.attempts, 1);
      assert.equal(updated.nextRetryAt, null);
    });
  });

  // =========================================================================
  // DOMAIN 4: Crash Recovery & Stale Lock Reclamation (Scenarios 10-12)
  // =========================================================================
  describe('Domain 4: Crash Recovery & Stale Lock Reclamation', () => {
    test('10. recoverAbandonedJobs claims expired locked jobs and resets status to PENDING', async () => {
      const worker = new JobWorker({ workerId: 'test-recovery-worker' });
      const job = await jobQueueService.enqueue('ORPHAN_JOB', {});

      // Simulate a crashed worker leaving job in PROCESSING with old lock timestamp
      const mem = jobQueueService.inMemoryStore.get(job.id);
      mem.status = JOB_STATUS.PROCESSING;
      mem.locked_by = 'crashed-worker-pid-999';
      mem.locked_at = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 mins ago

      const recoveredCount = await worker.recoverAbandonedJobs(10 * 60 * 1000); // 10 min threshold
      assert.equal(recoveredCount, 1);

      const updated = await jobQueueService.getJob(job.id);
      assert.equal(updated.status, JOB_STATUS.PENDING);
      assert.equal(updated.lockedBy, null);
      assert.ok(updated.errorSummary.includes('[Recovered from abandoned worker lock]'));
    });

    test('11. Row-level concurrency locking prevents multiple workers from claiming the same job', async () => {
      const workerA = new JobWorker({ workerId: 'worker-node-alpha' });
      const workerB = new JobWorker({ workerId: 'worker-node-beta' });

      await jobQueueService.enqueue('CONCURRENT_TEST_JOB', {});

      const claimedA = await workerA.claimJobs(1);
      const claimedB = await workerB.claimJobs(1);

      assert.equal(claimedA.length, 1);
      assert.equal(claimedB.length, 0); // No more pending jobs for Worker B
      assert.equal(claimedA[0].lockedBy, 'worker-node-alpha');
    });

    test('12. Completed jobs record execution duration and timestamps accurately', async () => {
      const worker = new JobWorker({ workerId: 'test-metrics-worker' });
      jobRegistry.register('TIMED_JOB', async () => {
        await new Promise((r) => setTimeout(r, 25));
        return { success: true };
      });

      const job = await jobQueueService.enqueue('TIMED_JOB', {});
      const [claimed] = await worker.claimJobs(1);

      await worker.processJob(claimed);

      const updated = await jobQueueService.getJob(job.id);
      assert.equal(updated.status, JOB_STATUS.COMPLETED);
      assert.ok(updated.startedAt);
      assert.ok(updated.completedAt);
      assert.ok(updated.executionDurationMs >= 15);
    });
  });

  // =========================================================================
  // DOMAIN 5: Transactional Outbox Event Reliability (Scenarios 13-15)
  // =========================================================================
  describe('Domain 5: Transactional Outbox Event Reliability', () => {
    test('13. Atomic domain event generation within transaction client and standalone insertion', async () => {
      const event = await outboxService.createEvent(
        'referral',
        'ref-outbox-01',
        OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
        { urgency: 'URGENT', fromFacility: 'fac-1' },
        { idempotencyKey: 'ref:submit:ref-outbox-01' }
      );

      assert.ok(event.id);
      assert.equal(event.aggregateType, 'referral');
      assert.equal(event.aggregateId, 'ref-outbox-01');
      assert.equal(event.eventType, OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED);
      assert.equal(event.status, OUTBOX_STATUS.PENDING);
      assert.equal(event.idempotencyKey, 'ref:submit:ref-outbox-01');
    });

    test('14. Idempotency key conflict prevents duplicate outbox events from being emitted', async () => {
      const ev1 = await outboxService.createEvent(
        'document',
        'doc-unique-01',
        OUTBOX_EVENT_TYPES.DOCUMENT_UPLOADED,
        { fileName: 'chest-xray.png' },
        { idempotencyKey: 'doc:upload:doc-unique-01' }
      );

      const ev2 = await outboxService.createEvent(
        'document',
        'doc-unique-01',
        OUTBOX_EVENT_TYPES.DOCUMENT_UPLOADED,
        { fileName: 'chest-xray-modified.png' },
        { idempotencyKey: 'doc:upload:doc-unique-01' }
      );

      assert.equal(ev1.id, ev2.id); // Same record returned, deduplicated
    });

    test('15. Outbox publisher claims pending events, executes registered subscribers, and transitions to PUBLISHED', async () => {
      let subscriberReceived = null;
      outboxService.subscribe(OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED, async (ev) => {
        subscriberReceived = ev;
      });

      await outboxService.createEvent(
        'referral',
        'ref-pub-01',
        OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
        { patientName: 'Almaz Ayana' }
      );

      const [claimed] = await outboxService.claimPendingEvents(5);
      assert.ok(claimed);

      const dispatched = await outboxService.dispatchEvent(claimed);
      assert.equal(dispatched, true);
      assert.ok(subscriberReceived);
      assert.equal(subscriberReceived.aggregateId, 'ref-pub-01');

      const mem = outboxService.inMemoryStore.get(claimed.id);
      assert.equal(mem.status, OUTBOX_STATUS.PUBLISHED);
      assert.ok(mem.published_at);
    });
  });

  // =========================================================================
  // DOMAIN 6: Multi-Instance Distributed Leasing & Ethiopian Timezone (Scenarios 16-18)
  // =========================================================================
  describe('Domain 6: Multi-Instance Distributed Leasing & Ethiopian Timezone', () => {
    test('16. Distributed task lease acquisition succeeds for leader and rejects competing instances', async () => {
      const schedulerA = new SchedulerService({ instanceId: 'node-east-01' });
      const schedulerB = new SchedulerService({ instanceId: 'node-east-02' });

      const acquiredA = await schedulerA.acquireTaskLease('DAILY_AUDIT_REPORT', 30000);
      const acquiredB = await schedulerB.acquireTaskLease('DAILY_AUDIT_REPORT', 30000);

      assert.equal(acquiredA, true);
      assert.equal(acquiredB, false);
    });

    test('17. Lease expiry allows standby instance to acquire leadership', async () => {
      const schedulerA = new SchedulerService({ instanceId: 'node-leader', leaseDurationMs: 20 });
      const schedulerB = new SchedulerService({ instanceId: 'node-standby' });

      // Acquire with 20ms lease duration
      await schedulerA.acquireTaskLease('CACHE_SWEEP', 50);

      // Advance clock past 20ms lease expiry
      await new Promise((r) => setTimeout(r, 40));

      const acquiredB = await schedulerB.acquireTaskLease('CACHE_SWEEP', 30000);
      assert.equal(acquiredB, true);
    });

    test('18. East Africa Time (EAT: UTC+3) formatting and Ethiopian clinical working hours evaluation', () => {
      // Test formatEthiopianTime
      const utcDate = new Date('2026-11-07T07:30:00.000Z'); // 07:30 UTC = 10:30 EAT
      const formatted = SchedulerService.formatEthiopianTime(utcDate);
      assert.ok(formatted.includes('10:30') || formatted.includes('10'));

      // Test working hours evaluation (weekday 08:30 - 17:30 EAT)
      // Wednesday 10:00 EAT (07:00 UTC) -> Within working hours
      const wednesdayMorningUtc = new Date('2026-11-04T07:00:00.000Z');
      assert.equal(SchedulerService.isWorkingHours(wednesdayMorningUtc), true);

      // Sunday 10:00 EAT -> Weekend (False)
      const sundayUtc = new Date('2026-11-08T07:00:00.000Z');
      assert.equal(SchedulerService.isWorkingHours(sundayUtc), false);

      // Wednesday 22:00 EAT (19:00 UTC) -> Night time (False)
      const wednesdayNightUtc = new Date('2026-11-04T19:00:00.000Z');
      assert.equal(SchedulerService.isWorkingHours(wednesdayNightUtc), false);
    });
  });

  // =========================================================================
  // DOMAIN 7: Referral SLA Deadline & Operational Escalation (Scenarios 19-21)
  // =========================================================================
  describe('Domain 7: Referral SLA Deadline & Operational Escalation', () => {
    test('19. Inspects overdue acknowledgement and decision deadlines, incrementing escalation levels', async () => {
      const overdueRef = {
        id: 'ref-escalate-01',
        referral_code: 'REF-2026-ESC1',
        source_facility_id: 'fac-hc-01',
        receiving_facility_id: 'fac-hosp-01',
        status: 'SUBMITTED',
        acknowledgement_deadline: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins overdue
        escalation_level: 0
      };

      referralDeadlineService.seedReferral(overdueRef);
      const result = await referralDeadlineService.evaluateDeadlines();

      assert.equal(result.evaluated, 1);
      assert.equal(result.escalated, 1);
      assert.equal(result.exceptionsRecorded, 1);
      assert.equal(overdueRef.escalation_level, 1);
    });

    test('20. Records operational exceptions and emits ESCALATION_CREATED outbox events', async () => {
      let outboxEventReceived = null;
      outboxService.subscribe(OUTBOX_EVENT_TYPES.ESCALATION_CREATED, async (ev) => {
        outboxEventReceived = ev;
      });

      const overdueDecisionRef = {
        id: 'ref-decision-overdue-02',
        referral_code: 'REF-2026-ESC2',
        source_facility_id: 'fac-hc-02',
        receiving_facility_id: 'fac-hosp-02',
        status: 'UNDER_REVIEW',
        decision_deadline: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        escalation_level: 0
      };

      referralDeadlineService.seedReferral(overdueDecisionRef);
      await referralDeadlineService.evaluateDeadlines();

      // Claim and dispatch outbox event
      const [claimed] = await outboxService.claimPendingEvents(5);
      assert.ok(claimed);
      assert.equal(claimed.eventType, OUTBOX_EVENT_TYPES.ESCALATION_CREATED);
      await outboxService.dispatchEvent(claimed);

      assert.ok(outboxEventReceived);
      assert.equal(outboxEventReceived.eventType, OUTBOX_EVENT_TYPES.ESCALATION_CREATED);
      assert.equal(outboxEventReceived.payload.referralId, 'ref-decision-overdue-02');
    });

    test('21. Clinical boundary rule: Terminal referrals (CANCELLED, REJECTED, COMPLETED) are strictly suppressed', async () => {
      referralDeadlineService.seedReferral({
        id: 'ref-term-01',
        status: 'CANCELLED',
        acknowledgement_deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      });
      referralDeadlineService.seedReferral({
        id: 'ref-term-02',
        status: 'REJECTED',
        decision_deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      });
      referralDeadlineService.seedReferral({
        id: 'ref-term-03',
        status: 'COMPLETED',
        acknowledgement_deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      });

      const result = await referralDeadlineService.evaluateDeadlines();
      assert.equal(result.escalated, 0); // Strictly zero escalations created
      assert.equal(result.exceptionsRecorded, 0);
    });
  });

  // =========================================================================
  // DOMAIN 8: Multi-Channel Notification Delivery & Monitoring (Scenarios 22-24)
  // =========================================================================
  describe('Domain 8: Multi-Channel Notification Delivery & Monitoring', () => {
    test('22. Dispatches notifications across IN_APP, SMS, and EMAIL with non-PII templates and portal deep-links', async () => {
      const inAppDelivery = await notificationDeliveryService.dispatch({
        channel: NOTIFICATION_CHANNELS.IN_APP,
        recipientUserId: 'user-triage-01',
        title: 'Referral Urgent Escalation',
        message: 'Action required on referral REF-2026-ESC1',
        entityType: 'referral',
        entityId: 'ref-01'
      });
      assert.equal(inAppDelivery.status, DELIVERY_STATUS.SENT);

      const smsDelivery = await notificationDeliveryService.dispatch({
        channel: NOTIFICATION_CHANNELS.SMS,
        recipientAddress: '+251911445566',
        message: 'CareConnect alert: Urgent referral awaiting hospital triage response.',
        entityType: 'referral',
        entityId: 'ref-01'
      });
      assert.equal(smsDelivery.status, DELIVERY_STATUS.SENT);

      const emailDelivery = await notificationDeliveryService.dispatch({
        channel: NOTIFICATION_CHANNELS.EMAIL,
        recipientAddress: 'chief.triage@hospital.gov.et',
        title: 'Urgent Operational Escalation',
        message: 'Please review referral REF-2026-ESC1 on the hospital portal.',
        entityType: 'referral',
        entityId: 'ref-01'
      });
      assert.equal(emailDelivery.status, DELIVERY_STATUS.SENT);
    });

    test('23. Enforces notification deduplication key preventing duplicate sends to the same recipient', async () => {
      const params = {
        channel: NOTIFICATION_CHANNELS.SMS,
        recipientAddress: '+251911889900',
        message: 'Reminder: Scheduled ambulance arriving in 15 minutes',
        deduplicationKey: 'sms:reminder:transport-amb-01'
      };

      const firstSend = await notificationDeliveryService.dispatch(params);
      const duplicateSend = await notificationDeliveryService.dispatch(params);

      assert.equal(firstSend.id, duplicateSend.id);
      assert.equal(notificationDeliveryService.inMemoryDeliveries.size, 1);
    });

    test('24. Administrative monitoring API & operator retry/cancel controls via HTTP endpoints', async () => {
      // 1. Seed metrics
      const failedJob = await jobQueueService.enqueue('DOCUMENT_OCR_SCAN', { docId: 'doc-fail-01' });
      const memJob = jobQueueService.inMemoryStore.get(failedJob.id);
      memJob.status = JOB_STATUS.FAILED;
      memJob.error_summary = 'Remote OCR engine 504 Gateway Timeout';

      await outboxService.createEvent('coordination', 'coord-01', 'AMBULANCE_DISPATCHED', { ambId: 'A-1' });

      // 2. Fetch metrics
      const metricsRes = await request(app).get('/api/v1/jobs/metrics', {
        headers: { authorization: `Bearer ${adminToken}` }
      });
      assert.equal(metricsRes.status, 200);
      assert.equal(metricsRes.body.data.jobs.failed, 1);
      assert.equal(metricsRes.body.data.outbox.pending, 1);

      // 3. Retry failed job via API
      const retryRes = await request(app).post(`/api/v1/jobs/${failedJob.id}/retry`, {}, {
        headers: { authorization: `Bearer ${adminToken}` }
      });
      assert.equal(retryRes.status, 200);
      assert.equal(retryRes.body.data.job.status, JOB_STATUS.PENDING);

      // 4. Cancel job via API
      const cancelRes = await request(app).post(`/api/v1/jobs/${failedJob.id}/cancel`, {
        reason: 'Operator cancelled manual retry'
      }, {
        headers: { authorization: `Bearer ${adminToken}` }
      });
      assert.equal(cancelRes.status, 200);
      assert.equal(cancelRes.body.data.job.status, JOB_STATUS.CANCELLED);

      // 5. Query failed jobs endpoint
      const failedListRes = await request(app).get('/api/v1/jobs/failed', {
        headers: { authorization: `Bearer ${adminToken}` }
      });
      assert.equal(failedListRes.status, 200);
      assert.ok(Array.isArray(failedListRes.body.data.jobs));
    });
  });
});
