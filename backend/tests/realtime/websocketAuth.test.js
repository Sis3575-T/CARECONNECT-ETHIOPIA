/**
 * CareConnect Ethiopia - WebSocket Connection Authentication Test Suite
 * Verifies JWT token validation, active user status checks, query param token blocking,
 * per-user connection limits, and auth timeout disconnects.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import config from '../../src/config/env.js';
import { RealtimeServer } from '../../src/realtime/realtimeServer.js';
import { ConnectionRegistry } from '../../src/realtime/connectionRegistry.js';
import { createMockWebSocketPair } from './mockRealtimeClient.js';
import UserModel from '../../src/models/userModel.js';
import { SERVER_MESSAGE_TYPES, CLIENT_MESSAGE_TYPES, WS_CLOSE_CODES } from '../../src/constants/realtime.js';
import { generateAccessToken } from '../../src/utils/token.js';

describe('Authenticated WebSocket Connections Suite — Commit 106', () => {
  let rtServer;
  let registry;
  let testUser;
  let validToken;

  beforeEach(async () => {
    registry = new ConnectionRegistry({ maxConnections: 10 });
    rtServer = new RealtimeServer({
      path: '/ws',
      heartbeatIntervalMs: 500,
      authTimeoutMs: 100,
      registry
    });

    testUser = await UserModel.create({
      email: `test_ws_${Date.now()}@careconnect.et`,
      passwordHash: 'dummy_hash',
      firstName: 'Almaz',
      lastName: 'Kebede',
      roleId: 1,
      facilityId: 'facility-hc-001'
    });

    validToken = generateAccessToken({
      userId: testUser.id,
      email: testUser.email,
      roleId: 1,
      roleName: 'HEALTH_CENTRE_STAFF',
      portal: 'HEALTH_CENTRE',
      facilityId: 'facility-hc-001'
    });
  });

  afterEach(async () => {
    if (rtServer) await rtServer.close();
    registry.clear();
  });

  it('1. Authenticates connection via message frame { type: "auth", token }', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    rtServer._handleConnection(serverWs, req);

    // Drain initial greeting
    await new Promise((resolve) => clientWs.once('message', resolve));

    const authPromise = new Promise((resolve) => {
      clientWs.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.AUTH,
      token: validToken
    }));

    const response = await authPromise;
    assert.equal(response.type, SERVER_MESSAGE_TYPES.AUTH_SUCCESS);
    assert.equal(response.user.userId, testUser.id);
    assert.equal(response.user.roleName, 'HEALTH_CENTRE_STAFF');

    const meta = registry.getByUserId(testUser.id);
    assert.equal(meta.length, 1);
    assert.equal(meta[0].authenticated, true);
    assert.equal(meta[0].authTimer, null, 'Auth timeout timer should be cleared');

    clientWs.close();
  });

  it('2. Authenticates connection via handshake Authorization Bearer header', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { authorization: `Bearer ${validToken}` }
    });

    const messages = [];
    clientWs.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });

    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const authSuccess = messages.find((m) => m.type === SERVER_MESSAGE_TYPES.AUTH_SUCCESS);
    assert.ok(authSuccess, 'Should receive auth_success from handshake headers');
    assert.equal(authSuccess.user.userId, testUser.id);

    clientWs.close();
  });

  it('3. Authenticates connection via careconnect_access_token cookie', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      headers: { cookie: `careconnect_access_token=${encodeURIComponent(validToken)}` }
    });

    const messages = [];
    clientWs.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });

    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    const authSuccess = messages.find((m) => m.type === SERVER_MESSAGE_TYPES.AUTH_SUCCESS);
    assert.ok(authSuccess, 'Should authenticate via cookie');

    clientWs.close();
  });

  it('4. Rejects tokens placed in URL query parameters with policy violation', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      url: `/ws?token=${validToken}`
    });

    let closedCode = null;
    clientWs.on('close', (code) => {
      closedCode = code;
    });

    rtServer._handleConnection(serverWs, req);
    await new Promise((r) => setTimeout(r, 40));

    assert.equal(closedCode, WS_CLOSE_CODES.POLICY_VIOLATION);
  });

  it('5. Rejects malformed JWT token', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    rtServer._handleConnection(serverWs, req);
    await new Promise((resolve) => clientWs.once('message', resolve));

    let closedCode = null;
    let authError = null;

    clientWs.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === SERVER_MESSAGE_TYPES.AUTH_ERROR) authError = parsed;
    });

    clientWs.on('close', (code) => {
      closedCode = code;
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.AUTH,
      token: 'not.a.valid.jwt'
    }));

    await new Promise((r) => setTimeout(r, 40));
    assert.ok(authError, 'Should receive auth_error message');
    assert.equal(closedCode, WS_CLOSE_CODES.UNAUTHORIZED);
  });

  it('6. Rejects expired JWT token with SESSION_EXPIRED close code', async () => {
    const expiredToken = jwt.sign(
      {
        userId: testUser.id,
        email: testUser.email,
        roleId: 1,
        roleName: 'HEALTH_CENTRE_STAFF',
        portal: 'HEALTH_CENTRE'
      },
      config.jwt.secret,
      {
        algorithm: 'HS256',
        expiresIn: '-1s', // Expired in the past
        issuer: 'careconnect-backend',
        audience: 'careconnect-portals'
      }
    );

    const { clientWs, serverWs, req } = createMockWebSocketPair();
    rtServer._handleConnection(serverWs, req);
    await new Promise((resolve) => clientWs.once('message', resolve));

    let closedCode = null;
    clientWs.on('close', (code) => {
      closedCode = code;
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.AUTH,
      token: expiredToken
    }));

    await new Promise((r) => setTimeout(r, 40));
    assert.equal(closedCode, WS_CLOSE_CODES.SESSION_EXPIRED);
  });

  it('7. Rejects deactivated user account', async () => {
    const inactiveUser = await UserModel.create({
      email: `inactive_${Date.now()}@careconnect.et`,
      passwordHash: 'hash',
      firstName: 'Inactive',
      lastName: 'User',
      roleId: 1
    });
    // Mark inactive in model store
    await UserModel.setAccountStatus(inactiveUser.id, false);

    const token = generateAccessToken({
      userId: inactiveUser.id,
      email: inactiveUser.email,
      roleId: 1
    });

    const { clientWs, serverWs, req } = createMockWebSocketPair();
    rtServer._handleConnection(serverWs, req);
    await new Promise((resolve) => clientWs.once('message', resolve));

    let closedCode = null;
    clientWs.on('close', (code) => {
      closedCode = code;
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.AUTH,
      token
    }));

    await new Promise((r) => setTimeout(r, 40));
    assert.equal(closedCode, WS_CLOSE_CODES.FORBIDDEN);
  });

  it('8. Enforces max concurrent connection limit per user', async () => {
    const pairs = [];
    for (let i = 0; i < 5; i++) {
      const pair = createMockWebSocketPair();
      rtServer._handleConnection(pair.serverWs, pair.req);
      pair.clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.AUTH, token: validToken }));
      pairs.push(pair);
    }
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(registry.getByUserId(testUser.id).length, 5);

    // 6th connection for same user
    const extra = createMockWebSocketPair();
    let closedCode = null;
    extra.clientWs.on('close', (code) => {
      closedCode = code;
    });

    rtServer._handleConnection(extra.serverWs, extra.req);
    extra.clientWs.send(JSON.stringify({ type: CLIENT_MESSAGE_TYPES.AUTH, token: validToken }));
    await new Promise((r) => setTimeout(r, 60));

    assert.equal(closedCode, WS_CLOSE_CODES.RATE_LIMITED);
    assert.equal(registry.getByUserId(testUser.id).length, 5);

    for (const p of pairs) p.clientWs.close();
  });

  it('9. Automatically disconnects unauthenticated connection on timeout', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    rtServer._handleConnection(serverWs, req);

    let closedCode = null;
    clientWs.on('close', (code) => {
      closedCode = code;
    });

    // Wait past authTimeoutMs (100ms)
    await new Promise((r) => setTimeout(r, 160));

    assert.equal(closedCode, WS_CLOSE_CODES.AUTH_TIMEOUT);
    assert.equal(registry.count(), 0);
  });
});
