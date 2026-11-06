/**
 * CareConnect Ethiopia - JWT Token Generation & Verification
 * Enforces strict cryptographic algorithms, issuers, audiences, and short lifetimes.
 */

import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { UnauthorizedError } from './errors.js';

const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'careconnect-backend';
const JWT_AUDIENCE = 'careconnect-portals';

/**
 * Generate short-lived JWT Access Token (15 minutes)
 */
export function generateAccessToken(payload) {
  const userId = payload.id || payload.userId;
  const roleId = payload.roleId || payload.role_id || 1;
  const roleName = payload.roleName || payload.role_name || 'HEALTH_CENTRE_STAFF';
  const portal = payload.portal || payload.portal_access || 'HEALTH_CENTRE';
  const facilityId = payload.facilityId || payload.facility_id || null;

  return jwt.sign(
    {
      userId,
      email: payload.email,
      roleId,
      roleName,
      portal,
      facilityId
    },
    config.jwt.secret,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: config.jwt.expiresIn || '15m',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }
  );
}

/**
 * Verify JWT Access Token with algorithm, issuer, and audience validation
 */
export function verifyAccessToken(token) {
  if (!token || typeof token !== 'string') {
    throw new UnauthorizedError('Access token is required');
  }

  try {
    return jwt.verify(token, config.jwt.secret, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const expiredErr = new UnauthorizedError('Access token has expired. Please refresh session.');
      expiredErr.code = 'TOKEN_EXPIRED';
      throw expiredErr;
    }
    throw new UnauthorizedError('Invalid or corrupted access token.');
  }
}

/**
 * Generate long-lived JWT Refresh Token (fallback or legacy)
 */
export function generateRefreshToken(payload) {
  return jwt.sign(
    {
      userId: payload.id || payload.userId,
      tokenType: 'refresh'
    },
    config.jwt.refreshSecret,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: config.jwt.refreshExpiresIn || '7d',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }
  );
}

/**
 * Verify JWT Refresh Token
 */
export function verifyRefreshToken(token) {
  if (!token || typeof token !== 'string') {
    throw new UnauthorizedError('Refresh token is required');
  }

  try {
    return jwt.verify(token, config.jwt.refreshSecret, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const expiredErr = new UnauthorizedError('Refresh token has expired. Please sign in again.');
      expiredErr.code = 'TOKEN_EXPIRED';
      throw expiredErr;
    }
    throw new UnauthorizedError('Invalid or corrupted refresh token.');
  }
}

export default {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken
};
