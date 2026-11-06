/**
 * CareConnect Ethiopia - Authentication Middleware & User Context Builder
 * Enforces valid Bearer JWT access tokens and populates enriched, active user context.
 */

import { verifyAccessToken } from '../utils/token.js';
import UserModel from '../models/userModel.js';
import { UnauthorizedError } from '../utils/errors.js';
import { AUTH_CONFIG } from '../constants/index.js';

export async function authenticate(req, res, next) {
  let token = null;

  // 1. Extract from Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1].trim();
  }

  // 2. Fallback to access cookie if configured
  if (!token && req.cookies?.[AUTH_CONFIG.ACCESS_COOKIE_NAME]) {
    token = req.cookies[AUTH_CONFIG.ACCESS_COOKIE_NAME];
  }

  if (!token) {
    return next(new UnauthorizedError('Authentication required. Missing Bearer access token.'));
  }

  try {
    // 3. Cryptographic signature, algorithm, issuer, audience, and expiration verification
    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return next(new UnauthorizedError('Malformed access token payload'));
    }

    // 4. Validate live account status against database
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return next(new UnauthorizedError('Authenticated user account not found'));
    }

    if (user.deleted_at) {
      return next(new UnauthorizedError('User account has been terminated'));
    }

    if (!user.is_active) {
      return next(new UnauthorizedError('User account has been deactivated'));
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return next(new UnauthorizedError('User account is temporarily locked'));
    }

    // 5. Populate safe, normalized authenticated user context
    req.user = {
      userId: Number(user.id),
      id: Number(user.id),
      uuid: user.uuid,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roleId: Number(user.role_id),
      roleName: decoded.roleName || 'HEALTH_CENTRE_STAFF',
      portal: decoded.portal || 'HEALTH_CENTRE',
      facilityId: user.facility_id || null,
      department: user.department || null,
      jobTitle: user.job_title || null
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication: attaches req.user if valid token provided, but doesn't block anonymous access
 */
export async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1]?.trim();
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await UserModel.findById(decoded.userId);
    if (user && user.is_active && !user.deleted_at) {
      req.user = {
        userId: Number(user.id),
        id: Number(user.id),
        uuid: user.uuid,
        email: user.email,
        roleId: Number(user.role_id),
        roleName: decoded.roleName || 'STAFF',
        portal: decoded.portal || 'HEALTH_CENTRE',
        facilityId: user.facility_id || null
      };
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }

  next();
}

export default authenticate;
