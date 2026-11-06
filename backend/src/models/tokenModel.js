/**
 * CareConnect Ethiopia - Refresh Token Model & Delegation Adapter
 * Delegates to SessionModel and SessionService while maintaining backwards compatibility.
 */

import SessionModel from './sessionModel.js';
import crypto from 'crypto';

export class TokenModel {
  static hashToken(token) {
    if (!token) return '';
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async saveRefreshToken(userId, token, ttlMs = 7 * 24 * 60 * 60 * 1000) {
    const tokenHash = this.hashToken(token);
    await SessionModel.createSession({
      userId: Number(userId),
      tokenHash,
      ttlMs
    });
    return true;
  }

  static async isTokenValid(token) {
    if (!token) return false;
    const tokenHash = this.hashToken(token);
    const session = await SessionModel.findByTokenHash(tokenHash);
    if (!session) return false;
    if (session.is_revoked) return false;
    if (new Date(session.expires_at).getTime() < Date.now()) return false;
    return true;
  }

  static async revokeToken(token) {
    if (!token) return false;
    const tokenHash = this.hashToken(token);
    const session = await SessionModel.findByTokenHash(tokenHash);
    if (session) {
      await SessionModel.revokeSession(session.id);
      return true;
    }
    return false;
  }

  static async revokeAllUserTokens(userId) {
    await SessionModel.revokeAllUserSessions(Number(userId));
    return true;
  }

  static clearStore() {
    SessionModel.clearStore();
  }
}

export default TokenModel;
