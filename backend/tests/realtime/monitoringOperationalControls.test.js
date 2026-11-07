/**
 * CareConnect Ethiopia - Real-Time Monitoring & Operational Controls Test Suite
 * Verifies metrics aggregation, RBAC-protected administrative diagnostics,
 * forced user session disconnection, rate limiting, and zero token/PII leakage.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  realtimeServer,
  connectionRegistry,
  subscriptionManager,
  eventBroadcaster,
  realtimeMetrics,
  CLIENT_MESSAGE_TYPES,
  WS_CLOSE_CODES
} from '../../src/realtime/index.js';
import { createMockWebSocketPair } from './mockRealtimeClient.js';
import UserModel from '../../src/models/userModel.js';
import { generateAccessToken } from '../../src/utils/token.js';
import app from '../../src/app.js';
import { request } from '../testHelper.js';

describe('Real-Time Monitoring and Operational Controls Suite — Commit 111', () => {
  let adminUser;
  let staffUser;
  let adminToken;
  let staffToken;

  beforeEach(async () => {
    connectionRegistry.clear();
    subscriptionManager.clear();
    eventBroadcaster.clear();
    realtimeMetrics.reset();

    adminUser = await UserModel.create({
      email: `admin_mon_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Admin',
      lastName: 'Haile',
      roleId: 6 // SYSTEM_ADMINISTRATOR
    });

    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      roleId: 6,
      roleName: 'SYSTEM_ADMINISTRATOR',
      portal: 'ADMINISTRATOR'
    });

    staffUser = await UserModel.create({
      email: `staff_mon_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Clinician',
      lastName: 'Kebede',
      roleId: 1 // HEALTH_CENTRE_STAFF
    });

    staffToken = generateAccessToken({
      userId: staffUser.id,
      email: staffUser.email,
      roleId: 1,
      roleName: 'HEALTH_CENTRE_STAFF',
      portal: 'HEALTH_CENTRE',
      facilityId: 'facility-hc-001'
    });
  });

  afterEach(() => {
    realtimeMetrics.reset();
    subscriptionManager.clear();
    connectionRegistry.clear();
    eventBroadcaster.clear();
  });

  it('1. GET /api/v1/realtime/metrics succeeds for SYSTEM_ADMINISTRATOR with comprehensive telemetry', async () => {
    const res = await request(app).get('/api/v1/realtime/metrics', {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    const d = res.body.data;
    assert.equal(d.status, 'operational');
    assert.ok(d.connections);
    assert.ok(d.subscriptions);
    assert.ok(d.events);
    assert.ok(d.memory);
    assert.equal(typeof d.uptimeSeconds, 'number');

    // Verify zero PII or tokens exposed
    const serialized = JSON.stringify(d);
    assert.equal(serialized.includes('token'), false);
    assert.equal(serialized.includes('password'), false);
  });

  it('2. GET /api/v1/realtime/metrics rejects regular staff with 403 Forbidden', async () => {
    const res = await request(app).get('/api/v1/realtime/metrics', {
      headers: { authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 403);
  });

  it('3. GET /api/v1/realtime/health returns public health probe', async () => {
    const res = await request(app).get('/api/v1/realtime/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(typeof res.body.activeConnections, 'number');
    assert.ok(res.body.subscriptionMetrics);
  });

  it('4. POST /api/v1/realtime/disconnect-user/:userId forcibly terminates targeted user sessions', async () => {
    // Connect 2 sockets for staffUser
    const pair1 = createMockWebSocketPair({ headers: { authorization: `Bearer ${staffToken}` } });
    const pair2 = createMockWebSocketPair({ headers: { authorization: `Bearer ${staffToken}` } });

    realtimeServer._handleConnection(pair1.serverWs, pair1.req);
    realtimeServer._handleConnection(pair2.serverWs, pair2.req);
    await new Promise((r) => setTimeout(r, 40));

    assert.equal(connectionRegistry.getByUserId(staffUser.id).length, 2);

    let pair1CloseCode = null;
    pair1.clientWs.on('close', (code) => { pair1CloseCode = code; });

    // Admin invokes forced disconnect
    const res = await request(app).post(`/api/v1/realtime/disconnect-user/${staffUser.id}`, {
      reason: 'Security breach suspected'
    }, {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.disconnectedCount, 2);

    await new Promise((r) => setTimeout(r, 40));
    assert.equal(connectionRegistry.getByUserId(staffUser.id).length, 0);
    assert.equal(pair1CloseCode, WS_CLOSE_CODES.SESSION_EXPIRED);

    pair1.clientWs.close();
    pair2.clientWs.close();
  });

  it('5. POST /api/v1/realtime/disconnect-user/:userId rejects non-admin with 403', async () => {
    const res = await request(app).post(`/api/v1/realtime/disconnect-user/${adminUser.id}`, {}, {
      headers: { authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 403);
  });

  it('6. Enforces message rate limiting and disconnects abusive clients', async () => {
    const pair = createMockWebSocketPair({ headers: { authorization: `Bearer ${staffToken}` } });
    realtimeServer.rateLimitMaxMessages = 3; // Strict test limit

    realtimeServer._handleConnection(pair.serverWs, pair.req);
    await new Promise((r) => setTimeout(r, 40));

    let closedCode = null;
    pair.clientWs.on('close', (code) => { closedCode = code; });

    // Send 4 messages (exceeding limit of 3)
    pair.clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.PING }));
    pair.clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.PING }));
    pair.clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.PING }));
    pair.clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.PING }));

    await new Promise((r) => setTimeout(r, 60));
    assert.equal(closedCode, WS_CLOSE_CODES.RATE_LIMITED);

    // Reset rate limit to default 60
    realtimeServer.rateLimitMaxMessages = 60;
  });
});
