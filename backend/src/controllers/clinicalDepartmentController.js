/**
 * CareConnect Ethiopia - Clinical Services & Departments Controller
 */

import ClinicalDepartmentService from '../services/clinicalDepartmentService.js';
import { successResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/index.js';

export class ClinicalDepartmentController {
  static async getFacilityServices(req, res, next) {
    try {
      const services = await ClinicalDepartmentService.getFacilityServices(req.params.facilityId);
      return successResponse(res, { services }, 'Facility clinical services retrieved', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  static async addFacilityService(req, res, next) {
    try {
      const service = await ClinicalDepartmentService.addFacilityService(req.user, req.params.facilityId, req.body);
      return successResponse(res, { service }, 'Clinical service registered to facility', HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  }

  static async updateFacilityService(req, res, next) {
    try {
      const service = await ClinicalDepartmentService.updateFacilityService(req.user, req.params.facilityId, req.params.serviceId, req.body);
      return successResponse(res, { service }, 'Clinical service updated successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  static async deleteFacilityService(req, res, next) {
    try {
      const result = await ClinicalDepartmentService.deleteFacilityService(req.user, req.params.facilityId, req.params.serviceId);
      return successResponse(res, result, 'Clinical service removed successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  static async getFacilityDepartments(req, res, next) {
    try {
      const departments = await ClinicalDepartmentService.getFacilityDepartments(req.params.facilityId);
      return successResponse(res, { departments }, 'Facility departments retrieved', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  static async createFacilityDepartment(req, res, next) {
    try {
      const department = await ClinicalDepartmentService.createFacilityDepartment(req.user, req.params.facilityId, req.body);
      return successResponse(res, { department }, 'Department created successfully', HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  }

  static async updateFacilityDepartment(req, res, next) {
    try {
      const department = await ClinicalDepartmentService.updateFacilityDepartment(req.user, req.params.facilityId, req.params.departmentId, req.body);
      return successResponse(res, { department }, 'Department updated successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }
}

export default ClinicalDepartmentController;
