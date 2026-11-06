/**
 * CareConnect Ethiopia - Clinical Services & Departments Service
 * Enforces business logic and uniqueness constraints for facility clinical capabilities.
 */

import facilityServiceRepository from '../repositories/facilityServiceRepository.js';
import facilityRepository from '../repositories/facilityRepository.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';

export class ClinicalDepartmentService {
  /**
   * Get all services available at a facility
   */
  static async getFacilityServices(facilityId) {
    const facility = await facilityRepository.findById(facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${facilityId}' was not found`);
    }
    return facilityServiceRepository.getFacilityServices(facilityId);
  }

  /**
   * Add clinical service to facility
   */
  static async addFacilityService(actorUser, facilityId, serviceData) {
    const { serviceCode, isAvailable = true, hasSpecialistOnDuty = true, operatingHours = '24/7', notes = null } = serviceData;

    if (!serviceCode || typeof serviceCode !== 'string' || serviceCode.trim().length === 0) {
      throw new ValidationError('Valid service code is required');
    }

    const facility = await facilityRepository.findById(facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${facilityId}' was not found`);
    }

    const cleanCode = serviceCode.trim().toUpperCase();
    const existing = await facilityServiceRepository.findFacilityServiceByCode(facilityId, cleanCode);
    if (existing) {
      throw new ConflictError(`Service '${cleanCode}' is already registered for facility '${facilityId}'`);
    }

    return facilityServiceRepository.createFacilityService({
      facilityId,
      serviceCode: cleanCode,
      isAvailable,
      hasSpecialistOnDuty,
      operatingHours,
      notes
    });
  }

  /**
   * Update clinical service status at facility
   */
  static async updateFacilityService(actorUser, facilityId, serviceId, updateData) {
    const service = await facilityServiceRepository.findFacilityServiceById(serviceId);
    if (!service || String(service.facility_id).toLowerCase() !== String(facilityId).toLowerCase()) {
      throw new NotFoundError(`Facility service '${serviceId}' was not found at facility '${facilityId}'`);
    }

    return facilityServiceRepository.updateFacilityService(serviceId, updateData);
  }

  /**
   * Delete clinical service assignment
   */
  static async deleteFacilityService(actorUser, facilityId, serviceId) {
    const service = await facilityServiceRepository.findFacilityServiceById(serviceId);
    if (!service || String(service.facility_id).toLowerCase() !== String(facilityId).toLowerCase()) {
      throw new NotFoundError(`Facility service '${serviceId}' was not found at facility '${facilityId}'`);
    }

    await facilityServiceRepository.deleteFacilityService(serviceId);
    return { success: true, message: `Service assignment '${serviceId}' removed successfully` };
  }

  /**
   * Get departments for facility
   */
  static async getFacilityDepartments(facilityId) {
    const facility = await facilityRepository.findById(facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${facilityId}' was not found`);
    }
    return facilityServiceRepository.getFacilityDepartments(facilityId);
  }

  /**
   * Add department to facility
   */
  static async createFacilityDepartment(actorUser, facilityId, deptData) {
    const { name, code, headClinicianId = null, phoneExtension = null, isActive = true } = deptData;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new ValidationError('Department name is required');
    }

    if (!code || typeof code !== 'string' || code.trim().length < 2) {
      throw new ValidationError('Department code is required');
    }

    const facility = await facilityRepository.findById(facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${facilityId}' was not found`);
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await facilityServiceRepository.findFacilityDepartmentByCode(facilityId, cleanCode);
    if (existing) {
      throw new ConflictError(`Department with code '${cleanCode}' already exists in facility '${facilityId}'`);
    }

    return facilityServiceRepository.createFacilityDepartment({
      facilityId,
      name: name.trim(),
      code: cleanCode,
      headClinicianId: headClinicianId ? Number(headClinicianId) : null,
      phoneExtension,
      isActive
    });
  }

  /**
   * Update department
   */
  static async updateFacilityDepartment(actorUser, facilityId, departmentId, updateData) {
    const dept = await facilityServiceRepository.findFacilityDepartmentById(departmentId);
    if (!dept || String(dept.facility_id).toLowerCase() !== String(facilityId).toLowerCase()) {
      throw new NotFoundError(`Department '${departmentId}' was not found at facility '${facilityId}'`);
    }

    return facilityServiceRepository.updateFacilityDepartment(departmentId, updateData);
  }
}

export default ClinicalDepartmentService;
