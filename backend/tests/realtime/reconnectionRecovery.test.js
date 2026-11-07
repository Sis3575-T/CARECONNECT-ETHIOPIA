/**
 * CareConnect Ethiopia - Reconnection & Missed-Event Recovery Test Suite
 * Verifies reconnect policies, sequence tracking, missed event recovery via WebSocket
 * and REST APIs, deduplication, and authorization-guarded event filtering.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  realtimeServer,
  connectionRegistry,
  subscriptionManager,
  eventBroadcaster,
  eventRecoveryService,
  createRealtimeEvent,
  REALTIME_EVENT_TYPES,
  SERVER_MESSAGE_TYPES,
  CLIENT_MESSAGE_TYPES
} from '../../src/realtime/index.js';
import { createMockWebSocketPair } from './mockRealtimeClient.js';
import UserModel from '../../src/models/userModel.js';
import { generateAccessToken } from '../../src/utils/token.js';
import app from '../../src/app.js';
import { request } from '../testHelper.js';

describe('Reconnection and Missed-Event Recovery Suite — Commit 110', () => {
  let userHc;
  let userHosp;
  let tokenHc;
  let tokenHosp;

  beforeEach(async () => {
    connectionRegistry.clear();
    subscriptionManager.clear();
    eventBroadcaster.clear();

    userHc = await UserModel.create({
      email: `hc_rec_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Tigist',
      lastName: 'Alemu',
      roleId: 1,
      facilityId: 'facility-hc-001'
    });

    tokenHc = generateAccessToken({
      userId: userHc.id,
      email: userHc.email,
      roleId: 1,
      roleName: 'HEALTH_CENTRE_STAFF',
      portal: 'HEALTH_CENTRE',
      facilityId: 'facility-hc-001'
    });

    userHosp = await UserModel.create({
      email: `hosp_rec_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Dr. Chala',
      lastName: 'Tufa',
      roleId: 2,
      facilityId: 'facility-hosp-002'
    });

    tokenHosp = generateAccessToken({
      userId: userHosp.id,
      email: userHosp.email,
      roleId: 2,
      roleName: 'HOSPITAL_STAFF',
      portal: 'HOSPITAL',
      facilityId: 'facility-hosp-002'
    });
  });

  afterEach(() => {
    eventBroadcaster.clear();
    subscriptionManager.clear();
    connectionRegistry.clear();
  });

  it('1. Provides client with reconnectPolicy in initial connected frame', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();

    const greetingPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    realtimeServer._handleConnection(serverWs, req);
    const greeting = await greetingPromise;

    assert.equal(greeting.type, SERVER_MESSAGE_TYPES.CONNECTED);
    assert.ok(greeting.reconnectPolicy);
    assert.equal(greeting.reconnectPolicy.initialDelayMs, 1000);
    assert.equal(greeting.reconnectPolicy.maxDelayMs, 30000);
    assert.equal(greeting.reconnectPolicy.backoffMultiplier, 1.5);
    assert.equal(greeting.reconnectPolicy.jitter, 0.2);

    clientWs.close();
  });

  it('2. Recovers missed events via WebSocket { type: "sync" } command', async () => {
    // Generate historical events while client was disconnected
    const ev1 = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED, {
      referralId: 'ref-1',
      referralCode: 'REF-001'
    });
    const ev2 = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_STATUS_CHANGED, {
      referralId: 'ref-2',
      status: 'ACKNOWLEDGED'
    });

    eventBroadcaster.broadcastToChannels('facility:facility-hc-001', ev1);
    eventBroadcaster.broadcastToChannels('facility:facility-hc-001', ev2);

    // Client reconnects and requests sync
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${tokenHc}` }
    });
    realtimeServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const syncPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.SYNC_RESPONSE) {
          resolve(parsed);
        }
      });
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.SYNC,
      since: new Date(Date.now() - 60000).toISOString()
    }));

    const response = await syncPromise;
    assert.equal(response.type, SERVER_MESSAGE_TYPES.SYNC_RESPONSE);
    assert.equal(response.replayedCount, 2);
    assert.equal(response.events.length, 2);
    assert.equal(response.events[0].eventId, ev1.eventId);
    assert.equal(response.events[1].eventId, ev2.eventId);

    clientWs.close();
  });

  it('3. Deduplicates and skips events up to lastEventId', async () => {
    const ev1 = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED, { referralId: 'ref-1' });
    const ev2 = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_ACCEPTED, { referralId: 'ref-2' });
    const ev3 = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_COMPLETED, { referralId: 'ref-3' });

    eventBroadcaster.broadcastToChannels('facility:facility-hc-001', ev1);
    eventBroadcaster.broadcastToChannels('facility:facility-hc-001', ev2);
    eventBroadcaster.broadcastToChannels('facility:facility-hc-001', ev3);

    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${tokenHc}` }
    });
    realtimeServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const syncPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === SERVER_MESSAGE_TYPES.SYNC_RESPONSE) {
          resolve(parsed);
        }
      });
    });

    // Client requests replay starting AFTER ev2
    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.SYNC,
      lastEventId: ev2.eventId
    }));

    const response = await syncPromise;
    assert.equal(response.replayedCount, 1);
    assert.equal(response.events[0].eventId, ev3.eventId);

    clientWs.close();
  });

  it('4. Strictly excludes unauthorized events from replay (cross-facility protection)', async () => {
    // Event meant for HC 001
    const hcEvent = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED, { referralId: 'ref-hc' });
    eventBroadcaster.broadcastToChannels('facility:facility-hc-001', hcEvent);

    // Event meant for Hospital 002
    const hospEvent = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED, { referralId: 'ref-hosp' });
    eventBroadcaster.broadcastToChannels('facility:facility-hosp-002', hospEvent);

    // HC staff asks for missed events
    const result = await eventRecoveryService.recoverMissedEvents(
      { userId: userHc.id, facilityId: 'facility-hc-001', roleName: 'HEALTH_CENTRE_STAFF' },
      { since: new Date(Date.now() - 60000).toISOString() }
    );

    assert.equal(result.replayedCount, 1);
    assert.equal(result.events[0].eventId, hcEvent.eventId);
    // Hospital 002 event must NOT be returned to HC staff
    assert.equal(result.events.some((e) => e.eventId === hospEvent.eventId), false);
  });

  it('5. Supports missed-event recovery via GET /api/v1/realtime/missed-events REST endpoint', async () => {
    const ev = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED, {
      referralId: 'ref-rest',
      referralCode: 'REF-REST-001'
    });
    eventBroadcaster.broadcastToChannels('facility:facility-hc-001', ev);

    const res = await request(app).get('/api/v1/realtime/missed-events', {
      headers: { authorization: `Bearer ${tokenHc}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data.events));
    assert.equal(res.body.data.replayedCount, 1);
    assert.equal(res.body.data.events[0].eventId, ev.eventId);
  });

  it('6. Rejects unauthenticated sync request with authentication error', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    realtimeServer._handleConnection(serverWs, req);
    await new Promise((resolve) => clientWs.once('message', resolve));

    let authError = null;
    let closedCode = null;

    clientWs.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === SERVER_MESSAGE_TYPES.AUTH_ERROR) authError = parsed;
    });

    clientWs.on('close', (code) => {
      closedCode = code;
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.SYNC,
      since: new Date().toISOString()
    }));

    await new Promise((r) => setTimeout(r, 40));
    assert.ok(authError);
    assert.equal(closedCode, 4401);
  });
});
