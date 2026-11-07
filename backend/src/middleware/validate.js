/**
 * CareConnect Ethiopia - Standardized Request Validation Middleware
 * Validates request body, query parameters, and route parameters against schemas.
 * Supports multi-source validation, type coercion, default values, and common schemas.
 */

import { ValidationError } from '../utils/errors.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates a single source (body, query, or params) against a field schema
 */
function validateSource(data, schema, sourceName = 'body') {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    let val = data[field];

    // Assign default value if field is undefined or empty string
    if (rules.default !== undefined && (val === undefined || val === null || val === '')) {
      data[field] = typeof rules.default === 'function' ? rules.default() : rules.default;
      val = data[field];
    }

    // Trim strings if configured
    if (typeof val === 'string' && rules.trim !== false) {
      val = val.trim();
      data[field] = val;
    }

    // Check required
    if (rules.required && (val === undefined || val === null || val === '')) {
      errors.push({
        source: sourceName,
        field,
        message: rules.requiredMessage || `${field} is required`,
        code: 'REQUIRED_FIELD'
      });
      continue;
    }

    // If optional and not provided, continue
    if (val === undefined || val === null || val === '') {
      continue;
    }

    // Check type and perform safe coercion
    if (rules.type) {
      if (rules.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push({ source: sourceName, field, message: `${field} must be a valid number`, code: 'INVALID_TYPE' });
          continue;
        }
        data[field] = num;
      } else if (rules.type === 'integer') {
        const num = Number(val);
        if (isNaN(num) || !Number.isInteger(num)) {
          errors.push({ source: sourceName, field, message: `${field} must be an integer`, code: 'INVALID_TYPE' });
          continue;
        }
        data[field] = num;
      } else if (rules.type === 'boolean') {
        if (typeof val !== 'boolean' && val !== 'true' && val !== 'false') {
          errors.push({ source: sourceName, field, message: `${field} must be a boolean`, code: 'INVALID_TYPE' });
          continue;
        }
        data[field] = val === true || val === 'true';
      } else if (rules.type === 'array') {
        if (!Array.isArray(val)) {
          errors.push({ source: sourceName, field, message: `${field} must be an array`, code: 'INVALID_TYPE' });
          continue;
        }
      } else if (rules.type === 'email') {
        if (!EMAIL_REGEX.test(String(val))) {
          errors.push({ source: sourceName, field, message: `${field} must be a valid email address`, code: 'INVALID_EMAIL' });
          continue;
        }
      } else if (rules.type === 'uuid') {
        if (!UUID_REGEX.test(String(val))) {
          errors.push({ source: sourceName, field, message: `${field} must be a valid UUID`, code: 'INVALID_UUID' });
          continue;
        }
      } else if (rules.type === 'date') {
        const d = new Date(val);
        if (isNaN(d.getTime())) {
          errors.push({ source: sourceName, field, message: `${field} must be a valid date or timestamp`, code: 'INVALID_DATE' });
          continue;
        }
      }
    }

    // Check enum
    if (rules.enum && Array.isArray(rules.enum)) {
      if (!rules.enum.includes(data[field])) {
        errors.push({
          source: sourceName,
          field,
          message: `${field} must be one of: ${rules.enum.join(', ')}`,
          code: 'INVALID_ENUM'
        });
      }
    }

    // Check min/max string length
    if (typeof val === 'string') {
      if (rules.minLength && val.length < rules.minLength) {
        errors.push({ source: sourceName, field, message: `${field} must be at least ${rules.minLength} characters`, code: 'MIN_LENGTH' });
      }
      if (rules.maxLength && val.length > rules.maxLength) {
        errors.push({ source: sourceName, field, message: `${field} must not exceed ${rules.maxLength} characters`, code: 'MAX_LENGTH' });
      }
      if (rules.pattern && rules.pattern instanceof RegExp) {
        if (!rules.pattern.test(val)) {
          errors.push({ source: sourceName, field, message: rules.patternMessage || `${field} has invalid format`, code: 'PATTERN_MISMATCH' });
        }
      }
    }

    // Check min/max numeric values
    if (typeof data[field] === 'number') {
      if (rules.min !== undefined && data[field] < rules.min) {
        errors.push({ source: sourceName, field, message: `${field} must be greater than or equal to ${rules.min}`, code: 'MIN_VALUE' });
      }
      if (rules.max !== undefined && data[field] > rules.max) {
        errors.push({ source: sourceName, field, message: `${field} must be less than or equal to ${rules.max}`, code: 'MAX_VALUE' });
      }
    }

    // Custom validator function
    if (typeof rules.custom === 'function') {
      const customRes = rules.custom(data[field], data);
      if (customRes !== true) {
        errors.push({
          source: sourceName,
          field,
          message: typeof customRes === 'string' ? customRes : `${field} failed validation`,
          code: 'CUSTOM_VALIDATION'
        });
      }
    }
  }

  return errors;
}

/**
 * Universal validation middleware.
 * Supports:
 * - validate(schema, 'body')
 * - validate(schema, 'query')
 * - validate(schema, 'params')
 * - validate({ body: schema, query: schema, params: schema })
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    // If schema is a multi-source definition
    if (schema && (schema.body || schema.query || schema.params)) {
      const allErrors = [];
      if (schema.params) {
        req.params = req.params || {};
        allErrors.push(...validateSource(req.params, schema.params, 'params'));
      }
      if (schema.query) {
        req.query = req.query || {};
        allErrors.push(...validateSource(req.query, schema.query, 'query'));
      }
      if (schema.body) {
        req.body = req.body || {};
        allErrors.push(...validateSource(req.body, schema.body, 'body'));
      }

      if (allErrors.length > 0) {
        return next(new ValidationError('Validation failed for incoming request', allErrors));
      }
      return next();
    }

    // Single source definition
    const targetSource = source || 'body';
    req[targetSource] = req[targetSource] || {};
    const errors = validateSource(req[targetSource], schema, targetSource);

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed for incoming payload', errors));
    }

    next();
  };
}

/**
 * Validates request body
 */
export function validateBody(schema) {
  return validate(schema, 'body');
}

/**
 * Validates query parameters
 */
export function validateQuery(schema) {
  return validate(schema, 'query');
}

/**
 * Validates route parameters
 */
export function validateParams(schema) {
  return validate(schema, 'params');
}

/**
 * Multi-target request validator
 */
export function validateRequest(definitions = {}) {
  return validate(definitions);
}

/**
 * Common reusable validation schemas
 */
export const commonSchemas = {
  pagination: {
    page: { type: 'integer', min: 1, default: 1 },
    limit: { type: 'integer', min: 1, max: 100, default: 20 },
    sortBy: { type: 'string', required: false },
    sortOrder: { type: 'string', enum: ['ASC', 'DESC', 'asc', 'desc'], default: 'DESC' }
  },
  idParam: (name = 'id') => ({
    [name]: { required: true, type: 'string', minLength: 1 }
  }),
  numericIdParam: (name = 'id') => ({
    [name]: { required: true, type: 'integer', min: 1 }
  }),
  uuidParam: (name = 'id') => ({
    [name]: { required: true, type: 'uuid' }
  }),
  dateRange: {
    startDate: { type: 'date', required: false },
    endDate: { type: 'date', required: false }
  }
};

export default validate;
