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
}

export default UserController;
