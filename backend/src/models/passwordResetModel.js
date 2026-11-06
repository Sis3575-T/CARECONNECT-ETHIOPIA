/**
 * CareConnect Ethiopia - Password Reset Token Model
 * Stores SHA-256 cryptographic hashes of single-use password recovery tokens.
 */

import crypto from 'crypto';
import { query } from '../config/database.js';

// In-memory fallback for test runners
const inMemoryResetTokens = new Map(); // tokenHash -> record

export class PasswordResetModel {
  /**
   * Create a new password reset token record
   */
  static async createToken(data) {
    const {
      userId,
      tokenHash,
      ipAddress = '127.0.0.1',
      userAgent = 'Unknown',
      ttlMs = 60 * 60 * 1000 // 1 hour default
    } = data;

    const expiresAt = new Date(Date.now() + ttlMs);
    const tokenUuid = crypto.randomUUID();

    try {
      const sql = `
        INSERT INTO password_reset_tokens (
          uuid, user_id, token_hash, ip_address, user_agent, is_used, expires_at
        ) VALUES ($1, $2, $3, $4, $5, FALSE, $6)
        RETURNING id, uuid, user_id, token_hash, is_used, expires_at, created_at
      `;
      const res = await query(sql, [tokenUuid, userId, tokenHash, ipAddress, userAgent, expiresAt]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // In-memory fallback
    }

    const record = {
      id: inMemoryResetTokens.size + 1,
      uuid: tokenUuid,
      user_id: Number(userId),
      token_hash: tokenHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      is_used: false,
      expires_at: expiresAt,
      used_at: null,
      created_at: new Date()
    };
    inMemoryResetTokens.set(tokenHash, record);
    return record;
  }

  /**
   * Find token record by SHA-256 hash
   */
  static async findByTokenHash(tokenHash) {
    if (!tokenHash) return null;

    try {
      const sql = `
        SELECT * FROM password_reset_tokens 
        WHERE token_hash = $1
      `;
      const res = await query(sql, [tokenHash]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // In-memory fallback
    }

    return inMemoryResetTokens.get(tokenHash) || null;
  }

  /**
   * Mark token as consumed/used
   */
  static async markTokenUsed(tokenId, tokenHash) {
    const now = new Date();
    try {
      const sql = `
        UPDATE password_reset_tokens 
        SET is_used = TRUE, used_at = $1 
        WHERE id = $2 OR token_hash = $3
      `;
      await query(sql, [now, tokenId || 0, tokenHash || '']);
    } catch {
      // Fallback
    }

    if (tokenHash && inMemoryResetTokens.has(tokenHash)) {
      const rec = inMemoryResetTokens.get(tokenHash);
      rec.is_used = true;
      rec.used_at = now;
    }
    return true;
  }

  /**
   * Clear in-memory tokens
   */
  static clearStore() {
    inMemoryResetTokens.clear();
  }
}

export default PasswordResetModel;
