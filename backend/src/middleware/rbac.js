/**
 * CareConnect Ethiopia - Role-Based Access Control (RBAC) Middleware
 * Enforces role, portal, and permission boundaries across API endpoints.
 */

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

    // Administrators always have full access
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

export default { requireRole, requirePortal, ROLE_MAP };
