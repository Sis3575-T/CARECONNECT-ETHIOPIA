/**
 * CareConnect Ethiopia - Request Validation Middleware
 * Validates request body, query parameters, or route parameters against schemas.
 */

import { ValidationError } from '../utils/errors.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source] || {};
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      let val = data[field];

      // Trim strings if configured
      if (typeof val === 'string' && rules.trim !== false) {
        val = val.trim();
        data[field] = val;
      }

      // Check required
      if (rules.required && (val === undefined || val === null || val === '')) {
        errors.push({ field, message: rules.requiredMessage || `${field} is required` });
        continue;
      }

      // If optional and not provided, continue
      if (val === undefined || val === null || val === '') {
        continue;
      }

      // Check type
      if (rules.type) {
        if (rules.type === 'number') {
          const num = Number(val);
          if (isNaN(num)) {
            errors.push({ field, message: `${field} must be a valid number` });
            continue;
          }
          data[field] = num;
        } else if (rules.type === 'boolean') {
          if (typeof val !== 'boolean' && val !== 'true' && val !== 'false') {
            errors.push({ field, message: `${field} must be a boolean` });
            continue;
          }
          data[field] = val === true || val === 'true';
        } else if (rules.type === 'array') {
          if (!Array.isArray(val)) {
            errors.push({ field, message: `${field} must be an array` });
            continue;
          }
        } else if (rules.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(val))) {
            errors.push({ field, message: `${field} must be a valid email address` });
            continue;
          }
        }
      }

      // Check enum
      if (rules.enum && Array.isArray(rules.enum)) {
        if (!rules.enum.includes(val)) {
          errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
        }
      }

      // Check min/max string length
      if (typeof val === 'string') {
        if (rules.minLength && val.length < rules.minLength) {
          errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
        }
        if (rules.maxLength && val.length > rules.maxLength) {
          errors.push({ field, message: `${field} must not exceed ${rules.maxLength} characters` });
        }
      }

      // Check min/max numeric values
      if (typeof data[field] === 'number') {
        if (rules.min !== undefined && data[field] < rules.min) {
          errors.push({ field, message: `${field} must be greater than or equal to ${rules.min}` });
        }
        if (rules.max !== undefined && data[field] > rules.max) {
          errors.push({ field, message: `${field} must be less than or equal to ${rules.max}` });
        }
      }

      // Custom validator function
      if (typeof rules.custom === 'function') {
        const customRes = rules.custom(val, data);
        if (customRes !== true) {
          errors.push({ field, message: typeof customRes === 'string' ? customRes : `${field} failed validation` });
        }
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed for incoming payload', errors));
    }

    next();
  };
}

export default validate;
