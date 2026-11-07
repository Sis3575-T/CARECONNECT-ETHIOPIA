/**
 * CareConnect Ethiopia - Real-Time Connection Registry
 * Manages active WebSocket connections, lifecycle state, heartbeat flags,
 * client metadata, and rate limit counters.
 */

import crypto from 'crypto';

export class ConnectionRegistry {
  constructor(options = {}) {
    this.maxConnections = options.maxConnections || 1000;
    this.connections = new Map(); // connectionId -> connectionMeta
    this.socketToId = new WeakMap(); // ws -> connectionId
  }

  /**
   * Registers a newly accepted WebSocket connection
   * @param {object} ws - WebSocket instance
   * @param {object} req - HTTP Upgrade request
   * @returns {object} connectionMeta
   */
  register(ws, req = {}) {
    if (this.connections.size >= this.maxConnections) {
      return null;
    }

    const connectionId = crypto.randomUUID();
    const ip = req.socket?.remoteAddress || req.headers?.['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers?.['user-agent'] || 'unknown';

    const meta = {
      connectionId,
      ws,
      ip,
      userAgent,
      isAlive: true,
      authenticated: false,
      user: null,
      subscriptions: new Set(),
      connectedAt: new Date().toISOString(),
      lastPingAt: null,
      lastPongAt: new Date().toISOString(),
      messageCount: 0,
      windowStartMs: Date.now(),
      authTimer: null
    };

    this.connections.set(connectionId, meta);
    this.socketToId.set(ws, connectionId);

    return meta;
  }

  /**
   * Unregisters and cleans up a connection
   * @param {string|object} idOrWs
   * @returns {object|null} The removed connectionMeta
   */
  unregister(idOrWs) {
    let connectionId = idOrWs;
    if (typeof idOrWs === 'object' && idOrWs !== null) {
      connectionId = this.socketToId.get(idOrWs);
    }

    if (!connectionId || !this.connections.has(connectionId)) {
      return null;
    }

    const meta = this.connections.get(connectionId);
    if (meta.authTimer) {
      clearTimeout(meta.authTimer);
      meta.authTimer = null;
    }

    meta.subscriptions.clear();
    this.connections.delete(connectionId);
    return meta;
  }

  /**
   * Retrieves connection metadata by ID
   */
  get(connectionId) {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Retrieves connection metadata by WebSocket reference
   */
  getBySocket(ws) {
    const id = this.socketToId.get(ws);
    return id ? this.connections.get(id) || null : null;
  }

  /**
   * Retrieves all connections for a specific authenticated user ID
   */
  getByUserId(userId) {
    const numericUserId = Number(userId);
    const results = [];
    for (const meta of this.connections.values()) {
      if (meta.authenticated && meta.user && Number(meta.user.userId || meta.user.id) === numericUserId) {
        results.push(meta);
      }
    }
    return results;
  }

  /**
   * Retrieves all connections associated with an authorized facility ID
   */
  getByFacilityId(facilityId) {
    const results = [];
    for (const meta of this.connections.values()) {
      if (meta.authenticated && meta.user) {
        const u = meta.user;
        const matchesPrimary = u.facilityId && String(u.facilityId) === String(facilityId);
        const matchesAssigned = Array.isArray(u.assignedFacilityIds) && u.assignedFacilityIds.map(String).includes(String(facilityId));
        if (matchesPrimary || matchesAssigned) {
          results.push(meta);
        }
      }
    }
    return results;
  }

  /**
   * Returns active connections count
   */
  count() {
    return this.connections.size;
  }

  /**
   * Returns authenticated connections count
   */
  authenticatedCount() {
    let count = 0;
    for (const meta of this.connections.values()) {
      if (meta.authenticated) count++;
    }
    return count;
  }

  /**
   * Returns all active connection metadata objects
   */
  getAll() {
    return Array.from(this.connections.values());
  }

  /**
   * Closes and clears all connections
   */
  clear() {
    for (const meta of this.connections.values()) {
      if (meta.authTimer) clearTimeout(meta.authTimer);
      try {
        if (meta.ws && meta.ws.readyState === 1 /* OPEN */) {
          meta.ws.close(1000, 'Server shutdown');
        }
      } catch {
        // Ignore close error during clear
      }
    }
    this.connections.clear();
  }
}

export const connectionRegistry = new ConnectionRegistry();
export default connectionRegistry;
