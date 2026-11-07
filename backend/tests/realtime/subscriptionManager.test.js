/**
 * CareConnect Ethiopia - Real-Time Subscription Manager Test Suite
 * Verifies channel authorization, facility isolation, cross-facility leakage prevention,
 * subscription quotas, duplicate handling, and disconnect cleanups.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { RealtimeServer } from '../../src/realtime/realtimeServer.js';
import { ConnectionRegistry } from '../../src/realtime/connectionRegistry.js';
import { SubscriptionManager } from '../../src/realtime/subscriptionManager.js';
import { createMockWebSocketPair } from './mockRealtimeClient.js';
import UserModel from '../../src/models/userModel.js';
import referralRepository from '../../src/repositories/referralRepository.js';
import { SERVER_MESSAGE_TYPES, CLIENT_MESSAGE_TYPES } from '../../src/constants/realtime.js';
import { generateAccessToken } from '../../src/utils/token.js';

describe('Authorized Real-Time Subscriptions Suite — Commit 107', () => {
  let rtServer;
  let registry;
  let subManager;
  let hcStaff;
  let hospStaff;
  let hcToken;
  let hospToken;
  let referral;

  beforeEach(async () => {
    registry = new ConnectionRegistry({ maxConnections: 10 });
    subManager = new SubscriptionManager({ registry, maxSubscriptionsPerClient: 5 });

    rtServer = new RealtimeServer({
      path: '/ws',
      heartbeatIntervalMs: 500,
      authTimeoutMs: 1000,
      registry,
      subscriptionManager: subManager
    });

    // Provision Health Centre staff
    hcStaff = await UserModel.create({
      email: `hc_staff_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Tigist',
      lastName: 'Haile',
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

    // Provision Hospital staff
    hospStaff = await UserModel.create({
      email: `hosp_staff_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Dr. Dawit',
      lastName: 'Mekonnen',
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

    // Seed test referral connecting HC 001 and Hospital 002
    referral = await referralRepository.create({
      referral_code: `REF-TEST-${Date.now()}`,
      originating_facility_id: 'facility-hc-001',
      receiving_facility_id: 'facility-hosp-002',
      referring_clinician_id: hcStaff.id,
      patient_id: 101,
      clinical_priority: 'ROUTINE',
      reason_for_referral: 'Specialized cardiac consultation'
    });
  });

  afterEach(async () => {
    if (rtServer) await rtServer.close();
    subManager.clear();
    registry.clear();
  });

  it('1. Auto-subscribes user to personal and facility channels on authentication', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });

    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const meta = registry.getByUserId(hcStaff.id)[0];
    assert.ok(meta, 'User connection must exist');
    assert.ok(meta.subscriptions.has(`user:${hcStaff.id}`), 'Should auto-subscribe to user personal channel');
    assert.ok(meta.subscriptions.has('facility:facility-hc-001'), 'Should auto-subscribe to facility channel');

    clientWs.close();
  });

  it('2. Subscribes to an authorized referral channel', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const subPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.SUBSCRIBED) resolve(parsed);
      });
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.SUBSCRIBE,
      channel: `referral:${referral.id}`
    }));

    const response = await subPromise;
    assert.equal(response.type, SERVER_MESSAGE_TYPES.SUBSCRIBED);
    assert.equal(response.channel, `referral:${referral.id}`);

    const subscribers = subManager.getSubscribers(`referral:${referral.id}`);
    assert.equal(subscribers.length, 1);

    clientWs.close();
  });

  it('3. Rejects subscription to another facility channel (facility isolation)', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const errorPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.ERROR) resolve(parsed);
      });
    });

    // HC staff tries to subscribe to Hospital 002 facility channel directly
    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.SUBSCRIBE,
      channel: 'facility:facility-hosp-002'
    }));

    const error = await errorPromise;
    assert.equal(error.type, SERVER_MESSAGE_TYPES.ERROR);
    assert.equal(error.code, 'FORBIDDEN_CHANNEL');
    assert.ok(error.error.includes('Access denied'));

    clientWs.close();
  });

  it('4. Rejects subscription to another user personal channel', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const errorPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.ERROR) resolve(parsed);
      });
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.SUBSCRIBE,
      channel: `user:${hospStaff.id}`
    }));

    const error = await errorPromise;
    assert.equal(error.code, 'FORBIDDEN_CHANNEL');
    assert.ok(error.error.includes('personal channel'));

    clientWs.close();
  });

  it('5. Rejects subscription to referral from an unauthorized 3rd facility', async () => {
    // 3rd facility staff
    const thirdParty = await UserModel.create({
      email: `third_party_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Abebe',
      lastName: 'Kebede',
      roleId: 1,
      facilityId: 'facility-unrelated-999'
    });

    const thirdToken = generateAccessToken({
      userId: thirdParty.id,
      email: thirdParty.email,
      roleId: 1,
      roleName: 'HEALTH_CENTRE_STAFF',
      portal: 'HEALTH_CENTRE',
      facilityId: 'facility-unrelated-999'
    });

    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${thirdToken}` }
    });
    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const errorPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.ERROR) resolve(parsed);
      });
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.SUBSCRIBE,
      channel: `referral:${referral.id}`
    }));

    const error = await errorPromise;
    assert.equal(error.code, 'FORBIDDEN_CHANNEL');
    assert.ok(error.error.includes('Access denied'));

    clientWs.close();
  });

  it('6. Rejects malformed and injection channel requests', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const errors = [];
    clientWs.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === SERVER_MESSAGE_TYPES.ERROR) errors.push(parsed);
    });

    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.SUBSCRIBE, channel: 'unknown_room' }));
    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.SUBSCRIBE, channel: 'facility:../../hack' }));
    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.SUBSCRIBE, channel: 'user:*' }));

    await new Promise((r) => setTimeout(r, 60));
    assert.equal(errors.length, 3);
    for (const err of errors) {
      assert.equal(err.code, 'FORBIDDEN_CHANNEL');
    }

    clientWs.close();
  });

  it('7. Handles duplicate subscription idempotently', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const responses = [];
    clientWs.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === SERVER_MESSAGE_TYPES.SUBSCRIBED) responses.push(parsed);
    });

    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.SUBSCRIBE, channel: `referral:${referral.id}` }));
    await new Promise((r) => setTimeout(r, 30));

    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.SUBSCRIBE, channel: `referral:${referral.id}` }));
    await new Promise((r) => setTimeout(r, 30));

    assert.equal(responses.length, 2);
    assert.equal(responses[0].duplicate, false);
    assert.equal(responses[1].duplicate, true);

    clientWs.close();
  });

  it('8. Enforces subscription limits per client connection', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    // Limit is 5. Already has user and facility (2). Add 3 more, then 4th should fail.
    const meta = registry.getByUserId(hcStaff.id)[0];
    meta.subscriptions.add('channel-1');
    meta.subscriptions.add('channel-2');
    meta.subscriptions.add('channel-3');
    assert.equal(meta.subscriptions.size, 5);

    const errorPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.ERROR) resolve(parsed);
      });
    });

    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.SUBSCRIBE, channel: `referral:${referral.id}` }));
    const error = await errorPromise;
    assert.ok(error.error.includes('Subscription limit reached'));

    clientWs.close();
  });

  it('9. Unsubscribes from channel and cleans up inverted index', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    // Unsubscribe from facility
    const unsubPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.UNSUBSCRIBED) resolve(parsed);
      });
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.UNSUBSCRIBE,
      channel: 'facility:facility-hc-001'
    }));

    const response = await unsubPromise;
    assert.equal(response.type, SERVER_MESSAGE_TYPES.UNSUBSCRIBED);
    assert.equal(response.channel, 'facility:facility-hc-001');

    const subs = subManager.getSubscribers('facility:facility-hc-001');
    assert.equal(subs.length, 0);

    clientWs.close();
  });

  it('10. Cleans up subscriptions on connection disconnect', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    assert.equal(subManager.getSubscribers(`user:${hcStaff.id}`).length, 1);

    clientWs.close();
    await new Promise((r) => setTimeout(r, 30));

    assert.equal(subManager.getSubscribers(`user:${hcStaff.id}`).length, 0);
  });
});
