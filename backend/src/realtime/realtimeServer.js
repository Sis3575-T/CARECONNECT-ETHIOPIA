/**
 * CareConnect Ethiopia - Real-Time WebSocket Server
 * Attaches to HTTP server, manages connection upgrades, origin validation,
 * heartbeat lifecycle, message framing limits, and graceful shutdown.
 */

import { WebSocketServer, WebSocket } from 'ws';
import config from '../config/env.js';
import { connectionRegistry } from './connectionRegistry.js';
import { WS_CLOSE_CODES, SERVER_MESSAGE_TYPES, CLIENT_MESSAGE_TYPES } from '../constants/realtime.js';
import { extractAuthToken, authenticateConnection, createAuthMessageHandler } from './websocketAuth.js';
import { subscriptionManager } from './subscriptionManager.js';

export class RealtimeServer {
  constructor(options = {}) {
    this.httpServer = options.httpServer || null;
    this.path = options.path || config.realtime?.path || '/ws';
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || config.realtime?.heartbeatIntervalMs || 30000;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs || config.realtime?.heartbeatTimeoutMs || 10000;
    this.authTimeoutMs = options.authTimeoutMs || config.realtime?.authTimeoutMs || 5000;
    this.maxPayloadBytes = options.maxPayloadBytes || config.realtime?.maxPayloadBytes || 16384;
    this.allowedOrigins = options.allowedOrigins || config.cors?.allowedOrigins || [];
    this.registry = options.registry || connectionRegistry;
    this.subscriptionManager = options.subscriptionManager || subscriptionManager;
    this.subscriptionManager.setRegistry(this.registry);

    this.wss = null;
    this.heartbeatTimer = null;
    this.isShuttingDown = false;
    this.messageHandlers = new Set();

    // Register core authentication and subscription message handlers
    this.addMessageHandler(createAuthMessageHandler(this.registry, this.subscriptionManager));
    this.addMessageHandler(this._createSubscriptionMessageHandler());
  }

  /**
   * Generates handler for subscription and unsubscription client commands
   */
  _createSubscriptionMessageHandler() {
    return async (ws, meta, message) => {
      if (message.type === CLIENT_MESSAGE_TYPES.SUBSCRIBE) {
        if (!meta.authenticated) {
          this._send(ws, {
            type: SERVER_MESSAGE_TYPES.ERROR,
            code: 'AUTHENTICATION_REQUIRED',
            error: 'Authentication required before subscribing to channels'
          });
          return;
        }

        const res = await this.subscriptionManager.subscribe(meta, message.channel);
        if (res.success) {
          this._send(ws, {
            type: SERVER_MESSAGE_TYPES.SUBSCRIBED,
            channel: res.channel,
            duplicate: Boolean(res.duplicate)
          });
        } else {
          this._send(ws, {
            type: SERVER_MESSAGE_TYPES.ERROR,
            code: 'FORBIDDEN_CHANNEL',
            channel: message.channel,
            error: res.error
          });
        }
        return;
      }

      if (message.type === CLIENT_MESSAGE_TYPES.UNSUBSCRIBE) {
        const res = this.subscriptionManager.unsubscribe(meta, message.channel);
        this._send(ws, {
          type: SERVER_MESSAGE_TYPES.UNSUBSCRIBED,
          channel: res.channel
        });
        return;
      }
    };
  }

  /**
   * Initializes and binds the WebSocketServer to the given HTTP server
   * @param {import('http').Server} httpServer
   */
  initialize(httpServer) {
    if (this.wss) return this.wss;
    this.httpServer = httpServer;

    this.wss = new WebSocketServer({
      noServer: true,
      maxPayload: this.maxPayloadBytes
    });

    // Bind HTTP upgrade listener
    this.httpServer.on('upgrade', this._handleUpgrade.bind(this));

    // Listen for accepted WebSocket connections
    this.wss.on('connection', this._handleConnection.bind(this));

    // Start background heartbeat monitor
    this._startHeartbeat();

    return this.wss;
  }

  /**
   * Handles HTTP Upgrade requests with origin and path security checks
   */
  _handleUpgrade(req, socket, head) {
    if (this.isShuttingDown) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (parsedUrl.pathname !== this.path && parsedUrl.pathname !== `${this.path}/`) {
        // Not a WebSocket path; let next handlers or 404 take care of it
        return;
      }
    } catch {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    // 1. Origin validation
    const origin = req.headers.origin;
    if (origin && !this._isOriginAllowed(origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    // 2. Capacity limit check
    if (this.registry.count() >= (config.realtime?.maxConnections || 1000)) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }

    // 3. Complete WebSocket upgrade
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req);
    });
  }

  /**
   * Validates request origin against allowed CORS origins
   */
  _isOriginAllowed(origin) {
    if (!origin) return true;
    if (config.isDevelopment || config.isTest) return true;
    return this.allowedOrigins.includes(origin);
  }

  /**
   * Configures newly established WebSocket connection
   */
  _handleConnection(ws, req) {
    const meta = this.registry.register(ws, req);
    if (!meta) {
      ws.close(WS_CLOSE_CODES.POLICY_VIOLATION, 'Connection limit reached');
      return;
    }

    // Heartbeat setup
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
      meta.isAlive = true;
      meta.lastPongAt = new Date().toISOString();
    });

    // Send initial greeting frame
    this._send(ws, {
      type: SERVER_MESSAGE_TYPES.CONNECTED,
      connectionId: meta.connectionId,
      serverTime: new Date().toISOString(),
      heartbeatIntervalMs: this.heartbeatIntervalMs,
      authRequired: true,
      authTimeoutMs: this.authTimeoutMs
    });

    // Immediate handshake authentication if token present in request headers/cookie
    const { token: initialToken, error: tokenErr } = extractAuthToken(req);
    if (tokenErr) {
      this._send(ws, {
        type: SERVER_MESSAGE_TYPES.AUTH_ERROR,
        error: tokenErr
      });
      ws.close(WS_CLOSE_CODES.POLICY_VIOLATION, tokenErr);
      return;
    }

    if (initialToken) {
      authenticateConnection(meta, initialToken, this.registry).then(async (result) => {
        if (result.success && ws.readyState === WebSocket.OPEN) {
          try {
            await this.subscriptionManager.autoSubscribe(meta);
          } catch {
            // Ignore auto-subscribe errors
          }
          this._send(ws, {
            type: SERVER_MESSAGE_TYPES.AUTH_SUCCESS,
            user: result.user
          });
        } else if (!result.success && ws.readyState === WebSocket.OPEN) {
          this._send(ws, {
            type: SERVER_MESSAGE_TYPES.AUTH_ERROR,
            error: result.error
          });
          ws.close(result.code || WS_CLOSE_CODES.UNAUTHORIZED, result.error);
        }
      });
    }

    // Schedule authentication timeout enforcement
    meta.authTimer = setTimeout(() => {
      if (!meta.authenticated && ws.readyState === WebSocket.OPEN) {
        this._send(ws, {
          type: SERVER_MESSAGE_TYPES.AUTH_ERROR,
          error: 'Authentication timed out. Disconnecting.'
        });
        ws.close(WS_CLOSE_CODES.AUTH_TIMEOUT, 'Authentication timeout');
      }
    }, this.authTimeoutMs);

    if (meta.authTimer.unref) {
      meta.authTimer.unref();
    }

    // Message handler
    ws.on('message', async (data, isBinary) => {
      if (isBinary) {
        this._send(ws, {
          type: SERVER_MESSAGE_TYPES.ERROR,
          error: 'Binary frames are not supported'
        });
        return;
      }

      await this._handleMessage(ws, meta, data);
    });

    // Error handling
    ws.on('error', (err) => {
      this.subscriptionManager.cleanupConnection(meta.connectionId);
      this.registry.unregister(meta.connectionId);
    });

    // Disconnect cleanup
    ws.on('close', (code, reason) => {
      this.subscriptionManager.cleanupConnection(meta.connectionId);
      this.registry.unregister(meta.connectionId);
    });
  }

  /**
   * Internal message dispatcher
   */
  async _handleMessage(ws, meta, rawData) {
    let parsed;
    try {
      parsed = JSON.parse(rawData.toString());
    } catch {
      this._send(ws, {
        type: SERVER_MESSAGE_TYPES.ERROR,
        error: 'Malformed JSON message payload'
      });
      return;
    }

    if (!parsed || typeof parsed !== 'object') {
      this._send(ws, {
        type: SERVER_MESSAGE_TYPES.ERROR,
        error: 'Message payload must be an object'
      });
      return;
    }

    // Protocol-level ping / pong
    if (parsed.type === CLIENT_MESSAGE_TYPES.PING) {
      this._send(ws, {
        type: SERVER_MESSAGE_TYPES.PONG,
        clientTimestamp: parsed.timestamp || null,
        serverTime: new Date().toISOString()
      });
      return;
    }

    if (parsed.type === CLIENT_MESSAGE_TYPES.PONG) {
      meta.isAlive = true;
      meta.lastPongAt = new Date().toISOString();
      return;
    }

    // Invoke registered message handlers (e.g. auth, subscriptions)
    for (const handler of this.messageHandlers) {
      try {
        await handler(ws, meta, parsed);
      } catch (err) {
        this._send(ws, {
          type: SERVER_MESSAGE_TYPES.ERROR,
          error: err.message || 'Internal handler error'
        });
      }
    }
  }

  /**
   * Registers a high-level message handler
   */
  addMessageHandler(handler) {
    if (typeof handler === 'function') {
      this.messageHandlers.add(handler);
    }
  }

  /**
   * Safely serializes and sends a JSON message
   */
  _send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch {
        // Socket closed or transmission error
      }
    }
  }

  /**
   * Heartbeat sweep timer
   */
  _startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      const allConnections = this.registry.getAll();
      for (const meta of allConnections) {
        const ws = meta.ws;
        if (!meta.isAlive) {
          // Client did not respond to last ping within interval
          this.registry.unregister(meta.connectionId);
          try {
            ws.terminate();
          } catch {
            // Ignore termination errors
          }
        } else {
          meta.isAlive = false;
          meta.lastPingAt = new Date().toISOString();
          try {
            ws.ping();
          } catch {
            this.registry.unregister(meta.connectionId);
          }
        }
      }
    }, this.heartbeatIntervalMs);

    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  /**
   * Graceful shutdown of real-time server
   */
  async close(timeoutMs = 5000) {
    this.isShuttingDown = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Broadcast shutdown notice and close all active sockets
    const all = this.registry.getAll();
    for (const meta of all) {
      if (meta.authTimer) clearTimeout(meta.authTimer);
      if (meta.ws && meta.ws.readyState === WebSocket.OPEN) {
        try {
          this._send(meta.ws, {
            type: SERVER_MESSAGE_TYPES.WARNING,
            message: 'Server is shutting down gracefully'
          });
          meta.ws.close(WS_CLOSE_CODES.GOING_AWAY, 'Server shutting down');
        } catch {
          // Ignore
        }
      }
    }
    this.registry.clear();

    return new Promise((resolve) => {
      if (!this.wss) return resolve();
      const timer = setTimeout(() => {
        resolve();
      }, timeoutMs);

      this.wss.close(() => {
        clearTimeout(timer);
        this.wss = null;
        resolve();
      });
    });
  }
}

export const realtimeServer = new RealtimeServer();
export default realtimeServer;
