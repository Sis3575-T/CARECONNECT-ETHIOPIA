/**
 * CareConnect Ethiopia - In-Memory WebSocket Test Mock Pair
 * Allows comprehensive testing of WebSocket servers, auth handshakes, subscriptions,
 * and event distribution within sandboxed environments without TCP socket port binding.
 */

import { EventEmitter } from 'events';

export class MockWebSocket extends EventEmitter {
  constructor(isServerSide = false) {
    super();
    this.isServerSide = isServerSide;
    this.readyState = 1; // OPEN
    this.peer = null;
    this.isAlive = true;
  }

  setPeer(peer) {
    this.peer = peer;
  }

  send(data) {
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not open');
    }
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
    setImmediate(() => {
      if (this.peer && this.peer.readyState === 1) {
        this.peer.emit('message', buf, false);
      }
    });
  }

  ping() {
    if (this.readyState !== 1) return;
    setImmediate(() => {
      if (this.peer && this.peer.readyState === 1) {
        this.peer.emit('ping');
        // By default WebSocket auto-responds to ping with pong
        this.emit('pong');
      }
    });
  }

  pong() {
    if (this.readyState !== 1) return;
    setImmediate(() => {
      if (this.peer && this.peer.readyState === 1) {
        this.peer.emit('pong');
      }
    });
  }

  close(code = 1000, reason = '') {
    if (this.readyState === 3 /* CLOSED */) return;
    this.readyState = 3;
    setImmediate(() => {
      this.emit('close', code, reason);
      if (this.peer && this.peer.readyState !== 3) {
        this.peer.readyState = 3;
        this.peer.emit('close', code, reason);
      }
    });
  }

  terminate() {
    this.close(1006, 'Abnormal termination');
  }
}

/**
 * Creates an interconnected client-server mock WebSocket pair
 * @param {object} reqOptions - Simulated HTTP Upgrade request headers/properties
 * @returns {{ clientWs: MockWebSocket, serverWs: MockWebSocket, req: object }}
 */
export function createMockWebSocketPair(reqOptions = {}) {
  const clientWs = new MockWebSocket(false);
  const serverWs = new MockWebSocket(true);

  clientWs.setPeer(serverWs);
  serverWs.setPeer(clientWs);

  const req = {
    headers: {
      host: 'localhost:5000',
      origin: reqOptions.origin || 'http://localhost:5173',
      'user-agent': 'careconnect-test-agent',
      ...(reqOptions.headers || {})
    },
    socket: {
      remoteAddress: reqOptions.ip || '127.0.0.1'
    },
    url: reqOptions.url || '/ws'
  };

  return { clientWs, serverWs, req };
}

export default createMockWebSocketPair;
