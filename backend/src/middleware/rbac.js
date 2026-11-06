/**
 * CareConnect Ethiopia - Role-Based Access Control (RBAC) & Permission Middleware
 * Enforces role, portal, and granular permission boundaries across API endpoints.
 */

import { query } from '../config/database.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export const ROLE_MAP = {
  1: { id: 1, name: 'HEALTH_CENTRE_STAFF', portal: 'HEALTH_CENTRE' },
  2: { id: 2, name: 'HOSPITAL_STAFF', portal: 'HOSPITAL' },
  3: { id: 3, name: 'HOSPITAL_TRIAGE', portal: 'HOSPITAL' },
  4: { id: 4, name: 'TRANSPORT_COORDINATOR', portal: 'TRANSPORT' },
  5: { id: 5, name: 'AMBULANCE_DRIVER', portal: 'TRANSPORT' },
  6: { id: 6, name: 'SYSTEM_ADMINISTRATOR', portal: 'ADMINISTRATOR' },
  7: { id: 7, name: 'REGIONAL_OFFICER', portal: 'ADMINISTRATOR' }
};

export const DEFAULT_ROLE_PERMISSIONS = {
  1: ['patient:create', 'patient:view', 'referral:create', 'referral:submit', 'ai:run_ocr', 'ai:view_recommendations'],
  2: ['patient:view', 'referral:accept', 'referral:request_info', 'capacity:report'],
  3: ['patient:view', 'referral:accept', 'referral:reject', 'referral:request_info', 'capacity:report', 'ai:view_recommendations'],
  4: ['transport:request', 'transport:dispatch', 'transport:update_status'],
  5: ['transport:update_status'],
  6: ['user:manage', 'facility:manage', 'audit:view', 'patient:view', 'referral:accept', 'referral:reject', 'transport:dispatch', 'capacity:report'],
  7: ['patient:view', 'audit:view', 'capacity:report', 'ai:view_recommendations']
};

/**
 * Retrieve granular permissions for a given role ID
 */
export async function getPermissionsForRole(roleId) {
  const numericId = Number(roleId);
  try {
    const sql = `
      SELECT p.code 
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `;
    const res = await query(sql, [numericId]);
    if (res.rows && res.rows.length > 0) {
      return res.rows.map((r) => r.code);
    }
  } catch {
    // Fallback to static mapping
  }

  return DEFAULT_ROLE_PERMISSIONS[numericId] || [];
}

/**
 * Require specific system role(s)
 */
export function requireRole(allowedRoles = []) {
  const roleArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before checking permissions'));
    }

    const userRoleId = Number(req.user.roleId);
    const userRoleInfo = ROLE_MAP[userRoleId];

    if (!userRoleInfo) {
      return next(new ForbiddenError('Invalid user role assigned'));
    }

    // Administrators always possess oversight access
    if (userRoleInfo.name === 'SYSTEM_ADMINISTRATOR' || userRoleId === 6) {
      return next();
    }

    const isMatch = roleArray.some((r) => {
      if (typeof r === 'number') return r === userRoleId;
      if (typeof r === 'string') return r.toUpperCase() === userRoleInfo.name;
      return false;
    });

    if (!isMatch) {
      return next(
        new ForbiddenError(`Access denied: Requires role [${roleArray.join(', ')}], user is [${userRoleInfo.name}]`)
      );
    }

    next();
  };
}

/**
 * Require specific portal boundary access
 */
export function requirePortal(portalName) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRoleId = Number(req.user.roleId);
    const userRoleInfo = ROLE_MAP[userRoleId];

    if (!userRoleInfo) {
      return next(new ForbiddenError('User has no valid portal authorization'));
    }

    // Admin can access any portal
    if (userRoleInfo.portal === 'ADMINISTRATOR') {
      return next();
    }

    if (userRoleInfo.portal !== portalName.toUpperCase()) {
      return next(
        new ForbiddenError(
          `Cross-portal access denied: This resource requires ${portalName} portal credentials`
        )
      );
    }

    next();
  };
}

/**
 * Require granular permission code(s)
 */
export function requirePermission(permissionCode) {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRoleId = Number(req.user.roleId);
    if (userRoleId === 6 || req.user.roleName === 'SYSTEM_ADMINISTRATOR') {
      return next(); // Administrators have broad system permissions
    }

    const permissions = await getPermissionsForRole(userRoleId);
    if (!permissions.includes(permissionCode)) {
      return next(
        new ForbiddenError(`Permission denied: Action requires '${permissionCode}' permission`)
      );
    }

    next();
  };
}

export default {
  requireRole,
  requirePortal,
  requirePermission,
  getPermissionsForRole,
  ROLE_MAP,
  DEFAULT_ROLE_PERMISSIONS
};
