/**
 * CareConnect Ethiopia - Healthcare Facility Input Validators
 */

import { ValidationError } from '../utils/errors.js';

const VALID_FACILITY_TYPES = new Set([
  'HEALTH_CENTRE',
  'PRIMARY_HOSPITAL',
  'GENERAL_HOSPITAL',
  'TERTIARY_HOSPITAL',
  'CLINIC'
]);

const VALID_TIERS = new Set(['PRIMARY', 'SECONDARY', 'TERTIARY']);

export function validateFacilityId(req, res, next) {
  const { facilityId } = req.params;
  if (!facilityId || typeof facilityId !== 'string' || facilityId.trim().length === 0 || facilityId.length > 50) {
    return next(new ValidationError('Facility identifier must be a non-empty string (max 50 characters)'));
  }
  req.params.facilityId = facilityId.trim().toLowerCase();
  next();
}

export function validateFacilityQuery(req, res, next) {
  const { page, limit, type, tier, sortOrder } = req.query;

  if (page !== undefined) {
    const p = parseInt(page, 10);
    if (isNaN(p) || p < 1) {
      return next(new ValidationError('Page must be a positive integer greater than or equal to 1'));
    }
  }

  if (limit !== undefined) {
    const l = parseInt(limit, 10);
    if (isNaN(l) || l < 1 || l > 100) {
      return next(new ValidationError('Limit must be an integer between 1 and 100'));
    }
  }

  if (type && !VALID_FACILITY_TYPES.has(type.toUpperCase())) {
    return next(new ValidationError(`Invalid facility type. Allowed types: ${Array.from(VALID_FACILITY_TYPES).join(', ')}`));
  }

  if (tier && !VALID_TIERS.has(tier.toUpperCase())) {
    return next(new ValidationError(`Invalid facility tier. Allowed tiers: ${Array.from(VALID_TIERS).join(', ')}`));
  }

  if (sortOrder && sortOrder.toUpperCase() !== 'ASC' && sortOrder.toUpperCase() !== 'DESC') {
    return next(new ValidationError("Sort order must be 'ASC' or 'DESC'"));
  }

  next();
}

export function validateFacilityCreate(req, res, next) {
  const { id, name, facilityType, region, tier, latitude, longitude, totalBeds, totalIcuBeds } = req.body;

  if (!id || typeof id !== 'string' || id.trim().length < 3 || id.trim().length > 50) {
    return next(new ValidationError('Facility code/ID is required (3 to 50 alphanumeric characters or hyphens)'));
  }

  if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 200) {
    return next(new ValidationError('Facility name is required (3 to 200 characters)'));
  }

  if (!facilityType || !VALID_FACILITY_TYPES.has(String(facilityType).toUpperCase())) {
    return next(new ValidationError(`Facility type is required and must be one of: ${Array.from(VALID_FACILITY_TYPES).join(', ')}`));
  }

  if (!region || typeof region !== 'string' || region.trim().length === 0) {
    return next(new ValidationError('Region is required for facility registration'));
  }

  if (tier !== undefined && !VALID_TIERS.has(String(tier).toUpperCase())) {
    return next(new ValidationError(`Tier must be one of: ${Array.from(VALID_TIERS).join(', ')}`));
  }

  // Location coordinates optional (per Ethiopian GIS realities)
  if (latitude !== undefined && latitude !== null && latitude !== '') {
    const lat = Number(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return next(new ValidationError('Latitude must be a valid decimal degree between -90 and 90'));
    }
  }

  if (longitude !== undefined && longitude !== null && longitude !== '') {
    const lon = Number(longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return next(new ValidationError('Longitude must be a valid decimal degree between -180 and 180'));
    }
  }

  if (totalBeds !== undefined && totalBeds !== null) {
    const beds = parseInt(totalBeds, 10);
    if (isNaN(beds) || beds < 0) {
      return next(new ValidationError('Total beds must be a non-negative integer'));
    }
  }

  if (totalIcuBeds !== undefined && totalIcuBeds !== null) {
    const icu = parseInt(totalIcuBeds, 10);
    if (isNaN(icu) || icu < 0) {
      return next(new ValidationError('Total ICU beds must be a non-negative integer'));
    }
  }

  next();
}

export function validateFacilityUpdate(req, res, next) {
  const { name, facilityType, tier, latitude, longitude, totalBeds, totalIcuBeds } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length < 3 || name.length > 200)) {
    return next(new ValidationError('Facility name must be between 3 and 200 characters'));
  }

  if (facilityType !== undefined && !VALID_FACILITY_TYPES.has(String(facilityType).toUpperCase())) {
    return next(new ValidationError(`Invalid facility type: ${facilityType}`));
  }

  if (tier !== undefined && !VALID_TIERS.has(String(tier).toUpperCase())) {
    return next(new ValidationError(`Invalid facility tier: ${tier}`));
  }

  if (latitude !== undefined && latitude !== null && latitude !== '') {
    const lat = Number(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return next(new ValidationError('Latitude must be between -90 and 90'));
    }
  }

  if (longitude !== undefined && longitude !== null && longitude !== '') {
    const lon = Number(longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return next(new ValidationError('Longitude must be between -180 and 180'));
    }
  }

  if (totalBeds !== undefined && totalBeds !== null) {
    const beds = parseInt(totalBeds, 10);
    if (isNaN(beds) || beds < 0) {
      return next(new ValidationError('Total beds must be non-negative'));
    }
  }

  if (totalIcuBeds !== undefined && totalIcuBeds !== null) {
    const icu = parseInt(totalIcuBeds, 10);
    if (isNaN(icu) || icu < 0) {
      return next(new ValidationError('Total ICU beds must be non-negative'));
    }
  }

  next();
}

export function validateFacilityStatus(req, res, next) {
  const { isActive, status } = req.body;
  if (isActive === undefined && status === undefined) {
    return next(new ValidationError("Body must include 'isActive' (boolean) or 'status' ('active'/'inactive')"));
  }
  next();
}

export default {
  validateFacilityId,
  validateFacilityQuery,
  validateFacilityCreate,
  validateFacilityUpdate,
  validateFacilityStatus
};
