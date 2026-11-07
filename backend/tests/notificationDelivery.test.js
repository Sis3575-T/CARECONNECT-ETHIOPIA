/**
 * CareConnect Ethiopia - Notification Delivery Infrastructure Unit Tests
 * Verifies multi-channel dispatch (IN_APP, EMAIL, SMS), deduplication, provider abstraction,
 * PII sanitization in notifications, and failure tracking.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { notificationDeliveryService } from '../src/services/notificationDeliveryService.js';
import { emailNotificationProvider } from '../src/services/notificationProviders/emailProvider.js';
import { smsNotificationProvider } from '../src/services/notificationProviders/smsProvider.js';
import { NOTIFICATION_CHANNELS, DELIVERY_STATUS } from '../src/constants/jobs.js';

describe('Notification Delivery Infrastructure — Commit 094', () => {
  beforeEach(() => {
    notificationDeliveryService.clearInMemory();
    emailNotificationProvider.clearSent();
    smsNotificationProvider.clearSent();
  });

  test('dispatch delivers IN_APP notification and creates delivery record', async () => {
    const delivery = await notificationDeliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.IN_APP,
      recipientUserId: 15,
      title: 'Referral Submitted',
      message: 'New referral REF-2026-0012 received from Bole Health Centre',
      entityType: 'referral',
      entityId: 'ref-012',
      priority: 'HIGH'
    });

    assert.ok(delivery.id);
    assert.equal(delivery.channel, NOTIFICATION_CHANNELS.IN_APP);
    assert.equal(delivery.status, DELIVERY_STATUS.SENT);
    assert.ok(delivery.providerMessageId);
  });

  test('dispatch delivers EMAIL without exposing patient diagnosis, includes portal link', async () => {
    const delivery = await notificationDeliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.EMAIL,
      recipientAddress: 'doctor.hanna@tikuranbessa.et',
      title: 'Action Required: Pending Referral',
      message: 'Referral REF-2026-0042 awaiting surgical review',
      entityType: 'referral',
      entityId: 'ref-0042'
    });

    assert.equal(delivery.status, DELIVERY_STATUS.SENT);
    assert.equal(emailNotificationProvider.sentEmails.length, 1);

    const sent = emailNotificationProvider.sentEmails[0];
    assert.equal(sent.to, 'doctor.hanna@tikuranbessa.et');
    assert.match(sent.body, /https:\/\/portal\.careconnect\.et\/referrals\/ref-0042/);
    assert.ok(!sent.body.includes('patient diagnosis'), 'Must not expose raw clinical diagnoses');
  });

  test('dispatch delivers SMS with concise non-PII format', async () => {
    const delivery = await notificationDeliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.SMS,
      recipientAddress: '+251911223344',
      title: 'Emergency Referral Received',
      entityType: 'referral',
      entityId: 'REF-2026-0099'
    });

    assert.equal(delivery.status, DELIVERY_STATUS.SENT);
    assert.equal(smsNotificationProvider.sentMessages.length, 1);

    const sent = smsNotificationProvider.sentMessages[0];
    assert.equal(sent.to, '+251911223344');
    assert.match(sent.text, /CareConnect Ethiopia: Emergency Referral Received/);
    assert.match(sent.text, /REF-2026-0099/);
  });

  test('Deduplication prevents duplicate notification dispatch for same event', async () => {
    const dedupKey = 'notif-dedup-key-777';

    const first = await notificationDeliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.SMS,
      recipientAddress: '+251912345678',
      title: 'Ambulance Dispatched',
      deduplicationKey: dedupKey
    });

    const second = await notificationDeliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.SMS,
      recipientAddress: '+251912345678',
      title: 'Ambulance Dispatched',
      deduplicationKey: dedupKey
    });

    assert.equal(first.id, second.id, 'Must return the same delivery entity');
    assert.equal(smsNotificationProvider.sentMessages.length, 1, 'Provider must only send once');
  });

  test('Invalid recipient address flags delivery as FAILED with error message', async () => {
    const delivery = await notificationDeliveryService.dispatch({
      channel: NOTIFICATION_CHANNELS.EMAIL,
      recipientAddress: 'invalid-email-address',
      title: 'Test Alert'
    });

    assert.equal(delivery.status, DELIVERY_STATUS.FAILED);
    assert.match(delivery.errorMessage, /Invalid recipient email address/);
  });
});
