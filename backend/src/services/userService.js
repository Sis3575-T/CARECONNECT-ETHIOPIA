/**
 * CareConnect Ethiopia - User Management Service
 * Business logic and data sanitization for User resources.
 */

import userRepository from '../repositories/userRepository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';

export class UserService {
  /**
   * Safely sanitize user object by stripping cryptographic secrets
   */
  static sanitizeUser(user) {
    if (!user) return null;
    const {
      password_hash,
      refresh_token_hash,
      reset_token_hash,
      dummy,
      ...safeUser
    } = user;

    return {
      id: safeUser.id,
      uuid: safeUser.uuid,
      email: safeUser.email,
      firstName: safeUser.first_name,
      lastName: safeUser.last_name,
      fullName: `${safeUser.first_name || ''} ${safeUser.last_name || ''}`.trim(),
      phoneNumber: safeUser.phone_number,
      roleId: safeUser.role_id,
      roleName: safeUser.role_name,
      roleDisplayName: safeUser.role_display_name,
      portalAccess: safeUser.portal_access,
      facilityId: safeUser.facility_id,
      facilityName: safeUser.facility_name,
      department: safeUser.department,
      jobTitle: safeUser.job_title,
      isActive: Boolean(safeUser.is_active),
      isVerified: Boolean(safeUser.is_verified),
      lastLoginAt: safeUser.last_login_at,
      createdAt: safeUser.created_at,
      updatedAt: safeUser.updated_at
    };
  }

  /**
   * Get single user by ID
   */
  static async getUserById(userId) {
    const numericId = Number(userId);
    if (!numericId || isNaN(numericId)) {
      throw new ValidationError('Invalid user identifier provided');
    }

    const user = await userRepository.findById(numericId);
    if (!user) {
      throw new NotFoundError(`User with identifier '${userId}' was not found`);
    }

    return this.sanitizeUser(user);
  }

  /**
   * List users with pagination and filtering
   */
  static async listUsers(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const roleId = query.roleId !== undefined && query.roleId !== '' ? Number(query.roleId) : null;
    const isActive = query.status !== undefined && query.status !== '' ? query.status === 'active' || query.status === 'true' : null;
    const facilityId = query.facilityId ? String(query.facilityId).trim() : null;
    const search = query.search ? String(query.search).trim() : null;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'DESC';

    const filterOptions = {
      limit,
      offset,
      roleId,
      isActive,
      facilityId,
      search,
      sortBy,
      sortOrder
    };

    const [rawUsers, total] = await Promise.all([
      userRepository.findAll(filterOptions),
      userRepository.count(filterOptions)
    ]);

    const users = rawUsers.map((u) => this.sanitizeUser(u));

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    };
  }
}

export default UserService;
