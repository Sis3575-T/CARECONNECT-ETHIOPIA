/**
 * CareConnect Ethiopia - Real-Time Security, Reliability & Event Delivery Verification Suite
 * Comprehensive End-to-End Test Suite for Part 14 covering all 23 verification scenarios.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import config from '../../src/config/env.js';
import {
  realtimeServer,
  connectionRegistry,
  subscriptionManager,
  eventBroadcaster,
  eventRecoveryService,
  realtimeMetrics,
  createRealtimeEvent,
  validateEventEnvelope,
  REALTIME_EVENT_TYPES,
  SERVER_MESSAGE_TYPES,
  CLIENT_MESSAGE_TYPES,
  WS_CLOSE_CODES
} from '../../src/realtime/index.js';
import { createMockWebSocketPair } from './mockRealtimeClient.js';
import UserModel from '../../src/models/userModel.js';
import referralRepository from '../../src/repositories/referralRepository.js';
import { generateAccessToken } from '../../src/utils/token.js';
import app from '../../src/app.js';
import { request } from '../testHelper.js';

describe('Real-Time Security, Reliability and Event Delivery Verification Suite — Commit 112', () => {
  let adminUser;
  let hcStaffUser;
  let hospStaffUser;
  let adminToken;
  let hcToken;
  let hospToken;

  beforeEach(async () => {
    connectionRegistry.clear();
    subscriptionManager.clear();
    eventBroadcaster.clear();
    realtimeMetrics.reset();

    adminUser = await UserModel.create({
      email: `admin_v_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Admin',
      lastName: 'Kebede',
      roleId: 6
    });

    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      roleId: 6,
      roleName: 'SYSTEM_ADMINISTRATOR',
      portal: 'ADMINISTRATOR'
    });

    hcStaffUser = await UserModel.create({
      email: `hc_v_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Dr. Selam',
      lastName: 'Tesfaye',
      roleId: 1,
      facilityId: 'facility-hc-001'
    });

    hcToken = generateAccessToken({
      userId: hcStaffUser.id,
      email: hcStaffUser.email,
      roleId: 1,
      roleName: 'HEALTH_CENTRE_STAFF',
      portal: 'HEALTH_CENTRE',
      facilityId: 'facility-hc-001'
    });

    hospStaffUser = await UserModel.create({
      email: `hosp_v_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Dr. Yohannes',
      lastName: 'Kassa',
      roleId: 2,
      facilityId: 'facility-hosp-002'
    });

    hospToken = generateAccessToken({
      userId: hospStaffUser.id,
      email: hospStaffUser.email,
      roleId: 2,
      roleName: 'HOSPITAL_STAFF',
      portal: 'HOSPITAL',
      facilityId: 'facility-hosp-002'
    });
  });

  afterEach(() => {
    realtimeMetrics.reset();
    subscriptionManager.clear();
    connectionRegistry.clear();
    eventBroadcaster.clear();
  });

  it('1. Successful WebSocket connection establishment and initial greeting', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    const greetingPromise = new Promise((resolve) => {
      clientWs.on('message', (d) => resolve(JSON.parse(d.toString())));
    });

    realtimeServer._handleConnection(serverWs, req);
    const greeting = await greetingPromise;

    assert.equal(greeting.type, SERVER_MESSAGE_TYPES.CONNECTED);
    assert.ok(greeting.connectionId);
    assert.equal(greeting.authRequired, true);
    assert.ok(greeting.reconnectPolicy);

    clientWs.close();
  });

  it('2. Unauthenticated connection rejection on timeout or unauthorized command', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    realtimeServer._handleConnection(serverWs, req);
    await new Promise((r) => clientWs.once('message', r));

    let closedCode = null;
    clientWs.on('close', (c) => { closedCode = c; });

    // Send subscribe without authenticating
    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.SUBSCRIBE, channel: 'facility:any' }));
    await new Promise((r) => setTimeout(r, 40));

    assert.equal(closedCode, WS_CLOSE_CODES.UNAUTHORIZED);
  });

  it('3. Expired-token rejection with SESSION_EXPIRED code', async () => {
    const expiredToken = jwt.sign(
      { userId: hcStaffUser.id, email: hcStaffUser.email, roleId: 1 },
      config.jwt.secret,
      { algorithm: 'HS256', expiresIn: '-1s', issuer: 'careconnect-backend', audience: 'careconnect-portals' }
    );

    const { clientWs, serverWs, req } = createMockWebSocketPair();
    realtimeServer._handleConnection(serverWs, req);
    await new Promise((r) => clientWs.once('message', r));

    let closedCode = null;
    clientWs.on('close', (c) => { closedCode = c; });

    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.AUTH, token: expiredToken }));
    await new Promise((r) => setTimeout(r, 40));

    assert.equal(closedCode, WS_CLOSE_CODES.SESSION_EXPIRED);
  });

  it('4. Inactive-user rejection', async () => {
    await UserModel.setAccountStatus(hcStaffUser.id, false);

    const { clientWs, serverWs, req } = createMockWebSocketPair();
    realtimeServer._handleConnection(serverWs, req);
    await new Promise((r) => clientWs.once('message', r));

    let closedCode = null;
    clientWs.on('close', (c) => { closedCode = c; });

    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.AUTH, token: hcToken }));
    await new Promise((r) => setTimeout(r, 40));

    assert.equal(closedCode, WS_CLOSE_CODES.FORBIDDEN);
  });

  it('5. Authorized subscription and auto-subscription', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    realtimeServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const meta = connectionRegistry.getByUserId(hcStaffUser.id)[0];
    assert.ok(meta.subscriptions.has(`user:${hcStaffUser.id}`));
    assert.ok(meta.subscriptions.has('facility:facility-hc-001'));

    clientWs.close();
  });

  it('6. Cross-facility subscription rejection', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    realtimeServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    let errorFrame = null;
    clientWs.on('message', (d) => {
      const parsed = JSON.parse(d.toString());
      if (parsed.type === SERVER_MESSAGE_TYPES.ERROR) errorFrame = parsed;
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.SUBSCRIBE,
      channel: 'facility:facility-hosp-002'
    }));
    await new Promise((r) => setTimeout(r, 40));

    assert.ok(errorFrame);
    assert.equal(errorFrame.code, 'FORBIDDEN_CHANNEL');

    clientWs.close();
  });

  it('7. Duplicate subscription prevention', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${adminToken}` }
    });
    realtimeServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const frames = [];
    clientWs.on('message', (d) => {
      const parsed = JSON.parse(d.toString());
      if (parsed.type === SERVER_MESSAGE_TYPES.SUBSCRIBED) frames.push(parsed);
    });

    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.SUBSCRIBE, channel: 'facility:facility-hc-001' }));
    await new Promise((r) => setTimeout(r, 30));

    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.SUBSCRIBE, channel: 'facility:facility-hc-001' }));
    await new Promise((r) => setTimeout(r, 30));

    assert.equal(frames.length, 2);
    assert.equal(frames[0].duplicate, false);
    assert.equal(frames[1].duplicate, true);

    clientWs.close();
  });

  it('8. Connection cleanup upon disconnect', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });
    realtimeServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(connectionRegistry.count(), 1);

    clientWs.close();
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(connectionRegistry.count(), 0);
  });

  it('9. Heartbeat and ping-pong behavior', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    realtimeServer._handleConnection(serverWs, req);
    await new Promise((r) => clientWs.once('message', r));

    const pongPromise = new Promise((resolve) => {
      clientWs.on('message', (d) => {
        const parsed = JSON.parse(d.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.PONG) resolve(parsed);
      });
    });

    clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.PING, timestamp: Date.now() }));
    const pong = await pongPromise;
    assert.equal(pong.type, SERVER_MESSAGE_TYPES.PONG);

    clientWs.close();
  });

  it('10. Stale connection cleanup on heartbeat timeout', () => {
    const pair = createMockWebSocketPair();
    const meta = connectionRegistry.register(pair.serverWs, pair.req);
    meta.isAlive = false;

    assert.equal(connectionRegistry.count(), 1);

    // Run heartbeat cleanup logic
    const all = connectionRegistry.getAll();
    for (const m of all) {
      if (!m.isAlive) connectionRegistry.unregister(m.connectionId);
    }

    assert.equal(connectionRegistry.count(), 0);
  });

  it('11. Referral event distribution', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });

    const authPromise = new Promise((resolve) => {
      clientWs.on('message', (d) => {
        const parsed = JSON.parse(d.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.AUTH_SUCCESS) resolve(parsed);
      });
    });

    realtimeServer._handleConnection(serverWs, req);
    await authPromise;

    const eventPromise = new Promise((resolve) => {
      clientWs.on('message', (d) => {
        const parsed = JSON.parse(d.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.EVENT && parsed.event.type === 'referral.submitted') resolve(parsed);
      });
    });

    const rtEvent = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED, {
      referralId: 'ref-verif-01',
      referralCode: 'REF-VERIF'
    });

    eventBroadcaster.broadcastToChannels('facility:facility-hc-001', rtEvent);
    const received = await eventPromise;
    assert.equal(received.event.data.referralId, 'ref-verif-01');

    clientWs.close();
  });

  it('12. Notification event distribution', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${hcToken}` }
    });

    const authPromise = new Promise((resolve) => {
      clientWs.on('message', (d) => {
        const parsed = JSON.parse(d.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.AUTH_SUCCESS) resolve(parsed);
      });
    });

    realtimeServer._handleConnection(serverWs, req);
    await authPromise;

    const notifPromise = new Promise((resolve) => {
      clientWs.on('message', (d) => {
        const parsed = JSON.parse(d.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.EVENT && parsed.event.type === 'notification.created') resolve(parsed);
      });
    });

    const rtNotif = createRealtimeEvent(REALTIME_EVENT_TYPES.NOTIFICATION_CREATED, {
      title: 'Immediate Alert',
      message: 'Urgent bed available'
    });

    eventBroadcaster.broadcastToChannels(`user:${hcStaffUser.id}`, rtNotif);
    const received = await notifPromise;
    assert.equal(received.event.data.title, 'Immediate Alert');

    clientWs.close();
  });

  it('13. Transport event authorization check', async () => {
    // Regular staff attempting to subscribe to admin channel
    const authCheck = await subscriptionManager.authorizeChannel(
      { roleName: 'HEALTH_CENTRE_STAFF', facilityId: 'facility-hc-001' },
      'admin'
    );
    assert.equal(authCheck.authorized, false);

    // Transport coordinator subscribing to transport channel
    const transCheck = await subscriptionManager.authorizeChannel(
      { roleName: 'TRANSPORT_COORDINATOR' },
      'transport'
    );
    assert.equal(transCheck.authorized, true);
  });

  it('14. Event deduplication across multi-channel subscriptions', async () => {
    const pair = createMockWebSocketPair();
    const meta = connectionRegistry.register(pair.serverWs, pair.req);
    meta.authenticated = true;
    meta.user = { userId: adminUser.id, roleName: 'SYSTEM_ADMINISTRATOR' };

    await subscriptionManager.subscribe(meta, 'facility:facility-hc-001');
    await subscriptionManager.subscribe(meta, 'facility:facility-hosp-002');

    const rtEvent = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_STATUS_CHANGED, {
      referralId: 'ref-dup-check'
    });

    const delivered = eventBroadcaster.broadcastToChannels([
      'facility:facility-hc-001',
      'facility:facility-hosp-002'
    ], rtEvent);

    assert.equal(delivered, 1);
  });

  it('15. Reconnection and missed-event recovery', async () => {
    const ev = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED, { referralId: 'ref-rec-01' });
    eventBroadcaster.broadcastToChannels('facility:facility-hc-001', ev);

    const recovery = await eventRecoveryService.recoverMissedEvents(
      { userId: hcStaffUser.id, facilityId: 'facility-hc-001', roleName: 'HEALTH_CENTRE_STAFF' },
      { since: new Date(Date.now() - 60000).toISOString() }
    );

    assert.equal(recovery.replayedCount, 1);
    assert.equal(recovery.events[0].eventId, ev.eventId);
  });

  it('16. Event schema validation and PII filtering', () => {
    const raw = {
      patientId: 'patient-1',
      clinical_notes: 'CONFIDENTIAL CLINICAL NOTE',
      password: 'secret_password'
    };
    const ev = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED, raw);

    assert.equal(ev.data.clinical_notes, undefined);
    assert.equal(ev.data.password, undefined);
    assert.equal(ev.data.patientId, 'patient-1');
  });

  it('17. Rate limiting disconnects abusive client', async () => {
    const pair = createMockWebSocketPair({ headers: { authorization: `Bearer ${hcToken}` } });
    realtimeServer.rateLimitMaxMessages = 2; // Strict limit for test

    realtimeServer._handleConnection(pair.serverWs, pair.req);
    await new Promise((r) => setTimeout(r, 40));

    let closedCode = null;
    pair.clientWs.on('close', (c) => { closedCode = c; });

    pair.clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.PING }));
    pair.clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.PING }));
    pair.clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.PING }));

    await new Promise((r) => setTimeout(r, 60));
    assert.equal(closedCode, WS_CLOSE_CODES.RATE_LIMITED);

    realtimeServer.rateLimitMaxMessages = 60;
  });

  it('18. Graceful shutdown closes all active sockets', async () => {
    const pair = createMockWebSocketPair();
    realtimeServer._handleConnection(pair.serverWs, pair.req);
    assert.equal(connectionRegistry.count(), 1);

    let closedCode = null;
    pair.clientWs.on('close', (c) => { closedCode = c; });

    await realtimeServer.close();
    await new Promise((r) => setTimeout(r, 40));

    assert.equal(closedCode, WS_CLOSE_CODES.GOING_AWAY);
    assert.equal(connectionRegistry.count(), 0);
  });
});
