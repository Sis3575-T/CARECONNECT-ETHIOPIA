/**
 * CareConnect Ethiopia - Security & Administrative Audit Controller
 */

import SecurityAuditService from '../services/securityAuditService.js';
import { successResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/index.js';

export class AuditController {
  static async getLogs(req, res, next) {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const offset = (page - 1) * limit;

      const logs = await SecurityAuditService.queryLogs({
        limit,
        offset,
        userId: req.query.userId,
        facilityId: req.query.facilityId,
        eventName: req.query.eventName,
        severity: req.query.severity
      });

      return successResponse(res, { logs }, 'Audit logs retrieved successfully', HTTP_STATUS.OK, {
        pagination: { page, limit }
      });
    } catch (err) {
      next(err);
    }
  }
}

export default AuditController;
