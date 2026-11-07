/**
 * CareConnect Ethiopia - Notification Templates & Event Integration Unit Tests
 * Verifies non-PII template formatting, XSS sanitization, outbox event ingestion,
 * and duplicate notification prevention — Commit 099.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NotificationTemplateService } from '../src/services/notificationTemplateService.js';
import { NotificationEventSubscriber } from '../src/services/notificationEventSubscriber.js';
import { NotificationRecipientResolver } from '../src/services/notificationRecipientResolver.js';
import { NotificationRepository } from '../src/repositories/notificationRepository.js';
import { NotificationDeliveryService } from '../src/services/notificationDeliveryService.js';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES
} from '../src/constants/notifications.js';
import { OUTBOX_EVENT_TYPES } from '../src/constants/jobs.js';

describe('Commit 099: Notification Templates & Event Integration Suite', () => {
  let templateService;
  let resolver;
  let repo;
  let deliveryService;
  let subscriber;

  beforeEach(() => {
    templateService = new NotificationTemplateService();
    resolver = new NotificationRecipientResolver();
    repo = new NotificationRepository();
    deliveryService = new NotificationDeliveryService();

    subscriber = new NotificationEventSubscriber({
      resolver,
      templateService,
      repo,
      deliveryService
    });

    // Seed test triage user at Receiving Hospital
    resolver.seedUser({
      id: 201,
      firstName: 'Dr. Yared',
      lastName: 'Girma',
      email: 'yared@hospital.et',
      roleId: 3,
      roleName: 'HOSPITAL_TRIAGE',
      facilityId: 'fac-hosp-01'
    });
    resolver.seedAssignment(201, 'fac-hosp-01');

    // Seed test health centre clinician
    resolver.seedUser({
      id: 202,
      firstName: 'Sr. Mulu',
      lastName: 'Tesfaye',
      email: 'mulu@hc01.et',
      roleId: 1,
      roleName: 'HEALTH_CENTRE_STAFF',
      facilityId: 'fac-hc-01'
    });
    resolver.seedAssignment(202, 'fac-hc-01');
  });

  test('1. Renders safe, non-PII operational message and portal deep links', () => {
    const rendered = templateService.render(NOTIFICATION_TYPES.REFERRAL_ACCEPTED, {
      referralId: 'ref-uuid-001',
      referralCode: 'REF-2026-ETH01',
      facilityName: 'Tikur Anbessa Specialized Hospital'
    });

    assert.ok(rendered.title.includes('REF-2026-ETH01'));
    assert.ok(rendered.message.includes('Tikur Anbessa Specialized Hospital'));
    assert.equal(rendered.actionUrl, '/referrals/ref-uuid-001');
    assert.equal(rendered.category, NOTIFICATION_CATEGORIES.REFERRAL_UPDATE);
  });

  test('2. Rigorously sanitizes hostile user inputs preventing HTML and XSS injection', () => {
    const hostileInput = {
      referralCode: '<script>alert("pwned")</script>',
      facilityName: 'Hospital <img src=x onerror=alert(1)>',
      reason: 'Malicious "quote" & \'ampersand\''
    };

    const rendered = templateService.render(NOTIFICATION_TYPES.REFERRAL_REJECTED, hostileInput);

    assert.ok(!rendered.title.includes('<script>'));
    assert.ok(rendered.title.includes('&lt;script&gt;'));
    assert.ok(!rendered.message.includes('<img'));
    assert.ok(rendered.message.includes('&lt;img'));
    assert.ok(rendered.message.includes('&quot;quote&quot;'));
    assert.ok(rendered.message.includes('&#39;ampersand&#39;'));
  });

  test('3. Ingests referral outbox event and creates in-app notification records for resolved staff', async () => {
    const outboxEvent = {
      id: 'outbox-ev-001',
      aggregateType: 'referral',
      aggregateId: 'ref-1001',
      eventType: OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
      payload: {
        referralId: 'ref-1001',
        referralCode: 'REF-2026-1001',
        fromFacility: 'fac-hc-01',
        toFacility: 'fac-hosp-01',
        urgency: 'URGENT'
      }
    };

    const created = await subscriber.handleReferralEvent(outboxEvent);

    assert.equal(created.length, 1);
    assert.equal(created[0].recipientUserId, 201);
    assert.equal(created[0].recipientFacilityId, 'fac-hosp-01');
    assert.equal(created[0].category, NOTIFICATION_CATEGORIES.REFERRAL_UPDATE);
    assert.ok(created[0].title.includes('REF-2026-1001'));
    assert.equal(created[0].isRead, false);
  });

  test('4. Enforces deduplication key preventing duplicate alerts upon event replay', async () => {
    const outboxEvent = {
      id: 'outbox-ev-002',
      aggregateType: 'referral',
      aggregateId: 'ref-1002',
      eventType: OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
      payload: {
        referralId: 'ref-1002',
        referralCode: 'REF-2026-1002',
        fromFacility: 'fac-hc-01',
        toFacility: 'fac-hosp-01'
      }
    };

    // First event handling
    const firstRun = await subscriber.handleReferralEvent(outboxEvent);
    assert.equal(firstRun.length, 1);

    // Replay of identical event
    const secondRun = await subscriber.handleReferralEvent(outboxEvent);
    assert.equal(secondRun.length, 1);

    // Should return existing record, maintaining single record in repository
    const all = await repo.listByRecipient(201);
    assert.equal(all.total, 1);
  });

  test('5. In-app notification creation succeeds even if external email provider fails', async () => {
    // Break email provider
    deliveryService.providers.set('EMAIL', {
      name: 'broken-email',
      send: async () => ({ success: false, error: 'SMTP Connection Reset' })
    });

    const outboxEvent = {
      id: 'outbox-ev-003',
      aggregateType: 'referral',
      aggregateId: 'ref-1003',
      eventType: OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
      payload: {
        referralId: 'ref-1003',
        referralCode: 'REF-2026-1003',
        fromFacility: 'fac-hc-01',
        toFacility: 'fac-hosp-01'
      }
    };

    const created = await subscriber.handleReferralEvent(outboxEvent);
    assert.equal(created.length, 1);

    // In-app alert is saved and available
    const inAppRecord = await repo.findByIdOrUuid(created[0].uuid);
    assert.ok(inAppRecord);
    assert.equal(inAppRecord.recipientUserId, 201);
  });
});
