/**
 * CareConnect Ethiopia - In-App Notification Center API Tests
 * Verifies HTTP endpoints for notifications, unread metrics, read/unread state changes,
 * soft dismissals, and preference management under /api/v1/notifications — Commit 102.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import { notificationRepository } from '../src/repositories/notificationRepository.js';
import { notificationPreferenceService } from '../src/services/notificationPreferenceService.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES
} from '../src/constants/notifications.js';

describe('Commit 102: Notification Center APIs Suite', () => {
  let userAToken;
  let userBToken;
  let userAId;
  let userBId;

  beforeEach(async () => {
    notificationRepository.clearInMemory();
    notificationPreferenceService.clearInMemory();
    UserModel.clearMockUsers();

    const userA = await UserModel.create({
      email: 'doctor.a@careconnect.et',
      firstName: 'Doctor',
      lastName: 'One',
      roleId: 1
    });
    userAId = userA.id;
    userAToken = generateAccessToken(userA);

    const userB = await UserModel.create({
      email: 'doctor.b@careconnect.et',
      firstName: 'Doctor',
      lastName: 'Two',
      roleId: 2
    });
    userBId = userB.id;
    userBToken = generateAccessToken(userB);
  });

  test('1. Rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/notifications');
    assert.equal(res.status, 401);
  });

  test('2. GET /api/v1/notifications returns paginated list of notifications', async () => {
    await notificationRepository.create({
      recipientUserId: userAId,
      title: 'Alert A1',
      message: 'Message A1',
      category: NOTIFICATION_CATEGORIES.REFERRAL_UPDATE
    });
    await notificationRepository.create({
      recipientUserId: userAId,
      title: 'Alert A2',
      message: 'Message A2',
      category: NOTIFICATION_CATEGORIES.COORDINATION
    });

    const res = await request(app).get('/api/v1/notifications', {
      headers: { authorization: `Bearer ${userAToken}` }
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.success);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.meta.pagination.total, 2);
  });

  test('3. GET /api/v1/notifications/unread-count returns accurate unread count', async () => {
    await notificationRepository.create({ recipientUserId: userAId, title: 'N1', message: 'M1' });
    await notificationRepository.create({ recipientUserId: userAId, title: 'N2', message: 'M2' });

    const res = await request(app).get('/api/v1/notifications/unread-count', {
      headers: { authorization: `Bearer ${userAToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.unreadCount, 2);
  });

  test('4. GET /api/v1/notifications/:id allows owner and forbids non-owner (403)', async () => {
    const notif = await notificationRepository.create({
      recipientUserId: userAId,
      title: 'Confidential Triage Alert',
      message: 'Exclusive to user A'
    });

    // Owner access -> 200
    const ownerRes = await request(app).get(`/api/v1/notifications/${notif.uuid}`, {
      headers: { authorization: `Bearer ${userAToken}` }
    });
    assert.equal(ownerRes.status, 200);
    assert.equal(ownerRes.body.data.notification.uuid, notif.uuid);

    // Non-owner access -> 403
    const nonOwnerRes = await request(app).get(`/api/v1/notifications/${notif.uuid}`, {
      headers: { authorization: `Bearer ${userBToken}` }
    });
    assert.equal(nonOwnerRes.status, 403);
  });

  test('5. PATCH /:id/read and PATCH /:id/unread toggle read status', async () => {
    const notif = await notificationRepository.create({
      recipientUserId: userAId,
      title: 'Triage Pending',
      message: 'Urgent referral'
    });

    // Mark read
    const readRes = await request(app).patch(`/api/v1/notifications/${notif.uuid}/read`, {}, {
      headers: { authorization: `Bearer ${userAToken}` }
    });
    assert.equal(readRes.status, 200);
    assert.equal(readRes.body.data.notification.isRead, true);

    // Mark unread
    const unreadRes = await request(app).patch(`/api/v1/notifications/${notif.uuid}/unread`, {}, {
      headers: { authorization: `Bearer ${userAToken}` }
    });
    assert.equal(unreadRes.status, 200);
    assert.equal(unreadRes.body.data.notification.isRead, false);
  });

  test('6. PATCH /api/v1/notifications/read-all marks all unread as read', async () => {
    await notificationRepository.create({ recipientUserId: userAId, title: 'Item 1', message: 'M1' });
    await notificationRepository.create({ recipientUserId: userAId, title: 'Item 2', message: 'M2' });

    const res = await request(app).patch('/api/v1/notifications/read-all', {}, {
      headers: { authorization: `Bearer ${userAToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.markedCount, 2);

    const checkRes = await request(app).get('/api/v1/notifications/unread-count', {
      headers: { authorization: `Bearer ${userAToken}` }
    });
    assert.equal(checkRes.body.data.unreadCount, 0);
  });

  test('7. DELETE /api/v1/notifications/:id soft-dismisses notification', async () => {
    const notif = await notificationRepository.create({
      recipientUserId: userAId,
      title: 'Dismiss Target',
      message: 'Will be dismissed'
    });

    const delRes = await request(app).delete(`/api/v1/notifications/${notif.uuid}`, {
      headers: { authorization: `Bearer ${userAToken}` }
    });
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.data.notification.isDismissed, true);

    const listRes = await request(app).get('/api/v1/notifications', {
      headers: { authorization: `Bearer ${userAToken}` }
    });
    assert.equal(listRes.body.data.length, 0);
  });

  test('8. Preferences APIs: GET and PATCH /preferences with validation', async () => {
    // 1. Get default preferences
    const getRes = await request(app).get('/api/v1/notifications/preferences', {
      headers: { authorization: `Bearer ${userAToken}` }
    });
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.preferences.inAppEnabled, true);

    // 2. Also test alias /api/v1/notification-preferences
    const aliasRes = await request(app).get('/api/v1/notification-preferences', {
      headers: { authorization: `Bearer ${userAToken}` }
    });
    assert.equal(aliasRes.status, 200);

    // 3. Update optional preferences
    const patchRes = await request(app).patch('/api/v1/notifications/preferences', {
      smsEnabled: true
    }, {
      headers: { authorization: `Bearer ${userAToken}` }
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.preferences.smsEnabled, true);

    // 4. Attempt to disable mandatory category fails with 400 Validation Error
    const invalidRes = await request(app).patch('/api/v1/notifications/preferences', {
      categories: { [NOTIFICATION_CATEGORIES.SECURITY]: false }
    }, {
      headers: { authorization: `Bearer ${userAToken}` }
    });
    assert.equal(invalidRes.status, 400);
  });
});
