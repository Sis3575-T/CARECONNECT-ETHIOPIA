/**
 * CareConnect Ethiopia - Healthcare Facility Controller
 * Handles HTTP requests for healthcare facilities registry and administrative lifecycle.
 */

import FacilityService from '../services/facilityService.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/index.js';

export class FacilityController {
  /**
   * List healthcare facilities with pagination, filters, and search
   * GET /api/v1/facilities
   */
  static async getFacilities(req, res, next) {
    try {
      const result = await FacilityService.listFacilities(req.query);
      return paginatedResponse(
        res,
        result.facilities,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Healthcare facilities retrieved successfully'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single facility details
   * GET /api/v1/facilities/:facilityId
   */
  static async getFacilityById(req, res, next) {
    try {
      const facility = await FacilityService.getFacilityById(req.params.facilityId);
      return successResponse(res, { facility }, 'Healthcare facility retrieved successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Register a new healthcare facility
   * POST /api/v1/facilities
   */
  static async createFacility(req, res, next) {
    try {
      const facility = await FacilityService.createFacility(req.user, req.body, req);
      return successResponse(
        res,
        { facility },
        'Healthcare facility registered successfully',
        HTTP_STATUS.CREATED
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update healthcare facility details
   * PATCH /api/v1/facilities/:facilityId
   */
  static async updateFacility(req, res, next) {
    try {
      const facility = await FacilityService.updateFacility(req.user, req.params.facilityId, req.body, req);
      return successResponse(res, { facility }, 'Healthcare facility updated successfully', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Activate or deactivate healthcare facility
   * PATCH /api/v1/facilities/:facilityId/status
   */
  static async updateFacilityStatus(req, res, next) {
    try {
      const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : req.body.status === 'active';
      const facility = await FacilityService.setFacilityStatus(req.user, req.params.facilityId, isActive, req);
      const actionLabel = isActive ? 'activated' : 'deactivated';
      return successResponse(
        res,
        { facility },
        `Healthcare facility ${actionLabel} successfully`,
        HTTP_STATUS.OK
      );
    } catch (err) {
      next(err);
    }
  }
}

export default FacilityController;
