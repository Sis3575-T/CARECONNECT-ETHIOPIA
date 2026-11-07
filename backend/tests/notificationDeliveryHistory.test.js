/**
 * CareConnect Ethiopia - Notification Delivery History & Retention Tests
 * Verifies delivery attempt tracking, channel status history, and safe retention
 * lifecycle management with clinical data protection — Commit 103.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NotificationHistoryService } from '../src/services/notificationHistoryService.js';
import { NotificationDeliveryService } from '../src/services/notificationDeliveryService.js';
import { NotificationRepository } from '../src/repositories/notificationRepository.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES
} from '../src/constants/notifications.js';
import { NOTIFICATION_CHANNELS, DELIVERY_STATUS } from '../src/constants/jobs.js';

describe('Commit 103: Notification Delivery History & Retention Suite', () => {
  let deliveryService;
  let repo;
  let historyService;

  beforeEach(() => {
    deliveryService = new NotificationDeliveryService();
    repo = new NotificationRepository();
    historyService = new NotificationHistoryService({ deliveryService, repo });
  });

  test('1. Tracks delivery history across multiple channels for a user', async () => {
    // Deliver In-App
    await deliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.IN_APP,
      recipientUserId: 501,
      title: 'In-app Alert',
      message: 'Hello in-app'
    });

    // Deliver SMS
    await deliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.SMS,
      recipientUserId: 501,
      recipientAddress: '+251911223344',
      message: 'Hello SMS'
    });

    // Deliver Email
    await deliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.EMAIL,
      recipientUserId: 501,
      recipientAddress: 'doctor@careconnect.et',
      title: 'Email alert',
      message: 'Hello Email'
    });

    const history = await historyService.getDeliveryHistory(501);
    assert.equal(history.length, 3);
  });

  test('2. Filters delivery history by channel and status', async () => {
    await deliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.SMS,
      recipientUserId: 502,
      recipientAddress: '+251911556677',
      message: 'SMS message'
    });

    await deliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.EMAIL,
      recipientUserId: 502,
      recipientAddress: 'nurse@careconnect.et',
      title: 'Email title',
      message: 'Email body'
    });

    const smsOnly = await historyService.getDeliveryHistory(502, { channel: NOTIFICATION_CHANNELS.SMS });
    assert.equal(smsOnly.length, 1);
    assert.equal(smsOnly[0].channel, NOTIFICATION_CHANNELS.SMS);

    const sentOnly = await historyService.getDeliveryHistory(502, { status: DELIVERY_STATUS.SENT });
    assert.equal(sentOnly.length, 2);
  });

  test('3. Retention cleanup dry-run identifies aged routine items without mutating', async () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(); // 100 days old

    // Aged, read, routine system announcement
    const agedNotif = await repo.create({
      recipientUserId: 503,
      title: 'Old Announcement',
      message: 'Old maintenance notice',
      category: NOTIFICATION_CATEGORIES.SYSTEM
    });
    const memNotif = repo.inMemoryStore.get(agedNotif.uuid);
    memNotif.created_at = oldDate;
    memNotif.is_read = true;

    // Run dry-run cleanup
    const result = await historyService.cleanupAgedNotifications({ retentionDays: 90, dryRun: true });
    assert.equal(result.eligible, 1);
    assert.equal(result.archivedCount, 0);
    assert.equal(result.dryRun, true);

    // Verify record was not modified
    const recheck = await repo.findByIdOrUuid(agedNotif.uuid);
    assert.equal(recheck.isDismissed, false);
  });

  test('4. Retention cleanup strictly protects clinical referrals, escalations, and unread items', async () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Aged clinical referral update (Protected!)
    const refNotif = await repo.create({
      recipientUserId: 504,
      title: 'Aged Referral',
      message: 'Referral history',
      category: NOTIFICATION_CATEGORIES.REFERRAL_UPDATE
    });
    const memRef = repo.inMemoryStore.get(refNotif.uuid);
    memRef.created_at = oldDate;
    memRef.is_read = true;

    // 2. Aged escalation alert (Protected!)
    const escNotif = await repo.create({
      recipientUserId: 504,
      title: 'Aged Escalation',
      message: 'Escalation history',
      category: NOTIFICATION_CATEGORIES.ESCALATION
    });
    const memEsc = repo.inMemoryStore.get(escNotif.uuid);
    memEsc.created_at = oldDate;
    memEsc.is_read = true;

    // 3. Aged unread announcement (Protected because unread!)
    const unreadNotif = await repo.create({
      recipientUserId: 504,
      title: 'Unread News',
      message: 'Never read',
      category: NOTIFICATION_CATEGORIES.SYSTEM
    });
    const memUnread = repo.inMemoryStore.get(unreadNotif.uuid);
    memUnread.created_at = oldDate;
    memUnread.is_read = false;

    // 4. Aged read routine system announcement (Eligible for archival)
    const routineNotif = await repo.create({
      recipientUserId: 504,
      title: 'Routine News',
      message: 'Read news',
      category: NOTIFICATION_CATEGORIES.SYSTEM
    });
    const memRoutine = repo.inMemoryStore.get(routineNotif.uuid);
    memRoutine.created_at = oldDate;
    memRoutine.is_read = true;

    const cleanupResult = await historyService.cleanupAgedNotifications({ retentionDays: 90, dryRun: false });

    assert.equal(cleanupResult.eligible, 1);
    assert.equal(cleanupResult.archivedCount, 1);

    // Verify protected items remain active
    assert.equal((await repo.findByIdOrUuid(refNotif.uuid)).isDismissed, false);
    assert.equal((await repo.findByIdOrUuid(escNotif.uuid)).isDismissed, false);
    assert.equal((await repo.findByIdOrUuid(unreadNotif.uuid)).isDismissed, false);

    // Verify routine item was soft-archived
    assert.equal((await repo.findByIdOrUuid(routineNotif.uuid)).isDismissed, true);
  });
});
