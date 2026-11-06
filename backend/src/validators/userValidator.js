/**
 * CareConnect Ethiopia - User Input Validators
 */

import { ValidationError } from '../utils/errors.js';

export function validateUserId(req, res, next) {
  const { userId } = req.params;
  const numericId = parseInt(userId, 10);
  if (isNaN(numericId) || numericId <= 0) {
    return next(new ValidationError('User ID must be a positive integer'));
  }
  req.params.userId = numericId;
  next();
}

export function validateUserQuery(req, res, next) {
  const { page, limit, roleId, sortOrder } = req.query;

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

  if (roleId !== undefined && roleId !== '') {
    const r = parseInt(roleId, 10);
    if (isNaN(r) || r < 1 || r > 7) {
      return next(new ValidationError('Role ID must be between 1 and 7'));
    }
  }

  if (sortOrder !== undefined) {
    const order = String(sortOrder).toUpperCase();
    if (order !== 'ASC' && order !== 'DESC') {
      return next(new ValidationError("Sort order must be 'ASC' or 'DESC'"));
    }
  }

  next();
}

export function validateUserUpdate(req, res, next) {
  const { firstName, lastName, phoneNumber, department, jobTitle, roleId, facilityId } = req.body;

  if (firstName !== undefined && (typeof firstName !== 'string' || firstName.trim().length === 0 || firstName.length > 100)) {
    return next(new ValidationError('First name must be a string between 1 and 100 characters'));
  }

  if (lastName !== undefined && (typeof lastName !== 'string' || lastName.trim().length === 0 || lastName.length > 100)) {
    return next(new ValidationError('Last name must be a string between 1 and 100 characters'));
  }

  if (phoneNumber !== undefined && phoneNumber !== null) {
    const phoneRegex = /^(\+251|0)?[97]\d{8}$/; // Ethiopian mobile phone convention
    if (typeof phoneNumber !== 'string' || (!phoneRegex.test(phoneNumber.trim()) && phoneNumber.trim().length < 8)) {
      return next(new ValidationError('Phone number format is invalid (e.g., +251911234567 or 0911234567)'));
    }
  }

  if (roleId !== undefined) {
    const r = parseInt(roleId, 10);
    if (isNaN(r) || r < 1 || r > 7) {
      return next(new ValidationError('Role ID must be between 1 and 7'));
    }
  }

  next();
}

export function validateStatusUpdate(req, res, next) {
  const { isActive, status } = req.body;
  if (isActive === undefined && status === undefined) {
    return next(new ValidationError("Body must contain 'isActive' (boolean) or 'status' ('active'/'inactive')"));
  }
  next();
}

export function validateUserCreate(req, res, next) {
  const { email, firstName, lastName, roleId, phoneNumber, facilityId, initialPassword } = req.body;

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return next(new ValidationError('A valid email address is required'));
  }

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0 || firstName.length > 100) {
    return next(new ValidationError('First name is required and must not exceed 100 characters'));
  }

  if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0 || lastName.length > 100) {
    return next(new ValidationError('Last name is required and must not exceed 100 characters'));
  }

  const role = parseInt(roleId, 10);
  if (isNaN(role) || role < 1 || role > 7) {
    return next(new ValidationError('Valid role ID (1 to 7) is required'));
  }

  // Facility-scoped roles require facilityId
  const FACILITY_SCOPED_ROLES = [1, 2, 3];
  if (FACILITY_SCOPED_ROLES.includes(role) && (!facilityId || typeof facilityId !== 'string' || facilityId.trim().length === 0)) {
    return next(new ValidationError('Facility-scoped roles (Health Centre, Hospital Staff/Triage) require a valid facilityId'));
  }

  if (phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== '') {
    const phoneRegex = /^(\+251|0)?[97]\d{8}$/;
    if (typeof phoneNumber !== 'string' || (!phoneRegex.test(phoneNumber.trim()) && phoneNumber.trim().length < 8)) {
      return next(new ValidationError('Phone number format is invalid'));
    }
  }

  if (initialPassword !== undefined && initialPassword !== null) {
    if (typeof initialPassword !== 'string' || initialPassword.length < 8) {
      return next(new ValidationError('Initial password must be at least 8 characters long'));
    }
  }

  next();
}

export default {
  validateUserId,
  validateUserQuery,
  validateUserCreate,
  validateUserUpdate,
  validateStatusUpdate
};
