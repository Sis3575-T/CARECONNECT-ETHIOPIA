/**
 * CareConnect Ethiopia - Roles & Permissions Router
 * Mounts endpoints for viewing platform roles and role-permission matrices under /api/v1/roles.
 */

import { Router } from 'express';
import AssignmentController from '../../controllers/assignmentController.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// 1. List all system roles
router.get('/', authenticate, AssignmentController.getAllRoles);

// 2. Get permissions attached to a specific role
router.get('/:roleId/permissions', authenticate, AssignmentController.getRolePermissions);

export default router;
