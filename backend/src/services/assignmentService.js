/**
 * CareConnect Ethiopia - Staff & Role Assignment Service
 * Enforces business logic and security boundaries for multi-facility and multi-role assignments.
 */

import assignmentRepository from '../repositories/assignmentRepository.js';
import userRepository from '../repositories/userRepository.js';
import facilityRepository from '../repositories/facilityRepository.js';
import SecurityAuditService from './securityAuditService.js';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { SECURITY_EVENTS } from '../constants/index.js';

export class AssignmentService {
  /**
   * Get active facility assignments for a user
   */
  static async getUserFacilities(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with identifier '${userId}' was not found`);
    }
    return assignmentRepository.getUserFacilityAssignments(userId);
  }

  /**
   * Assign user to a healthcare facility
   */
  static async assignUserFacility(actorUser, userId, assignmentData, req = {}) {
    const { facilityId, departmentId, assignmentRole = 'Staff', isPrimary = true } = assignmentData;

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User '${userId}' was not found`);
    }

    const facility = await facilityRepository.findById(facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${facilityId}' was not found`);
    }

    // Prevent duplicate active assignments
    const existing = await assignmentRepository.findActiveAssignment(userId, facilityId);
    if (existing) {
      throw new ConflictError(`User is already actively assigned to facility '${facilityId}'`);
    }

    const assignment = await assignmentRepository.createStaffAssignment({
      userId,
      facilityId,
      departmentId: departmentId ? Number(departmentId) : null,
      assignmentRole,
      isPrimary
    });

    // If primary or user currently has no facility, update user record
    if (isPrimary || !user.facility_id) {
      await userRepository.update(userId, { facilityId });
    }

    await SecurityAuditService.recordEvent({
      eventName: SECURITY_EVENTS.FACILITY_STAFF_ASSIGNED,
      severity: 'INFO',
      userId: actorUser.userId || actorUser.id,
      facilityId,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers?.['user-agent'] || 'Admin Action',
      details: {
        assignedUserId: Number(userId),
        facilityId,
        assignmentRole,
        isPrimary
      }
    });

    return assignment;
  }

  /**
   * Remove or end user facility assignment
   */
  static async removeUserFacility(actorUser, userId, facilityId, req = {}) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User '${userId}' was not found`);
    }

    const existing = await assignmentRepository.findActiveAssignment(userId, facilityId);
    if (!existing) {
      throw new NotFoundError(`No active assignment found for user at facility '${facilityId}'`);
    }

    await assignmentRepository.endStaffAssignment(userId, facilityId);

    // If this was primary facility, unset it
    if (user.facility_id === facilityId) {
      await userRepository.update(userId, { facilityId: null });
    }

    await SecurityAuditService.recordEvent({
      eventName: SECURITY_EVENTS.FACILITY_STAFF_REMOVED,
      severity: 'INFO',
      userId: actorUser.userId || actorUser.id,
      facilityId,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers?.['user-agent'] || 'Admin Action',
      details: {
        removedUserId: Number(userId),
        facilityId
      }
    });

    return { success: true, message: `Assignment to facility '${facilityId}' ended successfully` };
  }

  /**
   * Get active staff assigned to a facility
   */
  static async getFacilityStaff(facilityId) {
    const facility = await facilityRepository.findById(facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${facilityId}' was not found`);
    }
    return assignmentRepository.getFacilityStaff(facilityId);
  }

  /**
   * Assign approved role to user
   */
  static async assignUserRole(actorUser, userId, roleId, req = {}) {
    const numRoleId = Number(roleId);
    const numUserId = Number(userId);

    const user = await userRepository.findById(numUserId);
    if (!user) {
      throw new NotFoundError(`User '${userId}' was not found`);
    }

    // Self-escalation prevention
    if (Number(actorUser.userId) === numUserId) {
      throw new ForbiddenError('Users cannot assign or escalate roles to themselves');
    }

    // Role boundary: only SYSTEM_ADMINISTRATOR (Role 6) can assign role 6 or 7
    if ((numRoleId === 6 || numRoleId === 7) && Number(actorUser.roleId) !== 6) {
      throw new ForbiddenError('Only System Administrators can grant administrative roles');
    }

    const record = await assignmentRepository.assignRole(numUserId, numRoleId, actorUser.userId);
    await userRepository.update(numUserId, { roleId: numRoleId });

    await SecurityAuditService.recordEvent({
      eventName: SECURITY_EVENTS.ROLE_ASSIGNED,
      severity: 'INFO',
      userId: actorUser.userId || actorUser.id,
      facilityId: actorUser.facilityId || null,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers?.['user-agent'] || 'Admin Action',
      details: {
        targetUserId: numUserId,
        assignedRoleId: numRoleId
      }
    });

    return record;
  }

  /**
   * Revoke role from user
   */
  static async revokeUserRole(actorUser, userId, roleId, req = {}) {
    const numRoleId = Number(roleId);
    const numUserId = Number(userId);

    const user = await userRepository.findById(numUserId);
    if (!user) {
      throw new NotFoundError(`User '${userId}' was not found`);
    }

    if (Number(actorUser.userId) === numUserId) {
      throw new ForbiddenError('Users cannot revoke their own assigned roles');
    }

    if ((numRoleId === 6 || numRoleId === 7) && Number(actorUser.roleId) !== 6) {
      throw new ForbiddenError('Only System Administrators can manage administrative roles');
    }

    await assignmentRepository.removeRole(numUserId, numRoleId);

    await SecurityAuditService.recordEvent({
      eventName: SECURITY_EVENTS.ROLE_REVOKED,
      severity: 'INFO',
      userId: actorUser.userId || actorUser.id,
      facilityId: actorUser.facilityId || null,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers?.['user-agent'] || 'Admin Action',
      details: {
        targetUserId: numUserId,
        revokedRoleId: numRoleId
      }
    });

    return { success: true, message: `Role '${roleId}' revoked successfully` };
  }

  /**
   * Get all platform roles
   */
  static async getAllRoles() {
    return assignmentRepository.getAllRoles();
  }

  /**
   * Get permissions for a role
   */
  static async getRolePermissions(roleId) {
    const numRoleId = Number(roleId);
    if (isNaN(numRoleId) || numRoleId < 1 || numRoleId > 7) {
      throw new ValidationError('Role ID must be an integer between 1 and 7');
    }
    return assignmentRepository.getRolePermissions(numRoleId);
  }
}

export default AssignmentService;
