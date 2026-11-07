/**
 * CareConnect Ethiopia - In-App Notification Center Data Architecture Tests
 * Verifies repository storage, UUID assignment, categorization,
 * deduplication, and read/unread lifecycle states — Commit 097.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { notificationRepository } from '../src/repositories/notificationRepository.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES
} from '../src/constants/notifications.js';

describe('Commit 097: In-App Notification Data Architecture Suite', () => {
  beforeEach(() => {
    notificationRepository.clearInMemory();
  });

  test('1. Creates notification record with UUID, category, priority, and metadata', async () => {
    const notif = await notificationRepository.create({
      recipientUserId: 101,
      recipientFacilityId: 'fac-hc-01',
      recipientRole: 'HEALTH_CENTRE_STAFF',
      title: 'Referral Acknowledged',
      message: 'Referral REF-2026-001 has been acknowledged by Tikur Anbessa Hospital.',
      notificationType: NOTIFICATION_TYPES.REFERRAL_ACKNOWLEDGED,
      category: NOTIFICATION_CATEGORIES.REFERRAL_UPDATE,
      entityType: 'referral',
      entityId: 'ref-001',
      priority: NOTIFICATION_PRIORITIES.HIGH,
      metadata: { referralCode: 'REF-2026-001', hospitalName: 'Tikur Anbessa' }
    });

    assert.ok(notif.id);
    assert.ok(notif.uuid);
    assert.equal(notif.recipientUserId, 101);
    assert.equal(notif.recipientFacilityId, 'fac-hc-01');
    assert.equal(notif.category, NOTIFICATION_CATEGORIES.REFERRAL_UPDATE);
    assert.equal(notif.priority, NOTIFICATION_PRIORITIES.HIGH);
    assert.equal(notif.isRead, false);
    assert.equal(notif.readAt, null);
    assert.equal(notif.isDismissed, false);
    assert.equal(notif.metadata.referralCode, 'REF-2026-001');
  });

  test('2. Deduplication key prevents duplicate notifications for the same user and event', async () => {
    const dedupKey = 'referral:ref-002:SUBMITTED';

    const notif1 = await notificationRepository.create({
      recipientUserId: 102,
      title: 'New Referral Submitted',
      message: 'A new referral has been submitted.',
      notificationType: NOTIFICATION_TYPES.REFERRAL_SUBMITTED,
      deduplicationKey: dedupKey
    });

    const notif2 = await notificationRepository.create({
      recipientUserId: 102,
      title: 'New Referral Submitted (Duplicate)',
      message: 'Duplicate event attempt.',
      notificationType: NOTIFICATION_TYPES.REFERRAL_SUBMITTED,
      deduplicationKey: dedupKey
    });

    assert.equal(notif1.uuid, notif2.uuid);
    assert.equal(notificationRepository.inMemoryStore.size, 1);
  });

  test('3. Filters notifications by read status and category', async () => {
    await notificationRepository.create({
      recipientUserId: 103,
      title: 'Referral Update',
      message: 'Status updated',
      category: NOTIFICATION_CATEGORIES.REFERRAL_UPDATE
    });

    const unreadSec = await notificationRepository.create({
      recipientUserId: 103,
      title: 'Security Notice',
      message: 'New login detected',
      category: NOTIFICATION_CATEGORIES.SECURITY
    });

    // Mark referral notification as read
    const all = await notificationRepository.listByRecipient(103);
    const refNotif = all.items.find(n => n.category === NOTIFICATION_CATEGORIES.REFERRAL_UPDATE);
    await notificationRepository.markAsRead(refNotif.uuid, 103);

    // Query unread only
    const unreadResult = await notificationRepository.listByRecipient(103, { isRead: false });
    assert.equal(unreadResult.total, 1);
    assert.equal(unreadResult.items[0].uuid, unreadSec.uuid);

    // Query specific category
    const secResult = await notificationRepository.listByRecipient(103, {
      category: NOTIFICATION_CATEGORIES.SECURITY
    });
    assert.equal(secResult.total, 1);
    assert.equal(secResult.items[0].category, NOTIFICATION_CATEGORIES.SECURITY);
  });

  test('4. Fast count of unread and active notifications', async () => {
    await notificationRepository.create({ recipientUserId: 104, title: 'Alert 1', message: 'M1' });
    const n2 = await notificationRepository.create({ recipientUserId: 104, title: 'Alert 2', message: 'M2' });
    await notificationRepository.create({ recipientUserId: 104, title: 'Alert 3', message: 'M3' });

    assert.equal(await notificationRepository.countUnread(104), 3);

    // Mark one as read
    await notificationRepository.markAsRead(n2.uuid, 104);
    assert.equal(await notificationRepository.countUnread(104), 2);

    // Dismiss one
    await notificationRepository.dismiss(n2.uuid, 104);
    assert.equal(await notificationRepository.countUnread(104), 2);
  });

  test('5. Enforces recipient ownership on markAsRead and dismiss', async () => {
    const notif = await notificationRepository.create({
      recipientUserId: 105,
      title: 'Confidential Alert',
      message: 'Sensitive operational alert'
    });

    // User 999 attempts to mark user 105 notification as read
    const unauthorizedRead = await notificationRepository.markAsRead(notif.uuid, 999);
    assert.equal(unauthorizedRead, null);

    const recheck = await notificationRepository.findByIdOrUuid(notif.uuid);
    assert.equal(recheck.isRead, false);

    // Legitimate owner marks as read
    const authorizedRead = await notificationRepository.markAsRead(notif.uuid, 105);
    assert.ok(authorizedRead);
    assert.equal(authorizedRead.isRead, true);
    assert.ok(authorizedRead.readAt);
  });

  test('6. Soft dismiss archives notification without deleting data', async () => {
    const notif = await notificationRepository.create({
      recipientUserId: 106,
      title: 'System Notice',
      message: 'Routine update'
    });

    const dismissed = await notificationRepository.dismiss(notif.uuid, 106);
    assert.ok(dismissed);
    assert.equal(dismissed.isDismissed, true);
    assert.ok(dismissed.dismissedAt);

    // Excluded from standard active list
    const activeList = await notificationRepository.listByRecipient(106, { isDismissed: false });
    assert.equal(activeList.total, 0);

    // Included when querying dismissed explicitly
    const dismissedList = await notificationRepository.listByRecipient(106, { isDismissed: true });
    assert.equal(dismissedList.total, 1);
  });
});
