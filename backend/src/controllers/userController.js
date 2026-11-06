/**
 * CareConnect Ethiopia - User Management Controller
 * Handles HTTP requests for user directory, profile lookup, and administrative tasks.
 */

import UserService from '../services/userService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/index.js';

export class UserController {
  /**
   * List users with server-side pagination, filtering, and sorting
   * GET /api/v1/users
   */
  static async getUsers(req, res, next) {
    try {
      const result = await UserService.listUsers(req.query);
      return paginatedResponse(
        res,
        result.users,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Users retrieved successfully'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single user profile by identifier
   * GET /api/v1/users/:userId
   */
  static async getUserById(req, res, next) {
    try {
      const user = await UserService.getUserById(req.params.userId);
      return successResponse(res, { user }, 'User retrieved successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create new user account with administrative authorization
   * POST /api/v1/users
   */
  static async createUser(req, res, next) {
    try {
      const result = await UserService.createUser(req.user, req.body, req);
      return successResponse(
        res,
        result,
        'User account created successfully',
        HTTP_STATUS.CREATED
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update user details and profile
   * PATCH /api/v1/users/:userId
   */
  static async updateUser(req, res, next) {
    try {
      const user = await UserService.updateUser(req.user, req.params.userId, req.body, req);
      return successResponse(res, { user }, 'User updated successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Activate or deactivate user account
   * PATCH /api/v1/users/:userId/status
   */
  static async updateUserStatus(req, res, next) {
    try {
      const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : req.body.status === 'active';
      const user = await UserService.setUserStatus(req.user, req.params.userId, isActive, req);
      const actionLabel = isActive ? 'activated' : 'deactivated';
      return successResponse(res, { user }, `User account ${actionLabel} successfully`, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }
}

export default UserController;
