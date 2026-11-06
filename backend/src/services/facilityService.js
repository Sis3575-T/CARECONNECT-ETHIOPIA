/**
 * CareConnect Ethiopia - Healthcare Facility Management Service
 * Business logic and operational workflows for Healthcare Facility registry.
 */

import facilityRepository from '../repositories/facilityRepository.js';
import SecurityAuditService from './securityAuditService.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import { SECURITY_EVENTS } from '../constants/index.js';

export class FacilityService {
  /**
   * Get single facility by ID
   */
  static async getFacilityById(facilityId) {
    const facility = await facilityRepository.findById(facilityId);
    if (!facility) {
      throw new NotFoundError(`Healthcare facility '${facilityId}' was not found`);
    }
    return facility;
  }

  /**
   * List healthcare facilities with pagination, filters, and search
   */
  static async listFacilities(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const type = query.type ? String(query.type).trim() : null;
    const region = query.region ? String(query.region).trim() : null;
    const tier = query.tier ? String(query.tier).trim() : null;
    const service = query.service ? String(query.service).trim() : null;
    const isActive = query.status !== undefined && query.status !== ''
      ? query.status === 'active' || query.status === 'true'
      : null;
    const search = query.search ? String(query.search).trim() : null;
    const sortBy = query.sortBy || 'name';
    const sortOrder = query.sortOrder || 'ASC';

    const filterOptions = {
      limit,
      offset,
      type,
      region,
      tier,
      service,
      isActive,
      search,
      sortBy,
      sortOrder
    };

    const [facilities, total] = await Promise.all([
      facilityRepository.findAll(filterOptions),
      facilityRepository.count(filterOptions)
    ]);

    return {
      facilities,
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
   * Register a new healthcare facility
   */
  static async createFacility(actorUser, facilityData, req = {}) {
    const cleanId = String(facilityData.id).trim().toLowerCase();

    // Check for duplicate facility ID / code
    const existing = await facilityRepository.findById(cleanId);
    if (existing) {
      throw new ConflictError(`Healthcare facility with code '${cleanId}' already exists`);
    }

    const newFacility = await facilityRepository.create({
      ...facilityData,
      id: cleanId
    });

    // Record security audit event
    await SecurityAuditService.recordEvent({
      eventName: SECURITY_EVENTS.FACILITY_CREATED,
      severity: 'INFO',
      userId: actorUser.userId || actorUser.id,
      facilityId: cleanId,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers?.['user-agent'] || 'Admin Action',
      details: {
        facilityId: cleanId,
        facilityName: newFacility.name,
        facilityType: newFacility.facility_type,
        region: newFacility.region
      }
    });

    return newFacility;
  }

  /**
   * Update existing healthcare facility details
   */
  static async updateFacility(actorUser, facilityId, updateData, req = {}) {
    const cleanId = String(facilityId).trim().toLowerCase();
    const existing = await facilityRepository.findById(cleanId);
    if (!existing) {
      throw new NotFoundError(`Healthcare facility '${cleanId}' was not found`);
    }

    const updated = await facilityRepository.update(cleanId, updateData);

    await SecurityAuditService.recordEvent({
      eventName: SECURITY_EVENTS.FACILITY_UPDATED,
      severity: 'INFO',
      userId: actorUser.userId || actorUser.id,
      facilityId: cleanId,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers?.['user-agent'] || 'Admin Action',
      details: {
        facilityId: cleanId,
        fieldsUpdated: Object.keys(updateData)
      }
    });

    return updated;
  }

  /**
   * Activate or deactivate facility (non-destructive status update)
   */
  static async setFacilityStatus(actorUser, facilityId, isActive, req = {}) {
    const cleanId = String(facilityId).trim().toLowerCase();
    const existing = await facilityRepository.findById(cleanId);
    if (!existing) {
      throw new NotFoundError(`Healthcare facility '${cleanId}' was not found`);
    }

    const updated = await facilityRepository.setStatus(cleanId, isActive);

    const eventName = isActive
      ? SECURITY_EVENTS.FACILITY_UPDATED
      : SECURITY_EVENTS.FACILITY_DEACTIVATED;

    await SecurityAuditService.recordEvent({
      eventName,
      severity: isActive ? 'INFO' : 'WARNING',
      userId: actorUser.userId || actorUser.id,
      facilityId: cleanId,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers?.['user-agent'] || 'Admin Action',
      details: {
        facilityId: cleanId,
        isActive: Boolean(isActive),
        action: isActive ? 'activated' : 'deactivated'
      }
    });

    return updated;
  }
}

export default FacilityService;
