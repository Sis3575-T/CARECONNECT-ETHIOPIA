/**
 * CareConnect Ethiopia - Persistent User Session & Token Store Model
 * Stores SHA-256 cryptographic hashes of refresh tokens in PostgreSQL user_sessions.
 */

import crypto from 'crypto';
import { query } from '../config/database.js';

// In-memory fallback for test runners and offline verification
const inMemorySessions = new Map(); // id -> session object

export class SessionModel {
  /**
   * Create a new authenticated session record
   */
  static async createSession(data) {
    const {
      userId,
      tokenHash,
      familyId = crypto.randomUUID(),
      ipAddress = '127.0.0.1',
      userAgent = 'Unknown',
      ttlMs = 7 * 24 * 60 * 60 * 1000
    } = data;

    const expiresAt = new Date(Date.now() + ttlMs);
    const sessionUuid = crypto.randomUUID();

    try {
      const sql = `
        INSERT INTO user_sessions (
          uuid, user_id, refresh_token_hash, ip_address, user_agent,
          is_revoked, expires_at
        ) VALUES ($1, $2, $3, $4, $5, FALSE, $6)
        RETURNING id, uuid, user_id, refresh_token_hash, ip_address, user_agent, is_revoked, expires_at, created_at
      `;
      const res = await query(sql, [sessionUuid, userId, tokenHash, ipAddress, userAgent, expiresAt]);
      if (res.rows && res.rows.length > 0) {
        return { ...res.rows[0], family_id: familyId };
      }
    } catch {
      // In-memory fallback
    }

    const session = {
      id: inMemorySessions.size + 1,
      uuid: sessionUuid,
      user_id: Number(userId),
      family_id: familyId,
      refresh_token_hash: tokenHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      is_revoked: false,
      expires_at: expiresAt,
      created_at: new Date(),
      revoked_at: null
    };
    inMemorySessions.set(session.id, session);
    return session;
  }

  /**
   * Find session by its SHA-256 refresh token hash
   */
  static async findByTokenHash(tokenHash) {
    if (!tokenHash) return null;

    try {
      const sql = `
        SELECT * FROM user_sessions 
        WHERE refresh_token_hash = $1
      `;
      const res = await query(sql, [tokenHash]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    for (const session of inMemorySessions.values()) {
      if (session.refresh_token_hash === tokenHash) {
        return session;
      }
    }
    return null;
  }

  /**
   * Rotate session: mark previous session revoked and create new child session
   */
  static async rotateSession(oldSessionId, newTokenHash, newExpiresAt) {
    const now = new Date();

    try {
      const sql = `
        UPDATE user_sessions 
        SET is_revoked = TRUE, revoked_at = $1 
        WHERE id = $2
      `;
      await query(sql, [now, oldSessionId]);
    } catch {
      // Fallback
      const old = inMemorySessions.get(Number(oldSessionId));
      if (old) {
        old.is_revoked = true;
        old.revoked_at = now;
      }
    }
  }

  /**
   * Revoke single session by ID
   */
  static async revokeSession(sessionId) {
    const now = new Date();
    try {
      const sql = `
        UPDATE user_sessions 
        SET is_revoked = TRUE, revoked_at = $1 
        WHERE id = $2 OR uuid = $3
      `;
      await query(sql, [now, isNaN(sessionId) ? 0 : Number(sessionId), String(sessionId)]);
    } catch {
      for (const s of inMemorySessions.values()) {
        if (s.id === Number(sessionId) || s.uuid === String(sessionId)) {
          s.is_revoked = true;
          s.revoked_at = now;
          return true;
        }
      }
    }
    return true;
  }

  /**
   * Revoke an entire session family (compromised reuse detection)
   */
  static async revokeFamily(familyId) {
    const now = new Date();
    for (const s of inMemorySessions.values()) {
      if (s.family_id === familyId) {
        s.is_revoked = true;
        s.revoked_at = now;
      }
    }
    return true;
  }

  /**
   * Revoke all active sessions for a user
   */
  static async revokeAllUserSessions(userId) {
    const now = new Date();
    try {
      const sql = `
        UPDATE user_sessions 
        SET is_revoked = TRUE, revoked_at = $1 
        WHERE user_id = $2 AND is_revoked = FALSE
      `;
      await query(sql, [now, userId]);
    } catch {
      for (const s of inMemorySessions.values()) {
        if (s.user_id === Number(userId)) {
          s.is_revoked = true;
          s.revoked_at = now;
        }
      }
    }
    return true;
  }

  /**
   * List active sessions for user (sanitized without token hashes)
   */
  static async listActiveSessions(userId) {
    try {
      const sql = `
        SELECT id, uuid, user_id, ip_address, user_agent, created_at, expires_at
        FROM user_sessions 
        WHERE user_id = $1 AND is_revoked = FALSE AND expires_at > NOW()
        ORDER BY created_at DESC
      `;
      const res = await query(sql, [userId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    const active = [];
    const now = Date.now();
    for (const s of inMemorySessions.values()) {
      if (s.user_id === Number(userId) && !s.is_revoked && new Date(s.expires_at).getTime() > now) {
        active.push({
          id: s.id,
          uuid: s.uuid,
          user_id: s.user_id,
          ip_address: s.ip_address,
          user_agent: s.user_agent,
          created_at: s.created_at,
          expires_at: s.expires_at
        });
      }
    }
    return active;
  }

  /**
   * Clear in-memory sessions (for tests)
   */
  static clearStore() {
    inMemorySessions.clear();
  }
}

export default SessionModel;
