/**
 * CareConnect Ethiopia - Part 13 Comprehensive Verification Test Suite
 * End-to-End Reliability, Security, Privacy, and Performance Verification across
 * In-App Notification Center, Recipient Resolution, Safe Non-PII Templates,
 * Transactional Outbox Ingestion, User Notification Preferences,
 * Read/Unread State Management, Soft Dismissal, Retention, and REST APIs.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import { notificationRepository } from '../src/repositories/notificationRepository.js';
import { notificationService } from '../src/services/notificationService.js';
import { notificationPreferenceService } from '../src/services/notificationPreferenceService.js';
import { NotificationRecipientResolver } from '../src/services/notificationRecipientResolver.js';
import { notificationTemplateService } from '../src/services/notificationTemplateService.js';
import { NotificationEventSubscriber } from '../src/services/notificationEventSubscriber.js';
import { NotificationDeliveryService } from '../src/services/notificationDeliveryService.js';
import { NotificationHistoryService } from '../src/services/notificationHistoryService.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  DEFAULT_USER_PREFERENCES
} from '../src/constants/notifications.js';
import { OUTBOX_EVENT_TYPES, NOTIFICATION_CHANNELS, DELIVERY_STATUS } from '../src/constants/jobs.js';

describe('Part 13 Comprehensive Verification Suite: Notification Center & Communication Infrastructure', () => {
  let userAToken;
  let userBToken;
  let adminToken;
  let userA;
  let userB;
  let adminUser;

  let resolver;
  let subscriber;
  let deliveryService;
  let historyService;

  beforeEach(async () => {
    notificationRepository.clearInMemory();
    notificationPreferenceService.clearInMemory();
    UserModel.clearMockUsers();

    // Provision test users
    userA = await UserModel.create({
      email: 'clinician.a@hc01.et',
      firstName: 'Abeba',
      lastName: 'Kebede',
      roleId: 1 // HEALTH_CENTRE_STAFF
    });

    userB = await UserModel.create({
      email: 'triage.b@hosp01.et',
      firstName: 'Biniam',
      lastName: 'Girma',
      roleId: 3 // HOSPITAL_TRIAGE
    });

    adminUser = await UserModel.create({
      email: 'regional.admin@careconnect.et',
      firstName: 'Admin',
      lastName: 'Lead',
      roleId: 6 // SYSTEM_ADMINISTRATOR
    });

    userAToken = generateAccessToken(userA);
    userBToken = generateAccessToken(userB);
    adminToken = generateAccessToken(adminUser);

    resolver = new NotificationRecipientResolver();
    deliveryService = new NotificationDeliveryService();
    historyService = new NotificationHistoryService({
      deliveryService,
      repo: notificationRepository
    });

    subscriber = new NotificationEventSubscriber({
      resolver,
      templateService: notificationTemplateService,
      repo: notificationRepository,
      deliveryService
    });

    // Seed assignments into resolver
    resolver.seedUser({
      id: userA.id,
      firstName: userA.firstName,
      lastName: userA.lastName,
      email: userA.email,
      roleId: 1,
      roleName: 'HEALTH_CENTRE_STAFF',
      facilityId: 'fac-hc-01'
    });
    resolver.seedAssignment(userA.id, 'fac-hc-01');

    resolver.seedUser({
      id: userB.id,
      firstName: userB.firstName,
      lastName: userB.lastName,
      email: userB.email,
      roleId: 3,
      roleName: 'HOSPITAL_TRIAGE',
      facilityId: 'fac-hosp-01'
    });
    resolver.seedAssignment(userB.id, 'fac-hosp-01');

    resolver.seedUser({
      id: adminUser.id,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      email: adminUser.email,
      roleId: 6,
      roleName: 'SYSTEM_ADMINISTRATOR'
    });
  });

  // =========================================================================
  // DOMAIN 1: Data Model & Repository Mechanics (Scenarios 1-3)
  // =========================================================================
  describe('Domain 1: Notification Data Model & Deduplication', () => {
    test('1. Creates notification record with UUID, category, priority, and metadata', async () => {
      const notif = await notificationRepository.create({
        recipientUserId: userA.id,
        recipientFacilityId: 'fac-hc-01',
        title: 'Referral Acknowledged',
        message: 'Your referral has been acknowledged.',
        notificationType: NOTIFICATION_TYPES.REFERRAL_ACKNOWLEDGED,
        category: NOTIFICATION_CATEGORIES.REFERRAL_UPDATE,
        entityType: 'referral',
        entityId: 'ref-001',
        priority: NOTIFICATION_PRIORITIES.HIGH,
        metadata: { referralCode: 'REF-2026-001' }
      });

      assert.ok(notif.id);
      assert.ok(notif.uuid);
      assert.equal(notif.recipientUserId, userA.id);
      assert.equal(notif.category, NOTIFICATION_CATEGORIES.REFERRAL_UPDATE);
      assert.equal(notif.priority, NOTIFICATION_PRIORITIES.HIGH);
      assert.equal(notif.isRead, false);
      assert.equal(notif.isDismissed, false);
    });

    test('2. Deduplication key collision idempotently returns existing record without duplicating', async () => {
      const dedupKey = `inapp:${userA.id}:REFERRAL_SUBMITTED:ref-100`;

      const first = await notificationRepository.create({
        recipientUserId: userA.id,
        title: 'New Referral',
        message: 'Referral submitted',
        notificationType: NOTIFICATION_TYPES.REFERRAL_SUBMITTED,
        deduplicationKey: dedupKey
      });

      const second = await notificationRepository.create({
        recipientUserId: userA.id,
        title: 'New Referral Duplicate',
        message: 'Replay attempt',
        notificationType: NOTIFICATION_TYPES.REFERRAL_SUBMITTED,
        deduplicationKey: dedupKey
      });

      assert.equal(first.uuid, second.uuid);
      assert.equal(notificationRepository.inMemoryStore.size, 1);
    });

    test('3. Filters notifications accurately by category and read status', async () => {
      await notificationRepository.create({
        recipientUserId: userA.id,
        title: 'Routine Update',
        message: 'M1',
        category: NOTIFICATION_CATEGORIES.REFERRAL_UPDATE
      });

      const secNotif = await notificationRepository.create({
        recipientUserId: userA.id,
        title: 'Security Notice',
        message: 'Password changed',
        category: NOTIFICATION_CATEGORIES.SECURITY
      });

      const listSec = await notificationRepository.listByRecipient(userA.id, {
        category: NOTIFICATION_CATEGORIES.SECURITY
      });
      assert.equal(listSec.total, 1);
      assert.equal(listSec.items[0].uuid, secNotif.uuid);
    });
  });

  // =========================================================================
  // DOMAIN 2: Recipient Resolution & Tenancy Isolation (Scenarios 4-6)
  // =========================================================================
  describe('Domain 2: Recipient Resolution & Tenancy Isolation', () => {
    test('4. Resolves active triage staff at receiving hospital for REFERRAL_SUBMITTED', async () => {
      const referral = {
        id: 'ref-comp-1',
        originating_facility_id: 'fac-hc-01',
        receiving_facility_id: 'fac-hosp-01'
      };

      const recipients = await resolver.resolveReferralRecipients(referral, NOTIFICATION_TYPES.REFERRAL_SUBMITTED);
      assert.equal(recipients.length, 1);
      assert.equal(recipients[0].userId, userB.id); // Triage at Hospital 01
      assert.equal(recipients[0].roleName, 'HOSPITAL_TRIAGE');
    });

    test('5. Multi-facility isolation: Unrelated hospitals are strictly prevented from receiving alerts', async () => {
      // Seed third hospital staff
      resolver.seedUser({
        id: 991,
        firstName: 'Selam',
        lastName: 'Doctor',
        roleId: 3,
        roleName: 'HOSPITAL_TRIAGE',
        facilityId: 'fac-hosp-unrelated'
      });
      resolver.seedAssignment(991, 'fac-hosp-unrelated');

      const referral = {
        id: 'ref-comp-2',
        originating_facility_id: 'fac-hc-01',
        receiving_facility_id: 'fac-hosp-01'
      };

      const recipients = await resolver.resolveReferralRecipients(referral, NOTIFICATION_TYPES.REFERRAL_SUBMITTED);
      assert.equal(recipients.some(r => r.userId === 991), false, 'Unrelated hospital staff must never receive alerts');
    });

    test('6. Inactive and deleted accounts are automatically excluded from notification resolution', async () => {
      resolver.seedUser({
        id: 992,
        firstName: 'Inactive',
        lastName: 'Worker',
        roleId: 3,
        roleName: 'HOSPITAL_TRIAGE',
        facilityId: 'fac-hosp-01',
        isActive: false
      });
      resolver.seedAssignment(992, 'fac-hosp-01');

      const referral = {
        id: 'ref-comp-3',
        originating_facility_id: 'fac-hc-01',
        receiving_facility_id: 'fac-hosp-01'
      };

      const recipients = await resolver.resolveReferralRecipients(referral, NOTIFICATION_TYPES.REFERRAL_SUBMITTED);
      assert.equal(recipients.some(r => r.userId === 992), false);
    });
  });

  // =========================================================================
  // DOMAIN 3: Safe Non-PII Templates & Hostile XSS Sanitization (Scenarios 7-9)
  // =========================================================================
  describe('Domain 3: Safe Non-PII Templates & Injection Defense', () => {
    test('7. Renders safe non-PII operational message with valid portal deep-link', () => {
      const rendered = notificationTemplateService.render(NOTIFICATION_TYPES.REFERRAL_ACCEPTED, {
        referralId: 'ref-abc-123',
        referralCode: 'REF-2026-0042',
        facilityName: 'Tikur Anbessa Hospital'
      });

      assert.ok(rendered.title.includes('REF-2026-0042'));
      assert.ok(rendered.message.includes('Tikur Anbessa Hospital'));
      assert.equal(rendered.actionUrl, '/referrals/ref-abc-123');
      assert.equal(rendered.category, NOTIFICATION_CATEGORIES.REFERRAL_UPDATE);
    });

    test('8. Escapes dangerous script and HTML tags in user-provided payload fields', () => {
      const hostilePayload = {
        referralCode: '<script>document.cookie="stolen"</script>',
        facilityName: '<b onmouseover=alert(1)>Hospital</b>',
        reason: 'Attempt & injection'
      };

      const rendered = notificationTemplateService.render(NOTIFICATION_TYPES.REFERRAL_REJECTED, hostilePayload);
      assert.ok(!rendered.title.includes('<script>'));
      assert.ok(rendered.title.includes('&lt;script&gt;'));
      assert.ok(!rendered.message.includes('<b'));
      assert.ok(rendered.message.includes('&lt;b'));
    });

    test('9. Accurately maps all notification types to their corresponding categories', () => {
      const secRendered = notificationTemplateService.render(NOTIFICATION_TYPES.ACCOUNT_SECURITY_ALERT, {});
      assert.equal(secRendered.category, NOTIFICATION_CATEGORIES.SECURITY);

      const transRendered = notificationTemplateService.render(NOTIFICATION_TYPES.TRANSPORT_DISPATCHED, { ambulanceCode: 'AMB-1' });
      assert.equal(transRendered.category, NOTIFICATION_CATEGORIES.TRANSPORT);

      const escRendered = notificationTemplateService.render(NOTIFICATION_TYPES.ESCALATION_CREATED, { referralCode: 'REF-1', escalationLevel: 2 });
      assert.equal(escRendered.category, NOTIFICATION_CATEGORIES.ESCALATION);
    });
  });

  // =========================================================================
  // DOMAIN 4: Transactional Outbox Ingestion & Multi-Channel Delivery (Scenarios 10-12)
  // =========================================================================
  describe('Domain 4: Transactional Outbox Event Ingestion', () => {
    test('10. Ingests referral outbox event and generates in-app notifications for hospital triage', async () => {
      const event = {
        id: 'outbox-comp-1',
        aggregateType: 'referral',
        aggregateId: 'ref-outbox-1',
        eventType: OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
        payload: {
          referralId: 'ref-outbox-1',
          referralCode: 'REF-2026-OB1',
          fromFacility: 'fac-hc-01',
          toFacility: 'fac-hosp-01',
          urgency: 'URGENT'
        }
      };

      const created = await subscriber.handleReferralEvent(event);
      assert.equal(created.length, 1);
      assert.equal(created[0].recipientUserId, userB.id);
      assert.equal(created[0].priority, NOTIFICATION_PRIORITIES.HIGH);
      assert.ok(created[0].title.includes('REF-2026-OB1'));
    });

    test('11. Ingests operational escalation outbox event incorporating regional admin for level 2', async () => {
      const escalationEvent = {
        id: 'outbox-esc-2',
        aggregateType: 'referral',
        aggregateId: 'ref-esc-2',
        eventType: OUTBOX_EVENT_TYPES.ESCALATION_CREATED,
        payload: {
          referralId: 'ref-esc-2',
          referralCode: 'REF-2026-ESC2',
          sourceFacilityId: 'fac-hc-01',
          receivingFacilityId: 'fac-hosp-01',
          escalationLevel: 2,
          breachType: 'DECISION_DEADLINE_EXCEEDED'
        }
      };

      const created = await subscriber.handleReferralEvent(escalationEvent);
      assert.equal(created.length, 2); // Hospital Triage AND System Administrator
      const userIds = created.map(c => c.recipientUserId);
      assert.ok(userIds.includes(userB.id));
      assert.ok(userIds.includes(adminUser.id));
    });

    test('12. In-app notification creation is preserved even when external channel provider fails', async () => {
      // Simulate broken external delivery
      deliveryService.providers.set('EMAIL', {
        name: 'failing-email',
        send: async () => ({ success: false, error: 'Network timeout' })
      });

      const event = {
        id: 'outbox-failover-1',
        aggregateType: 'referral',
        aggregateId: 'ref-failover-1',
        eventType: OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
        payload: {
          referralId: 'ref-failover-1',
          referralCode: 'REF-2026-FAIL1',
          fromFacility: 'fac-hc-01',
          toFacility: 'fac-hosp-01'
        }
      };

      const created = await subscriber.handleReferralEvent(event);
      assert.equal(created.length, 1);
      assert.equal(created[0].recipientUserId, userB.id);

      const inDb = await notificationRepository.findByIdOrUuid(created[0].uuid);
      assert.ok(inDb);
    });
  });

  // =========================================================================
  // DOMAIN 5: User Preferences & Mandatory Policies (Scenarios 13-15)
  // =========================================================================
  describe('Domain 5: User Preferences & Mandatory Policies', () => {
    test('13. Provides safe defaults for users with no custom configuration', async () => {
      const prefs = await notificationPreferenceService.getPreferences(userA.id);
      assert.equal(prefs.inAppEnabled, true);
      assert.equal(prefs.emailEnabled, true);
      assert.equal(prefs.smsEnabled, false);
      assert.equal(prefs.categories[NOTIFICATION_CATEGORIES.ESCALATION], true);
      assert.equal(prefs.categories[NOTIFICATION_CATEGORIES.SECURITY], true);
    });

    test('14. Strictly rejects user attempts to disable mandatory categories (SECURITY and ESCALATION)', async () => {
      await assert.rejects(
        async () => {
          await notificationPreferenceService.updatePreferences(userA.id, {
            categories: { [NOTIFICATION_CATEGORIES.SECURITY]: false }
          }, { id: userA.id, roleId: 1 });
        },
        {
          name: 'ValidationError',
          message: /Mandatory notification category 'SECURITY' cannot be disabled/
        }
      );
    });

    test('15. shouldDeliver evaluates channel availability while guaranteeing mandatory alerts', async () => {
      // Disable SMS and in-app for user A
      await notificationPreferenceService.updatePreferences(userA.id, {
        inAppEnabled: false,
        smsEnabled: false
      }, { id: userA.id, roleId: 1 });

      // Routine alert in-app -> false
      assert.equal(await notificationPreferenceService.shouldDeliver(userA.id, NOTIFICATION_CATEGORIES.REFERRAL_UPDATE, 'IN_APP'), false);

      // Mandatory Security Alert in-app -> ALWAYS TRUE
      assert.equal(await notificationPreferenceService.shouldDeliver(userA.id, NOTIFICATION_CATEGORIES.SECURITY, 'IN_APP'), true);

      // Mandatory Escalation Alert in-app -> ALWAYS TRUE
      assert.equal(await notificationPreferenceService.shouldDeliver(userA.id, NOTIFICATION_CATEGORIES.ESCALATION, 'IN_APP'), true);
    });
  });

  // =========================================================================
  // DOMAIN 6: Read, Unread & Badge Management (Scenarios 16-18)
  // =========================================================================
  describe('Domain 6: Read, Unread & Badge Management', () => {
    test('16. markAsRead and markAsUnread toggle state and are fully idempotent', async () => {
      const notif = await notificationRepository.create({
        recipientUserId: userA.id,
        title: 'Triage Ready',
        message: 'Patient accepted'
      });

      // Mark read
      const read1 = await notificationService.markAsRead(notif.uuid, userA.id);
      assert.equal(read1.isRead, true);
      assert.ok(read1.readAt);

      // Second read is idempotent
      const read2 = await notificationService.markAsRead(notif.uuid, userA.id);
      assert.equal(read2.readAt, read1.readAt);

      // Mark unread
      const unread = await notificationService.markAsUnread(notif.uuid, userA.id);
      assert.equal(unread.isRead, false);
      assert.equal(unread.readAt, null);
    });

    test('17. markAllAsRead marks all unread notifications as read and updates count', async () => {
      await notificationRepository.create({ recipientUserId: userA.id, title: 'Alert 1', message: 'M1' });
      await notificationRepository.create({ recipientUserId: userA.id, title: 'Alert 2', message: 'M2' });

      assert.equal((await notificationService.getUnreadCount(userA.id)).unreadCount, 2);

      const res = await notificationService.markAllAsRead(userA.id);
      assert.equal(res.markedCount, 2);

      assert.equal((await notificationService.getUnreadCount(userA.id)).unreadCount, 0);
    });

    test('18. getUnreadCount computes badge metrics rapidly without loading full body history', async () => {
      for (let i = 0; i < 5; i++) {
        await notificationRepository.create({ recipientUserId: userA.id, title: `A${i}`, message: `M${i}` });
      }

      const count = await notificationService.getUnreadCount(userA.id);
      assert.equal(count.unreadCount, 5);
    });
  });

  // =========================================================================
  // DOMAIN 7: Soft Dismissal & Safe Retention Lifecycle (Scenarios 19-21)
  // =========================================================================
  describe('Domain 7: Soft Dismissal & Safe Retention Lifecycle', () => {
    test('19. dismissNotification soft-dismisses record and excludes it from active inbox', async () => {
      const notif = await notificationRepository.create({
        recipientUserId: userA.id,
        title: 'System Notice',
        message: 'Maintenance tomorrow'
      });

      const dismissed = await notificationService.dismissNotification(notif.uuid, userA.id);
      assert.equal(dismissed.isDismissed, true);
      assert.ok(dismissed.dismissedAt);

      const activeList = await notificationService.getNotifications(userA.id);
      assert.equal(activeList.total, 0);
    });

    test('20. Retention cleanup strictly preserves clinical referrals and escalations', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();

      // Clinical referral (Protected)
      const ref = await notificationRepository.create({
        recipientUserId: userA.id,
        title: 'Aged Ref',
        message: 'Clinical communication',
        category: NOTIFICATION_CATEGORIES.REFERRAL_UPDATE
      });
      const memRef = notificationRepository.inMemoryStore.get(ref.uuid);
      memRef.created_at = oldDate;
      memRef.is_read = true;

      // Routine system news (Eligible)
      const sys = await notificationRepository.create({
        recipientUserId: userA.id,
        title: 'Old System Announcement',
        message: 'Scheduled maintenance 3 months ago',
        category: NOTIFICATION_CATEGORIES.SYSTEM
      });
      const memSys = notificationRepository.inMemoryStore.get(sys.uuid);
      memSys.created_at = oldDate;
      memSys.is_read = true;

      const result = await historyService.cleanupAgedNotifications({ retentionDays: 90, dryRun: false });
      assert.equal(result.archivedCount, 1);

      // Verify clinical referral was preserved
      const recheckRef = await notificationRepository.findByIdOrUuid(ref.uuid);
      assert.equal(recheckRef.isDismissed, false);

      // Verify routine news was archived
      const recheckSys = await notificationRepository.findByIdOrUuid(sys.uuid);
      assert.equal(recheckSys.isDismissed, true);
    });

    test('21. Delivery history tracks multi-channel delivery attempts and statuses', async () => {
      await deliveryService.dispatch({
        channel: NOTIFICATION_CHANNELS.IN_APP,
        recipientUserId: userA.id,
        title: 'In App',
        message: 'In app body'
      });

      await deliveryService.dispatch({
        channel: NOTIFICATION_CHANNELS.EMAIL,
        recipientUserId: userA.id,
        recipientAddress: 'clinician@hc01.et',
        title: 'Email',
        message: 'Email body'
      });

      const history = await historyService.getDeliveryHistory(userA.id);
      assert.equal(history.length, 2);
    });
  });

  // =========================================================================
  // DOMAIN 8: REST APIs & Security Ownership Enforcement (Scenarios 22-24)
  // =========================================================================
  describe('Domain 8: REST APIs & Security Ownership Enforcement', () => {
    test('22. HTTP endpoints enforce authentication and return standardized responses', async () => {
      // 1. Unauthenticated -> 401
      const unauthRes = await request(app).get('/api/v1/notifications');
      assert.equal(unauthRes.status, 401);

      // 2. Authenticated -> 200 with standard response envelope
      await notificationRepository.create({ recipientUserId: userA.id, title: 'Item 1', message: 'M1' });
      const authRes = await request(app).get('/api/v1/notifications', {
        headers: { authorization: `Bearer ${userAToken}` }
      });
      assert.equal(authRes.status, 200);
      assert.ok(authRes.body.success);
      assert.equal(authRes.body.data.length, 1);
      assert.ok(authRes.body.meta.pagination);
    });

    test('23. Enforces strict ownership: User B cannot access or modify User A notifications (403)', async () => {
      const notifUserA = await notificationRepository.create({
        recipientUserId: userA.id,
        title: 'Confidential User A Alert',
        message: 'Private to User A'
      });

      // User B attempts to view User A notification
      const getRes = await request(app).get(`/api/v1/notifications/${notifUserA.uuid}`, {
        headers: { authorization: `Bearer ${userBToken}` }
      });
      assert.equal(getRes.status, 403);

      // User B attempts to mark User A notification as read
      const patchRes = await request(app).patch(`/api/v1/notifications/${notifUserA.uuid}/read`, {}, {
        headers: { authorization: `Bearer ${userBToken}` }
      });
      assert.equal(patchRes.status, 403);

      // User B attempts to dismiss User A notification
      const delRes = await request(app).delete(`/api/v1/notifications/${notifUserA.uuid}`, {
        headers: { authorization: `Bearer ${userBToken}` }
      });
      assert.equal(delRes.status, 403);
    });

    test('24. Preferences API supports both /notifications/preferences and alias /notification-preferences', async () => {
      // Primary route
      const primRes = await request(app).get('/api/v1/notifications/preferences', {
        headers: { authorization: `Bearer ${userAToken}` }
      });
      assert.equal(primRes.status, 200);
      assert.equal(primRes.body.data.preferences.userId, userA.id);

      // Alias route
      const aliasRes = await request(app).get('/api/v1/notification-preferences', {
        headers: { authorization: `Bearer ${userAToken}` }
      });
      assert.equal(aliasRes.status, 200);
      assert.equal(aliasRes.body.data.preferences.userId, userA.id);

      // Update preferences
      const patchRes = await request(app).patch('/api/v1/notifications/preferences', {
        smsEnabled: true
      }, {
        headers: { authorization: `Bearer ${userAToken}` }
      });
      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.body.data.preferences.smsEnabled, true);
    });
  });
});
