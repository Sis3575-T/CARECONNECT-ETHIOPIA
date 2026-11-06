/**
 * CareConnect Ethiopia - Audit Router
 * Endpoints for querying compliance and security audit logs under /api/v1/audit.
 */

import { Router } from 'express';
import AuditController from '../../controllers/auditController.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

const router = Router();

// 1. Query audit logs (Requires 'audit:view' permission or System Administrator)
router.get(
  '/logs',
  authenticate,
  requirePermission('audit:view'),
  AuditController.getLogs
);

export default router;
