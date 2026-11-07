/**
 * CareConnect Ethiopia - Real-Time Referral and Notification Events Test Suite
 * Verifies live referral lifecycle updates, notification state change broadcasts,
 * strict state-machine preservation, and recipient channel routing.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  realtimeServer,
  connectionRegistry,
  subscriptionManager,
  eventBroadcaster
} from '../../src/realtime/index.js';
import { createMockWebSocketPair } from './mockRealtimeClient.js';
import UserModel from '../../src/models/userModel.js';
import referralRepository from '../../src/repositories/referralRepository.js';
import referralService from '../../src/services/referralService.js';
import { notificationService } from '../../src/services/notificationService.js';
import { notificationRepository } from '../../src/repositories/notificationRepository.js';
import { notificationEventSubscriber } from '../../src/services/notificationEventSubscriber.js';
import { SERVER_MESSAGE_TYPES } from '../../src/constants/realtime.js';
import { generateAccessToken } from '../../src/utils/token.js';

describe('Real-Time Referral and Notification Events Suite — Commit 109', () => {
  let hcStaff;
  let hospStaff;
  let hcToken;
  let hospToken;

  beforeEach(async () => {
    connectionRegistry.clear();
    subscriptionManager.clear();
    eventBroadcaster.clear();

    hcStaff = await UserModel.create({
      email: `hc_rt_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Almaz',
      lastName: 'Tadesse',
      roleId: 1,
      facilityId: 'facility-hc-001'
    });

    hcToken = generateAccessToken({
      userId: hcStaff.id,
      email: hcStaff.email,
      roleId: 1,
      roleName: 'HEALTH_CENTRE_STAFF',
      portal: 'HEALTH_CENTRE',
      facilityId: 'facility-hc-001'
    });

    hospStaff = await UserModel.create({
      email: `hosp_rt_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Dr. Yonas',
      lastName: 'Bekele',
      roleId: 2,
      facilityId: 'facility-hosp-002'
    });

    hospToken = generateAccessToken({
      userId: hospStaff.id,
      email: hospStaff.email,
      roleId: 2,
      roleName: 'HOSPITAL_STAFF',
      portal: 'HOSPITAL',
      facilityId: 'facility-hosp-002'
    });
  });

  afterEach(() => {
    subscriptionManager.clear();
    connectionRegistry.clear();
    eventBroadcaster.clear();
  });

  it('1. Broadcasts referral.submitted to receiving hospital and referring facility on referral submission', async () => {
    // Hospital connection listening on facility-hosp-002
    const hospPair = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hospToken}` }
    });
    realtimeServer._handleConnection(hospPair.serverWs, hospPair.req);
    await new Promise((r) => setTimeout(r, 40));

    // Create draft referral
    const draft = await referralRepository.create({
      referral_code: `REF-SUB-${Date.now()}`,
      originating_facility_id: 'facility-hc-001',
      receiving_facility_id: 'facility-hosp-002',
      referring_clinician_id: hcStaff.id,
      patient_id: 201,
      clinical_priority: 'ROUTINE',
      primary_diagnosis: 'Suspected Rheumatic Heart Disease',
      clinical_summary: 'Progressive exertional dyspnea for 6 months',
      reason_for_referral: 'Echocardiography evaluation and specialist cardiology assessment'
    });

    const eventPromise = new Promise((resolve) => {
      hospPair.clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.EVENT && parsed.event.type === 'referral.submitted') {
          resolve(parsed);
        }
      });
    });

    // Clinician formally submits referral
    await referralService.submitReferral(draft.id, {
      id: hcStaff.id,
      facilityId: 'facility-hc-001',
      roleId: 1
    });

    const msg = await eventPromise;
    assert.equal(msg.event.type, 'referral.submitted');
    assert.equal(msg.event.data.referralId, draft.id);
    assert.equal(msg.event.data.status, 'SUBMITTED');

    hospPair.clientWs.close();
  });

  it('2. Broadcasts referral.acknowledged when hospital triage acknowledges referral', async () => {
    const hcPair = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    realtimeServer._handleConnection(hcPair.serverWs, hcPair.req);
    await new Promise((r) => setTimeout(r, 40));

    const referral = await referralRepository.create({
      referral_code: `REF-ACK-${Date.now()}`,
      originating_facility_id: 'facility-hc-001',
      receiving_facility_id: 'facility-hosp-002',
      status: 'SUBMITTED',
      patient_id: 202
    });

    const ackPromise = new Promise((resolve) => {
      hcPair.clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.EVENT && parsed.event.type === 'referral.acknowledged') {
          resolve(parsed);
        }
      });
    });

    await referralService.acknowledgeReferral(referral.id, 'Triage team reviewing cardiology capacity', {
      id: hospStaff.id,
      facilityId: 'facility-hosp-002',
      roleId: 2
    });

    const msg = await ackPromise;
    assert.equal(msg.event.type, 'referral.acknowledged');
    assert.equal(msg.event.data.status, 'ACKNOWLEDGED');

    hcPair.clientWs.close();
  });

  it('3. Broadcasts referral.accepted when hospital clinician accepts referral', async () => {
    const hcPair = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    realtimeServer._handleConnection(hcPair.serverWs, hcPair.req);
    await new Promise((r) => setTimeout(r, 40));

    const referral = await referralRepository.create({
      referral_code: `REF-ACC-${Date.now()}`,
      originating_facility_id: 'facility-hc-001',
      receiving_facility_id: 'facility-hosp-002',
      destination_facility_id: 'facility-hosp-002',
      origin_facility_id: 'facility-hc-001',
      status: 'ACKNOWLEDGED',
      patient_id: 203
    });

    const acceptPromise = new Promise((resolve) => {
      hcPair.clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.EVENT && parsed.event.type === 'referral.accepted') {
          resolve(parsed);
        }
      });
    });

    await referralService.acceptReferral(referral.id, {
      decision_notes: 'Bed reserved in Cardiology Ward 3B',
      assigned_bed_type: 'CARDIOLOGY_BED'
    }, {
      id: hospStaff.id,
      facilityId: 'facility-hosp-002',
      roleId: 2
    });

    const msg = await acceptPromise;
    assert.equal(msg.event.type, 'referral.accepted');
    assert.equal(msg.event.data.status, 'ACCEPTED');

    hcPair.clientWs.close();
  });

  it('4. Broadcasts notification.read and unread count change to user channel on markAsRead', async () => {
    const userPair = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    realtimeServer._handleConnection(userPair.serverWs, userPair.req);
    await new Promise((r) => setTimeout(r, 40));

    // Seed unread notification
    const notif = await notificationRepository.create({
      recipientUserId: hcStaff.id,
      title: 'Referral Update',
      message: 'Referral accepted by Black Lion Hospital',
      notificationType: 'REFERRAL_ACCEPTED',
      category: 'REFERRAL_UPDATE',
      entityType: 'referral',
      entityId: 'ref-123'
    });

    const readPromise = new Promise((resolve) => {
      userPair.clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.EVENT && parsed.event.type === 'notification.read') {
          resolve(parsed);
        }
      });
    });

    await notificationService.markAsRead(notif.id, hcStaff.id);

    const msg = await readPromise;
    assert.equal(msg.event.type, 'notification.read');
    assert.equal(msg.event.data.notificationId, notif.id);
    assert.equal(msg.event.data.unreadCount, 0);

    userPair.clientWs.close();
  });

  it('5. Broadcasts notification.dismissed to user channel on dismissNotification', async () => {
    const userPair = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    realtimeServer._handleConnection(userPair.serverWs, userPair.req);
    await new Promise((r) => setTimeout(r, 40));

    const notif = await notificationRepository.create({
      recipientUserId: hcStaff.id,
      title: 'General Update',
      message: 'System scheduled maintenance reminder',
      notificationType: 'SYSTEM_MAINTENANCE',
      category: 'SYSTEM'
    });

    const dismissPromise = new Promise((resolve) => {
      userPair.clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.EVENT && parsed.event.type === 'notification.dismissed') {
          resolve(parsed);
        }
      });
    });

    await notificationService.dismissNotification(notif.id, hcStaff.id);

    const msg = await dismissPromise;
    assert.equal(msg.event.type, 'notification.dismissed');
    assert.equal(msg.event.data.notificationId, notif.id);

    userPair.clientWs.close();
  });
});
