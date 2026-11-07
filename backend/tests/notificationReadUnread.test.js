/**
 * CareConnect Ethiopia - In-App Notification Read/Unread Management Unit Tests
 * Verifies read states, unread counts, mark-all-read operations,
 * soft dismissal, idempotency, and recipient ownership boundaries — Commit 101.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NotificationService } from '../src/services/notificationService.js';
import { NotificationRepository } from '../src/repositories/notificationRepository.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES
} from '../src/constants/notifications.js';

describe('Commit 101: Notification Read and Unread Management Suite', () => {
  let repo;
  let service;

  beforeEach(() => {
    repo = new NotificationRepository();
    service = new NotificationService(repo);
  });

  test('1. Retrieves unread notifications and fast unread badge count', async () => {
    await repo.create({
      recipientUserId: 401,
      title: 'Alert 1',
      message: 'Unread 1',
      notificationType: NOTIFICATION_TYPES.REFERRAL_SUBMITTED
    });

    await repo.create({
      recipientUserId: 401,
      title: 'Alert 2',
      message: 'Unread 2',
      notificationType: NOTIFICATION_TYPES.COORDINATION_TASK_ASSIGNED
    });

    const countRes = await service.getUnreadCount(401);
    assert.equal(countRes.unreadCount, 2);

    const unreadList = await service.getUnreadNotifications(401);
    assert.equal(unreadList.total, 2);
    assert.equal(unreadList.items.length, 2);
  });

  test('2. markAsRead updates read timestamp and is idempotent upon repeated calls', async () => {
    const notif = await repo.create({
      recipientUserId: 402,
      title: 'Referral Received',
      message: 'Review pending'
    });

    // First mark as read
    const readResult = await service.markAsRead(notif.uuid, 402);
    assert.equal(readResult.isRead, true);
    assert.ok(readResult.readAt);

    // Second call is idempotent
    const secondCall = await service.markAsRead(notif.uuid, 402);
    assert.equal(secondCall.isRead, true);
    assert.equal(secondCall.readAt, readResult.readAt);

    // Unread count decremented to 0
    const countRes = await service.getUnreadCount(402);
    assert.equal(countRes.unreadCount, 0);
  });

  test('3. markAsUnread resets read state and is idempotent', async () => {
    const notif = await repo.create({
      recipientUserId: 403,
      title: 'Escalation Alert',
      message: 'Urgent SLA'
    });

    await service.markAsRead(notif.uuid, 403);
    assert.equal((await service.getUnreadCount(403)).unreadCount, 0);

    const unreadResult = await service.markAsUnread(notif.uuid, 403);
    assert.equal(unreadResult.isRead, false);
    assert.equal(unreadResult.readAt, null);

    assert.equal((await service.getUnreadCount(403)).unreadCount, 1);
  });

  test('4. markAllAsRead marks all eligible unread notifications as read', async () => {
    await repo.create({ recipientUserId: 404, title: 'Notice A', message: 'A' });
    await repo.create({ recipientUserId: 404, title: 'Notice B', message: 'B' });
    await repo.create({ recipientUserId: 404, title: 'Notice C', message: 'C' });

    assert.equal((await service.getUnreadCount(404)).unreadCount, 3);

    const result = await service.markAllAsRead(404);
    assert.equal(result.markedCount, 3);

    assert.equal((await service.getUnreadCount(404)).unreadCount, 0);
  });

  test('5. markAllAsRead respects optional category filter', async () => {
    await repo.create({
      recipientUserId: 405,
      title: 'Referral Notice',
      message: 'Ref',
      category: NOTIFICATION_CATEGORIES.REFERRAL_UPDATE
    });

    await repo.create({
      recipientUserId: 405,
      title: 'Security Alert',
      message: 'Sec',
      category: NOTIFICATION_CATEGORIES.SECURITY
    });

    // Mark only REFERRAL_UPDATE as read
    const result = await service.markAllAsRead(405, { category: NOTIFICATION_CATEGORIES.REFERRAL_UPDATE });
    assert.equal(result.markedCount, 1);

    // Security alert remains unread
    assert.equal((await service.getUnreadCount(405)).unreadCount, 1);
    const unread = await service.getUnreadNotifications(405);
    assert.equal(unread.items[0].category, NOTIFICATION_CATEGORIES.SECURITY);
  });

  test('6. dismissNotification soft-dismisses record and excludes it from active views', async () => {
    const notif = await repo.create({
      recipientUserId: 406,
      title: 'Dismissable Announcement',
      message: 'Routine news'
    });

    assert.equal((await service.getUnreadCount(406)).unreadCount, 1);

    const dismissed = await service.dismissNotification(notif.uuid, 406);
    assert.equal(dismissed.isDismissed, true);
    assert.ok(dismissed.dismissedAt);

    // Dismissed unread notification is no longer counted in badge
    assert.equal((await service.getUnreadCount(406)).unreadCount, 0);

    const activeList = await service.getNotifications(406);
    assert.equal(activeList.total, 0);
  });

  test('7. Enforces strict recipient ownership on all individual operations', async () => {
    const notifUserA = await repo.create({
      recipientUserId: 407,
      title: 'Private Clinical Alert',
      message: 'Belongs strictly to user 407'
    });

    // User 408 attempts to read User 407's notification
    await assert.rejects(
      async () => {
        await service.markAsRead(notifUserA.uuid, 408);
      },
      {
        name: 'ForbiddenError',
        message: /You cannot mark another user notification as read/
      }
    );

    // User 408 attempts to unread User 407's notification
    await assert.rejects(
      async () => {
        await service.markAsUnread(notifUserA.uuid, 408);
      },
      {
        name: 'ForbiddenError',
        message: /You cannot modify another user notification/
      }
    );

    // User 408 attempts to dismiss User 407's notification
    await assert.rejects(
      async () => {
        await service.dismissNotification(notifUserA.uuid, 408);
      },
      {
        name: 'ForbiddenError',
        message: /You cannot dismiss another user notification/
      }
    );

    // User 408 attempts to get User 407's notification by ID
    await assert.rejects(
      async () => {
        await service.getNotificationById(notifUserA.uuid, 408);
      },
      {
        name: 'ForbiddenError',
        message: /You do not have permission to view this notification/
      }
    );
  });
});
