/**
 * CareConnect Ethiopia - WebSocket Connection Authentication
 * Validates JWT access tokens, active user status, session validity,
 * and concurrent connection limits. Prohibits tokens in URL query strings.
 */

import { verifyAccessToken } from '../utils/token.js';
import UserModel from '../models/userModel.js';
import assignmentRepository from '../repositories/assignmentRepository.js';
import { WS_CLOSE_CODES, SERVER_MESSAGE_TYPES, CLIENT_MESSAGE_TYPES } from '../constants/realtime.js';

export const MAX_CONNECTIONS_PER_USER = 5;

/**
 * Extracts authentication token from allowed secure channels
 * Strictly prohibits tokens in query parameters for security.
 * @param {object} req - HTTP request
 * @param {object} [message] - Optional incoming WebSocket frame
 * @returns {{ token: string|null, error: string|null }}
 */
export function extractAuthToken(req = {}, message = null) {
  // 1. Prohibit query string tokens
  if (req.url && (req.url.includes('token=') || req.url.includes('access_token='))) {
    return {
      token: null,
      error: 'Access tokens in URL query parameters are strictly prohibited'
    };
  }

  // 2. Extract from message payload if provided
  if (message && message.type === CLIENT_MESSAGE_TYPES.AUTH && message.token) {
    return { token: String(message.token).trim(), error: null };
  }

  // 3. Extract from Authorization Bearer header
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { token: authHeader.substring(7).trim(), error: null };
  }

  // 4. Extract from Sec-WebSocket-Protocol header (e.g. ['careconnect-auth', '<token>'])
  const protoHeader = req.headers?.['sec-websocket-protocol'];
  if (protoHeader) {
    const parts = protoHeader.split(',').map((p) => p.trim());
    if (parts.length >= 2 && parts[0] === 'careconnect-auth') {
      return { token: parts[1], error: null };
    }
  }

  // 5. Extract from Cookie header (careconnect_access_token)
  const cookieHeader = req.headers?.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/careconnect_access_token=([^;]+)/);
    if (match && match[1]) {
      return { token: decodeURIComponent(match[1]), error: null };
    }
  }

  return { token: null, error: null };
}

/**
 * Validates and authenticates a connection metadata instance
 * @param {object} meta - Connection registry metadata
 * @param {string} token - JWT access token
 * @param {object} [registry] - Connection registry to check limits
 * @returns {Promise<{ success: boolean, user?: object, error?: string, code?: number }>}
 */
export async function authenticateConnection(meta, token, registry = null) {
  if (!token) {
    return {
      success: false,
      error: 'Authentication token is required',
      code: WS_CLOSE_CODES.UNAUTHORIZED
    };
  }

  try {
    // 1. Cryptographic token verification
    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.userId) {
      return {
        success: false,
        error: 'Malformed or invalid access token',
        code: WS_CLOSE_CODES.UNAUTHORIZED
      };
    }

    // 2. User existence & live account status
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return {
        success: false,
        error: 'User account not found',
        code: WS_CLOSE_CODES.UNAUTHORIZED
      };
    }

    if (user.deleted_at) {
      return {
        success: false,
        error: 'User account has been terminated',
        code: WS_CLOSE_CODES.FORBIDDEN
      };
    }

    if (!user.is_active) {
      return {
        success: false,
        error: 'User account is deactivated',
        code: WS_CLOSE_CODES.FORBIDDEN
      };
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return {
        success: false,
        error: 'User account is temporarily locked',
        code: WS_CLOSE_CODES.FORBIDDEN
      };
    }

    // 3. Enforce per-user connection limits
    if (registry) {
      const existingUserConns = registry.getByUserId(decoded.userId);
      if (existingUserConns.length >= MAX_CONNECTIONS_PER_USER) {
        return {
          success: false,
          error: `Concurrent connection limit reached (${MAX_CONNECTIONS_PER_USER} connections max per user)`,
          code: WS_CLOSE_CODES.RATE_LIMITED
        };
      }
    }

    // 4. Resolve assigned facilities for tenant isolation
    let assignedFacilityIds = [];
    try {
      if (assignmentRepository && typeof assignmentRepository.findByUserId === 'function') {
        const assignments = await assignmentRepository.findByUserId(user.id);
        if (Array.isArray(assignments)) {
          assignedFacilityIds = assignments.filter((a) => a.is_active).map((a) => a.facility_id);
        }
      }
    } catch {
      // In-memory / disconnected fallback
    }

    if (user.facility_id && !assignedFacilityIds.includes(user.facility_id)) {
      assignedFacilityIds.push(user.facility_id);
    }

    // 5. Populate authenticated user context on connection meta
    meta.authenticated = true;
    meta.user = {
      userId: Number(user.id),
      id: Number(user.id),
      uuid: user.uuid,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roleId: Number(user.role_id),
      roleName: decoded.roleName || user.role_name || 'HEALTH_CENTRE_STAFF',
      portal: decoded.portal || user.portal_access || 'HEALTH_CENTRE',
      facilityId: user.facility_id || null,
      assignedFacilityIds,
      department: user.department || null,
      jobTitle: user.job_title || null
    };

    // 6. Clear auth timeout timer
    if (meta.authTimer) {
      clearTimeout(meta.authTimer);
      meta.authTimer = null;
    }

    return {
      success: true,
      user: {
        userId: meta.user.userId,
        uuid: meta.user.uuid,
        email: meta.user.email,
        roleName: meta.user.roleName,
        portal: meta.user.portal,
        facilityId: meta.user.facilityId,
        assignedFacilityIds: meta.user.assignedFacilityIds
      }
    };
  } catch (err) {
    const isExpired = err.code === 'TOKEN_EXPIRED' || err.name === 'TokenExpiredError';
    return {
      success: false,
      error: isExpired ? 'Access token has expired' : (err.message || 'Authentication failed'),
      code: isExpired ? WS_CLOSE_CODES.SESSION_EXPIRED : WS_CLOSE_CODES.UNAUTHORIZED
    };
  }
}

/**
 * Creates authentication message handler for RealtimeServer
 */
export function createAuthMessageHandler(registry) {
  return async (ws, meta, message) => {
    if (message.type === CLIENT_MESSAGE_TYPES.AUTH) {
      if (meta.authenticated) {
        // Already authenticated
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: SERVER_MESSAGE_TYPES.WARNING,
            message: 'Connection is already authenticated'
          }));
        }
        return;
      }

      const result = await authenticateConnection(meta, message.token, registry);
      if (result.success) {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: SERVER_MESSAGE_TYPES.AUTH_SUCCESS,
            user: result.user
          }));
        }
      } else {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: SERVER_MESSAGE_TYPES.AUTH_ERROR,
            error: result.error
          }));
          ws.close(result.code || WS_CLOSE_CODES.UNAUTHORIZED, result.error);
        }
      }
      return;
    }

    // If client sends non-auth command while unauthenticated, block it
    if (!meta.authenticated && [CLIENT_MESSAGE_TYPES.SUBSCRIBE, CLIENT_MESSAGE_TYPES.UNSUBSCRIBE, CLIENT_MESSAGE_TYPES.SYNC].includes(message.type)) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: SERVER_MESSAGE_TYPES.AUTH_ERROR,
          error: 'Authentication required. Send auth frame first.'
        }));
        ws.close(WS_CLOSE_CODES.UNAUTHORIZED, 'Authentication required');
      }
    }
  };
}

export default {
  extractAuthToken,
  authenticateConnection,
  createAuthMessageHandler,
  MAX_CONNECTIONS_PER_USER
};
