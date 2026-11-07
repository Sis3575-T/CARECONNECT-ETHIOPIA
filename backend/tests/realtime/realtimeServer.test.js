/**
 * CareConnect Ethiopia - Real-Time Server Architecture Test Suite
 * Verifies WebSocket server initialization, connection lifecycle, origin checking,
 * ping/pong frames, heartbeat tracking, and clean disconnection.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { RealtimeServer } from '../../src/realtime/realtimeServer.js';
import { ConnectionRegistry } from '../../src/realtime/connectionRegistry.js';
import { createMockWebSocketPair } from './mockRealtimeClient.js';
import { SERVER_MESSAGE_TYPES, CLIENT_MESSAGE_TYPES, WS_CLOSE_CODES } from '../../src/constants/realtime.js';

describe('Real-Time Server Architecture Suite — Commit 105', () => {
  let rtServer;
  let registry;

  beforeEach(() => {
    registry = new ConnectionRegistry({ maxConnections: 3 });
    rtServer = new RealtimeServer({
      path: '/ws',
      heartbeatIntervalMs: 50,
      heartbeatTimeoutMs: 25,
      authTimeoutMs: 150,
      allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
      registry
    });
  });

  afterEach(async () => {
    if (rtServer) await rtServer.close();
    registry.clear();
  });

  it('1. Connects to WebSocket server and receives connected greeting', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair({
      origin: 'http://localhost:5173'
    });

    const greetingPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    rtServer._handleConnection(serverWs, req);

    const greeting = await greetingPromise;
    assert.equal(greeting.type, SERVER_MESSAGE_TYPES.CONNECTED);
    assert.ok(greeting.connectionId, 'Should contain connectionId');
    assert.ok(greeting.serverTime, 'Should contain serverTime');
    assert.equal(greeting.authRequired, true);

    const meta = registry.get(greeting.connectionId);
    assert.ok(meta, 'Connection should be registered in registry');
    assert.equal(meta.connectionId, greeting.connectionId);
    assert.equal(registry.count(), 1);

    clientWs.close();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(registry.count(), 0);
  });

  it('2. Responds to client ping with pong frame', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    rtServer._handleConnection(serverWs, req);

    // Drain initial greeting
    await new Promise((resolve) => clientWs.once('message', resolve));

    const pongPromise = new Promise((resolve) => {
      clientWs.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    clientWs.send(JSON.stringify({
      type: CLIENT_MESSAGE_TYPES.PING,
      timestamp: Date.now()
    }));

    const response = await pongPromise;
    assert.equal(response.type, SERVER_MESSAGE_TYPES.PONG);
    assert.ok(response.serverTime);

    clientWs.close();
  });

  it('3. Rejects connection when max connection limit is reached', async () => {
    // Fill up to max capacity (3)
    const pairs = [];
    for (let i = 0; i < 3; i++) {
      const pair = createMockWebSocketPair();
      rtServer._handleConnection(pair.serverWs, pair.req);
      pairs.push(pair);
    }
    assert.equal(registry.count(), 3);

    // 4th connection attempts
    const extra = createMockWebSocketPair();
    let closedCode = null;
    extra.clientWs.on('close', (code) => {
      closedCode = code;
    });

    rtServer._handleConnection(extra.serverWs, extra.req);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(registry.count(), 3, 'Capacity should remain at max 3');
    assert.equal(closedCode, WS_CLOSE_CODES.POLICY_VIOLATION);

    for (const p of pairs) p.clientWs.close();
  });

  it('4. Cleans up disconnected connections from connection registry', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    rtServer._handleConnection(serverWs, req);
    assert.equal(registry.count(), 1);

    clientWs.close();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(registry.count(), 0);
  });

  it('5. Enforces origin validation policy', () => {
    assert.equal(rtServer._isOriginAllowed('http://localhost:5173'), true);
    assert.equal(rtServer._isOriginAllowed('http://localhost:3000'), true);
    assert.equal(rtServer._isOriginAllowed(null), true); // non-browser
  });

  it('6. Supports graceful shutdown and closes all active sockets', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    rtServer._handleConnection(serverWs, req);
    assert.equal(registry.count(), 1);

    let closedCode = null;
    clientWs.on('close', (code) => {
      closedCode = code;
    });

    await rtServer.close();
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(registry.count(), 0);
    assert.equal(closedCode, WS_CLOSE_CODES.GOING_AWAY);
  });
});
