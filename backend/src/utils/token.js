/**
 * CareConnect Ethiopia - JWT Token Generation & Verification
 */

import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { UnauthorizedError } from './errors.js';

/**
 * Generate short-lived JWT Access Token
 */
export function generateAccessToken(payload) {
  return jwt.sign(
    {
      userId: payload.id || payload.userId,
      email: payload.email,
      roleId: payload.roleId || payload.role_id,
      facilityId: payload.facilityId || payload.facility_id
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * Verify JWT Access Token
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token has expired. Please refresh session.');
    }
    throw new UnauthorizedError('Invalid or corrupted access token.');
  }
}

/**
 * Generate long-lived JWT Refresh Token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(
    {
      userId: payload.id || payload.userId,
      tokenType: 'refresh'
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

/**
 * Verify JWT Refresh Token
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Refresh token has expired. Please sign in again.');
    }
    throw new UnauthorizedError('Invalid or corrupted refresh token.');
  }
}

export default { generateAccessToken, verifyAccessToken, generateRefreshToken, verifyRefreshToken };
