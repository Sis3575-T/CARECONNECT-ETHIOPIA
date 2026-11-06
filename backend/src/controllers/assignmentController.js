/**
 * CareConnect Ethiopia - Staff & Role Assignment Controller
 */

import AssignmentService from '../services/assignmentService.js';
import { successResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/index.js';

export class AssignmentController {
  static async getUserFacilities(req, res, next) {
    try {
      const facilities = await AssignmentService.getUserFacilities(req.params.userId);
      return successResponse(res, { facilities }, 'User facility assignments retrieved', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  static async assignUserFacility(req, res, next) {
    try {
      const assignment = await AssignmentService.assignUserFacility(req.user, req.params.userId, req.body, req);
      return successResponse(res, { assignment }, 'Facility assigned to user successfully', HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  }

  static async removeUserFacility(req, res, next) {
    try {
      const result = await AssignmentService.removeUserFacility(req.user, req.params.userId, req.params.facilityId, req);
      return successResponse(res, result, 'Facility assignment removed successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  static async getFacilityStaff(req, res, next) {
    try {
      const staff = await AssignmentService.getFacilityStaff(req.params.facilityId);
      return successResponse(res, { staff }, 'Facility staff retrieved successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  static async assignUserRole(req, res, next) {
    try {
      const { roleId } = req.body;
      const result = await AssignmentService.assignUserRole(req.user, req.params.userId, roleId, req);
      return successResponse(res, { roleAssignment: result }, 'Role assigned successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  static async revokeUserRole(req, res, next) {
    try {
      const result = await AssignmentService.revokeUserRole(req.user, req.params.userId, req.params.roleId, req);
      return successResponse(res, result, 'Role revoked successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  static async getAllRoles(req, res, next) {
    try {
      const roles = await AssignmentService.getAllRoles();
      return successResponse(res, { roles }, 'System roles retrieved successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  static async getRolePermissions(req, res, next) {
    try {
      const permissions = await AssignmentService.getRolePermissions(req.params.roleId);
      return successResponse(res, { permissions }, 'Role permissions retrieved successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }
}

export default AssignmentController;
