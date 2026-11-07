/**
 * CareConnect Ethiopia - Job and Notification Monitoring Unit Tests
 * Verifies metrics collection, queue telemetry, operator retry/cancel capabilities,
 * and administrative API endpoints under /api/v1/jobs.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import { jobMonitoringService } from '../src/services/jobMonitoringService.js';
import { jobQueueService } from '../src/services/jobQueueService.js';
import { outboxService } from '../src/services/outboxService.js';
import { notificationDeliveryService } from '../src/services/notificationDeliveryService.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { JOB_STATUS, JOB_PRIORITY, OUTBOX_STATUS, NOTIFICATION_CHANNELS } from '../src/constants/jobs.js';

describe('Commit 095: Job and Notification Monitoring Suite', () => {
  let adminToken;
  let staffToken;

  beforeEach(async () => {
    jobQueueService.clearInMemory();
    outboxService.clearInMemory();
    notificationDeliveryService.clearInMemory();
    UserModel.clearMockUsers();

    const admin = await UserModel.create({
      email: 'sysadmin@careconnect.et',
      firstName: 'Admin',
      lastName: 'User',
      roleId: 6 // SYSTEM_ADMINISTRATOR
    });

    const staff = await UserModel.create({
      email: 'healthstaff@careconnect.et',
      firstName: 'Health',
      lastName: 'Worker',
      roleId: 1 // HEALTH_CENTRE_STAFF
    });

    adminToken = generateAccessToken(admin);
    staffToken = generateAccessToken(staff);
  });

  test('1. Aggregates job queue metrics accurately', async () => {
    // Seed in-memory jobs with different statuses
    const j1 = await jobQueueService.enqueue('TEST_JOB_1', { data: 1 });
    const j2 = await jobQueueService.enqueue('TEST_JOB_2', { data: 2 });
    
    // Mark j2 completed with execution duration
    const memJ2 = jobQueueService.inMemoryStore.get(j2.id);
    memJ2.status = JOB_STATUS.COMPLETED;
    memJ2.execution_duration_ms = 450;

    // Add a failed job
    const j3 = await jobQueueService.enqueue('TEST_JOB_3', { data: 3 });
    const memJ3 = jobQueueService.inMemoryStore.get(j3.id);
    memJ3.status = JOB_STATUS.FAILED;
    memJ3.error_summary = 'Connection timeout';

    const metrics = await jobMonitoringService.getJobMetrics();

    assert.equal(metrics.total, 3);
    assert.equal(metrics.pending, 1);
    assert.equal(metrics.completed, 1);
    assert.equal(metrics.failed, 1);
    assert.equal(metrics.avgDurationMs, 450);
  });

  test('2. Aggregates outbox backlog telemetry', async () => {
    await outboxService.createEvent('referral', 'ref-001', 'REFERRAL_CREATED', { refId: 'ref-001' });
    const ev2 = await outboxService.createEvent('referral', 'ref-002', 'REFERRAL_UPDATED', { refId: 'ref-002' });
    await outboxService.markPublished(ev2.id);

    const metrics = await jobMonitoringService.getOutboxMetrics();

    assert.equal(metrics.total, 2);
    assert.equal(metrics.pending, 1);
    assert.equal(metrics.published, 1);
  });

  test('3. Aggregates notification delivery metrics across channels', async () => {
    await notificationDeliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.IN_APP,
      recipientUserId: 'user-001',
      title: 'In-app notification',
      message: 'Hello'
    });

    await notificationDeliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.SMS,
      recipientAddress: '+251911223344',
      message: 'SMS alert'
    });

    await notificationDeliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.EMAIL,
      recipientAddress: 'doctor@careconnect.et',
      title: 'Email alert',
      message: 'Details here'
    });

    const metrics = await jobMonitoringService.getNotificationMetrics();

    assert.equal(metrics.total, 3);
    assert.equal(metrics.sent, 3);
    assert.equal(metrics.byChannel.IN_APP.sent, 1);
    assert.equal(metrics.byChannel.SMS.sent, 1);
    assert.equal(metrics.byChannel.EMAIL.sent, 1);
  });

  test('4. Manual operator retry updates failed job status to PENDING', async () => {
    const job = await jobQueueService.enqueue('DOCUMENT_PROCESS', { docId: 'doc-123' });
    const mem = jobQueueService.inMemoryStore.get(job.id);
    mem.status = JOB_STATUS.FAILED;
    mem.attempts = 5;
    mem.max_attempts = 5;
    mem.error_summary = 'Transient storage network reset';

    const retried = await jobMonitoringService.retryJob(job.id, { id: 'admin-01' });

    assert.equal(retried.status, JOB_STATUS.PENDING);
    assert.ok(retried.maxAttempts > 5);
    assert.ok(retried.errorSummary.includes('[Manually retried by admin]'));
  });

  test('5. Enforces RBAC boundaries on administrative monitoring endpoints', async () => {
    // 1. Unauthenticated request rejected
    const unauthRes = await request(app).get('/api/v1/jobs/metrics');
    assert.equal(unauthRes.status, 401);

    // 2. Non-administrator role rejected
    const forbiddenRes = await request(app).get('/api/v1/jobs/metrics', {
      headers: { authorization: `Bearer ${staffToken}` }
    });
    assert.equal(forbiddenRes.status, 403);

    // 3. System Administrator authorized
    const adminRes = await request(app).get('/api/v1/jobs/metrics', {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(adminRes.status, 200);
    assert.ok(adminRes.body.success);
    assert.ok(adminRes.body.data.jobs);
    assert.ok(adminRes.body.data.outbox);
    assert.ok(adminRes.body.data.notifications);
  });

  test('6. HTTP endpoints for inspecting failed jobs and outbox backlog', async () => {
    // Seed failed job
    const failedJob = await jobQueueService.enqueue('OCR_SCAN', { fileId: 'f-1' });
    const memJob = jobQueueService.inMemoryStore.get(failedJob.id);
    memJob.status = JOB_STATUS.FAILED;
    memJob.error_summary = 'OCR service unresponsive';

    // Seed pending outbox event
    await outboxService.createEvent('referral', 'ref-sla-1', 'SLA_BREACH', { refId: 'ref-sla-1' });

    // Query failed jobs
    const failedRes = await request(app).get('/api/v1/jobs/failed', {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(failedRes.status, 200);
    assert.equal(failedRes.body.data.jobs.length, 1);
    assert.equal(failedRes.body.data.jobs[0].id, failedJob.id);

    // Query outbox backlog
    const backlogRes = await request(app).get('/api/v1/jobs/outbox/backlog', {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(backlogRes.status, 200);
    assert.equal(backlogRes.body.data.events.length, 1);
  });

  test('7. HTTP endpoints for operator retry and cancellation', async () => {
    const job = await jobQueueService.enqueue('TEST_RETRY_HTTP', { id: 'test' });
    const memJob = jobQueueService.inMemoryStore.get(job.id);
    memJob.status = JOB_STATUS.FAILED;

    // Retry job
    const retryRes = await request(app).post(`/api/v1/jobs/${job.id}/retry`, {}, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(retryRes.status, 200);
    assert.equal(retryRes.body.data.job.status, JOB_STATUS.PENDING);

    // Cancel job
    const cancelRes = await request(app).post(`/api/v1/jobs/${job.id}/cancel`, {
      reason: 'No longer needed by clinician'
    }, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.job.status, JOB_STATUS.CANCELLED);
  });
});
