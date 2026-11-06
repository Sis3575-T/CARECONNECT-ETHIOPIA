/**
 * CareConnect Ethiopia - Facility Tenancy Boundary Middleware
 * Restricts healthcare providers to authorized facility records and prevents unauthorized data leaks.
 */

import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export function enforceFacilityAccess(options = {}) {
  const { allowAdmin = true, paramKey = 'facilityId', bodyKey = 'facilityId' } = options;

  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required to verify facility tenancy'));
    }

    const userRoleId = Number(req.user.roleId);
    const userFacilityId = req.user.facilityId;

    // Administrators and Regional Officers have broad oversight permissions
    if (allowAdmin && (userRoleId === 6 || userRoleId === 7)) {
      return next();
    }

    if (!userFacilityId) {
      return next(new ForbiddenError('User has no assigned healthcare facility'));
    }

    // Determine target facility from params, query, or body
    const targetFacilityId = req.params[paramKey] || req.query[paramKey] || (req.body && req.body[bodyKey]);

    if (targetFacilityId && targetFacilityId !== userFacilityId) {
      return next(
        new ForbiddenError(
          `Facility tenancy violation: You are authorized for facility [${userFacilityId}], but requested [${targetFacilityId}]`
        )
      );
    }

    // Automatically inject and bound facility context
    req.facilityId = userFacilityId;
    next();
  };
}

export default enforceFacilityAccess;
