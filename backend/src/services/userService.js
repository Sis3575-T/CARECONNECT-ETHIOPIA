/**
 * CareConnect Ethiopia - User Management Service
 * Business logic and data sanitization for User resources.
 */

import crypto from 'crypto';
import userRepository from '../repositories/userRepository.js';
import PasswordResetModel from '../models/passwordResetModel.js';
import SecurityAuditService from './securityAuditService.js';
import SessionService from './sessionService.js';
import { hashPassword, generateResetToken, hashResetToken } from '../utils/password.js';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { SECURITY_EVENTS } from '../constants/index.js';

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

  /**
   * Authorized user creation by administrator
   */
  static async createUser(actorUser, userData, req = {}) {
    const {
      email,
      firstName,
      lastName,
      roleId = 1,
      phoneNumber,
      facilityId = null,
      department = 'General',
      jobTitle = 'Staff',
      initialPassword = null
    } = userData;

    const requestedRoleId = Number(roleId);

    // 1. Authorization check: Non-administrators cannot create administrative accounts
    if ((requestedRoleId === 6 || requestedRoleId === 7) && Number(actorUser.roleId) !== 6) {
      throw new ForbiddenError('Only System Administrators can grant administrative or regional officer roles');
    }

    // 2. Duplicate account verification
    const cleanEmail = email.trim().toLowerCase();
    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new ConflictError(`User account with email '${cleanEmail}' already exists`);
    }

    // 3. Cryptographic initial password setup
    const plainPassword = initialPassword || crypto.randomBytes(16).toString('hex') + 'A1!';
    const passwordHash = await hashPassword(plainPassword);

    const newUser = await userRepository.create({
      email: cleanEmail,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber ? phoneNumber.trim() : null,
      roleId: requestedRoleId,
      facilityId: facilityId || null,
      department: department ? department.trim() : 'General',
      jobTitle: jobTitle ? jobTitle.trim() : 'Staff'
    });

    // 4. Generate account activation / initial password reset token
    const rawResetToken = generateResetToken();
    const hashedResetToken = hashResetToken(rawResetToken);
    await PasswordResetModel.createToken({
      userId: newUser.id,
      tokenHash: hashedResetToken,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers?.['user-agent'] || 'System',
      ttlMs: 24 * 60 * 60 * 1000 // 24 hours initial setup window
    });

    // 5. Emit security audit event
    await SecurityAuditService.recordEvent({
      eventName: SECURITY_EVENTS.USER_ACCOUNT_CREATED,
      severity: 'INFO',
      userId: actorUser.userId || actorUser.id,
      facilityId: actorUser.facilityId || null,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers?.['user-agent'] || 'Admin Action',
      details: {
        createdUserId: newUser.id,
        createdUserEmail: cleanEmail,
        assignedRoleId: requestedRoleId,
        assignedFacilityId: facilityId
      }
    });

    return {
      user: this.sanitizeUser(newUser),
      passwordSetupRequired: true
    };
  }

  /**
   * Update user information and profiles
   */
  static async updateUser(actorUser, userId, updateData, req = {}) {
    const numericId = Number(userId);
    const targetUser = await userRepository.findById(numericId);
    if (!targetUser) {
      throw new NotFoundError(`User with identifier '${userId}' was not found`);
    }

    // Privilege boundaries: Users cannot change their own role
    if (updateData.roleId !== undefined) {
      const newRoleId = Number(updateData.roleId);
      if (Number(actorUser.userId) === numericId && newRoleId !== Number(targetUser.role_id)) {
        throw new ForbiddenError('Users are not permitted to modify their own assigned role');
      }

      if ((newRoleId === 6 || newRoleId === 7) && Number(actorUser.roleId) !== 6) {
        throw new ForbiddenError('Only System Administrators can grant administrative roles');
      }
    }

    const updated = await userRepository.update(numericId, updateData);

    await SecurityAuditService.recordEvent({
      eventName: SECURITY_EVENTS.USER_ACCOUNT_UPDATED,
      severity: 'INFO',
      userId: actorUser.userId || actorUser.id,
      facilityId: actorUser.facilityId || null,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers?.['user-agent'] || 'Admin Action',
      details: {
        updatedUserId: numericId,
        fieldsModified: Object.keys(updateData)
      }
    });

    const fullUpdated = await userRepository.findById(numericId);
    return this.sanitizeUser(fullUpdated || updated);
  }

  /**
   * Activate or deactivate user account
   */
  static async setUserStatus(actorUser, userId, isActive, req = {}) {
    const numericId = Number(userId);
    const targetUser = await userRepository.findById(numericId);
    if (!targetUser) {
      throw new NotFoundError(`User with identifier '${userId}' was not found`);
    }

    // Administrators cannot deactivate their own account
    if (Number(actorUser.userId) === numericId && !isActive) {
      throw new ForbiddenError('Administrators cannot deactivate their own user account');
    }

    await userRepository.setStatus(numericId, Boolean(isActive));

    // If deactivating, immediately revoke all existing sessions to terminate authenticated access
    if (!isActive) {
      await SessionService.revokeAllSessions(numericId);
    }

    const eventName = isActive
      ? SECURITY_EVENTS.USER_ACCOUNT_ACTIVATED
      : SECURITY_EVENTS.USER_ACCOUNT_DEACTIVATED;

    await SecurityAuditService.recordEvent({
      eventName,
      severity: isActive ? 'INFO' : 'WARNING',
      userId: actorUser.userId || actorUser.id,
      facilityId: actorUser.facilityId || null,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers?.['user-agent'] || 'Admin Action',
      details: {
        targetUserId: numericId,
        targetEmail: targetUser.email,
        isActive: Boolean(isActive)
      }
    });

    const refreshed = await userRepository.findById(numericId);
    return this.sanitizeUser(refreshed);
  }
}

export default UserService;
