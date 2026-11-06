/**
 * CareConnect Ethiopia - Healthcare Facilities Router
 * Mounts endpoints for facility directory, registration, and administrative updates under /api/v1/facilities.
 */

import { Router } from 'express';
import FacilityController from '../../controllers/facilityController.js';
import AssignmentController from '../../controllers/assignmentController.js';
import ClinicalDepartmentController from '../../controllers/clinicalDepartmentController.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import {
  validateFacilityId,
  validateFacilityQuery,
  validateFacilityCreate,
  validateFacilityUpdate,
  validateFacilityStatus
} from '../../validators/facilityValidator.js';

const router = Router();

// 1. List healthcare facilities (Requires authentication)
router.get(
  '/',
  authenticate,
  validateFacilityQuery,
  FacilityController.getFacilities
);

// 2. Get single healthcare facility by ID
router.get(
  '/:facilityId',
  authenticate,
  validateFacilityId,
  FacilityController.getFacilityById
);

// 3. Register new healthcare facility (Requires 'facility:manage' permission)
router.post(
  '/',
  authenticate,
  requirePermission('facility:manage'),
  validateFacilityCreate,
  FacilityController.createFacility
);

// 4. Update healthcare facility details (Requires 'facility:manage' permission)
router.patch(
  '/:facilityId',
  authenticate,
  requirePermission('facility:manage'),
  validateFacilityId,
  validateFacilityUpdate,
  FacilityController.updateFacility
);

// 5. Activate or deactivate healthcare facility (Requires 'facility:manage' permission)
router.patch(
  '/:facilityId/status',
  authenticate,
  requirePermission('facility:manage'),
  validateFacilityId,
  validateFacilityStatus,
  FacilityController.updateFacilityStatus
);

// 6. View staff assigned to facility (Requires authentication)
router.get(
  '/:facilityId/staff',
  authenticate,
  validateFacilityId,
  AssignmentController.getFacilityStaff
);

// 7. Get clinical services offered by facility
router.get(
  '/:facilityId/services',
  authenticate,
  validateFacilityId,
  ClinicalDepartmentController.getFacilityServices
);

// 8. Add clinical service to facility (Requires 'facility:manage' permission)
router.post(
  '/:facilityId/services',
  authenticate,
  requirePermission('facility:manage'),
  validateFacilityId,
  ClinicalDepartmentController.addFacilityService
);

// 9. Update clinical service at facility
router.patch(
  '/:facilityId/services/:serviceId',
  authenticate,
  requirePermission('facility:manage'),
  validateFacilityId,
  ClinicalDepartmentController.updateFacilityService
);

// 10. Remove clinical service from facility
router.delete(
  '/:facilityId/services/:serviceId',
  authenticate,
  requirePermission('facility:manage'),
  validateFacilityId,
  ClinicalDepartmentController.deleteFacilityService
);

// 11. Get facility departments
router.get(
  '/:facilityId/departments',
  authenticate,
  validateFacilityId,
  ClinicalDepartmentController.getFacilityDepartments
);

// 12. Create department in facility
router.post(
  '/:facilityId/departments',
  authenticate,
  requirePermission('facility:manage'),
  validateFacilityId,
  ClinicalDepartmentController.createFacilityDepartment
);

// 13. Update department in facility
router.patch(
  '/:facilityId/departments/:departmentId',
  authenticate,
  requirePermission('facility:manage'),
  validateFacilityId,
  ClinicalDepartmentController.updateFacilityDepartment
);

export default router;
