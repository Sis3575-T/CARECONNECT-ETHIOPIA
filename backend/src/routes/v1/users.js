/**
 * CareConnect Ethiopia - User Management Router
 * Mounts endpoints for user querying and administration under /api/v1/users.
 */

import { Router } from 'express';
import UserController from '../../controllers/userController.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validateUserId, validateUserQuery, validateUserCreate, validateUserUpdate, validateStatusUpdate } from '../../validators/userValidator.js';

const router = Router();

// 1. List users (Requires 'user:manage' permission or System Administrator)
router.get(
  '/',
  authenticate,
  requirePermission('user:manage'),
  validateUserQuery,
  UserController.getUsers
);

// 2. Get user by ID (Permitted for self or administrator with 'user:manage')
router.get(
  '/:userId',
  authenticate,
  validateUserId,
  (req, res, next) => {
    if (req.user && (Number(req.user.userId) === Number(req.params.userId) || Number(req.user.roleId) === 6)) {
      return next();
    }
    return requirePermission('user:manage')(req, res, next);
  },
  UserController.getUserById
);

// 3. Create user account (Requires 'user:manage' permission or System Administrator)
router.post(
  '/',
  authenticate,
  requirePermission('user:manage'),
  validateUserCreate,
  UserController.createUser
);

// 4. Update user account
router.patch(
  '/:userId',
  authenticate,
  validateUserId,
  validateUserUpdate,
  (req, res, next) => {
    // If updating self basic profile (no role change) or user:manage administrator
    if (req.user && Number(req.user.userId) === Number(req.params.userId) && req.body.roleId === undefined) {
      return next();
    }
    return requirePermission('user:manage')(req, res, next);
  },
  UserController.updateUser
);

// 5. Activate / deactivate user account
router.patch(
  '/:userId/status',
  authenticate,
  validateUserId,
  validateStatusUpdate,
  requirePermission('user:manage'),
  UserController.updateUserStatus
);

export default router;
