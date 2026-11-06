/**
 * CareConnect Ethiopia - Session & Refresh Token Service
 * Manages CSPRNG token generation, SHA-256 hashing, rotation, and reuse attack defense.
 */

import crypto from 'crypto';
import SessionModel from '../models/sessionModel.js';
import UserModel from '../models/userModel.js';
import SecurityAuditService from './securityAuditService.js';
import { generateAccessToken } from '../utils/token.js';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { SECURITY_EVENTS, AUTH_CONFIG } from '../constants/index.js';

export class SessionService {
  /**
   * Compute SHA-256 hash of refresh token
   */
  static hashToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a valid string');
    }
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate raw cryptographically secure 64-byte token
   */
  static generateRawToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Create new authenticated session and issue raw refresh token
   */
  static async createSession(userId, req = {}) {
    const rawRefreshToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();

    const ipAddress = req.headers?.['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers?.['user-agent'] || 'Unknown';

    const session = await SessionModel.createSession({
      userId,
      tokenHash,
      familyId,
      ipAddress,
      userAgent,
      ttlMs: AUTH_CONFIG.REFRESH_TOKEN_TTL_MS
    });

    return {
      refreshToken: rawRefreshToken,
      session
    };
  }

  /**
   * Rotate refresh token with reuse detection
   */
  static async rotateSession(rawRefreshToken, req = {}) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedError('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await SessionModel.findByTokenHash(tokenHash);

    const ipAddress = req.headers?.['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers?.['user-agent'] || 'Unknown';

    // 1. Session does not exist
    if (!session) {
      await SecurityAuditService.recordEvent({
        eventName: SECURITY_EVENTS.USER_LOGIN_FAILED,
        severity: 'WARNING',
        ipAddress,
        userAgent,
        details: { reason: 'Refresh token not recognized' }
      });
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // 2. Token expiration check
    if (new Date(session.expires_at).getTime() < Date.now()) {
      await SessionModel.revokeSession(session.id);
      throw new UnauthorizedError('Refresh token has expired. Please sign in again.');
    }

    // 3. REUSE DETECTION: Token exists but is already revoked!
    if (session.is_revoked) {
      // Invalidate the entire session family to mitigate credential theft
      await SessionModel.revokeFamily(session.family_id || session.uuid);
      await SessionModel.revokeAllUserSessions(session.user_id);

      await SecurityAuditService.recordEvent({
        eventName: SECURITY_EVENTS.REFRESH_TOKEN_REUSED,
        category: 'SECURITY',
        severity: 'CRITICAL',
        userId: session.user_id,
        ipAddress,
        userAgent,
        details: {
          sessionId: session.id,
          familyId: session.family_id,
          alert: 'Compromised refresh token reuse detected; all sessions revoked'
        }
      });

      const err = new UnauthorizedError('Security alert: Refresh token reuse detected. All active sessions have been revoked.');
      err.code = 'TOKEN_REVOKED';
      throw err;
    }

    // 4. Verify user account is still active and valid
    const user = await UserModel.findById(session.user_id);
    if (!user || !user.is_active || user.deleted_at) {
      await SessionModel.revokeAllUserSessions(session.user_id);
      throw new UnauthorizedError('User account not found or deactivated');
    }

    // 5. Valid rotation: Revoke old session and issue new child session in same family
    const newRawRefreshToken = this.generateRawToken();
    const newTokenHash = this.hashToken(newRawRefreshToken);

    // Mark previous session revoked
    await SessionModel.rotateSession(session.id, newTokenHash, new Date(Date.now() + AUTH_CONFIG.REFRESH_TOKEN_TTL_MS));

    // Create successor session in the same family
    await SessionModel.createSession({
      userId: user.id,
      tokenHash: newTokenHash,
      familyId: session.family_id || session.uuid,
      ipAddress,
      userAgent,
      ttlMs: AUTH_CONFIG.REFRESH_TOKEN_TTL_MS
    });

    // Record rotation event
    await SecurityAuditService.recordEvent({
      eventName: SECURITY_EVENTS.REFRESH_TOKEN_ROTATED,
      severity: 'INFO',
      userId: user.id,
      ipAddress,
      userAgent
    });

    // Generate fresh short-lived access token
    const userWithRole = await UserModel.findByEmailWithRole(user.email);
    const newAccessToken = generateAccessToken(userWithRole || user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken
    };
  }

  /**
   * Revoke current session on user logout
   */
  static async revokeCurrentSession(rawRefreshToken) {
    if (!rawRefreshToken) return false;
    try {
      const tokenHash = this.hashToken(rawRefreshToken);
      const session = await SessionModel.findByTokenHash(tokenHash);
      if (session) {
        await SessionModel.revokeSession(session.id);
        return true;
      }
    } catch {
      // Graceful ignore
    }
    return false;
  }

  /**
   * Revoke all sessions for a user (global logout)
   */
  static async revokeAllSessions(userId) {
    if (!userId) return false;
    await SessionModel.revokeAllUserSessions(userId);
    await SecurityAuditService.recordEvent({
      eventName: SECURITY_EVENTS.LOGOUT_ALL,
      severity: 'INFO',
      userId
    });
    return true;
  }

  /**
   * List active sessions for user
   */
  static async listSessions(userId) {
    return SessionModel.listActiveSessions(userId);
  }

  /**
   * Revoke specific session by session ID or UUID
   */
  static async revokeSessionById(userId, sessionId) {
    const sessions = await SessionModel.listActiveSessions(userId);
    const target = sessions.find((s) => s.id === Number(sessionId) || s.uuid === String(sessionId));

    if (!target) {
      throw new NotFoundError('Session not found or already terminated');
    }

    await SessionModel.revokeSession(target.id);
    await SecurityAuditService.recordEvent({
      eventName: SECURITY_EVENTS.SESSION_REVOKED,
      severity: 'INFO',
      userId,
      details: { sessionId: target.id, sessionUuid: target.uuid }
    });

    return true;
  }
}

export default SessionService;
