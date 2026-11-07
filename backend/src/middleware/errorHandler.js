/**
 * CareConnect Ethiopia - Centralized Error Handling Middleware
 * Maps domain errors, PostgreSQL exceptions, and payload syntax errors
 * into consistent, secure JSON error responses with request correlation.
 */

import { AppError, NotFoundError } from '../utils/errors.js';
import { formatError } from '../utils/response.js';
import { sanitizeConnectionString } from '../config/database.js';

export function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} does not exist on this server`));
}

/**
 * Maps raw PostgreSQL error codes to typed application errors
 */
function mapDatabaseError(err) {
  if (!err || !err.code) return null;

  switch (err.code) {
    case '23505': // unique_violation
      return {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'A record with this identifier already exists'
      };
    case '23503': // foreign_key_violation
      return {
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'The referenced parent record does not exist or cannot be modified'
      };
    case '23514': // check_violation
      return {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Data constraint validation failed for database operation'
      };
    case '22P02': // invalid_text_representation
      return {
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Invalid identifier syntax or data format'
      };
    case '57014': // query_canceled / statement_timeout
      return {
        statusCode: 504,
        code: 'GATEWAY_TIMEOUT',
        message: 'Database query statement timeout exceeded'
      };
    default:
      return null;
  }
}

export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected server error occurred';
  let details = err.details || null;

  // 1. Handle JSON syntax parse errors from express.json()
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400 && 'body' in err)) {
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = 'Malformed JSON in request payload';
  }

  // 2. Handle Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Uploaded file exceeds the maximum allowed limit';
  }

  // 3. Handle PostgreSQL database errors
  const dbMapped = mapDatabaseError(err);
  if (dbMapped) {
    statusCode = dbMapped.statusCode;
    code = dbMapped.code;
    message = dbMapped.message;
  }

  // 4. Sanitize messages to avoid leaking passwords or connection strings
  message = sanitizeConnectionString(message);

  // 5. Hide internal stack/server details on unexpected 500 errors in production
  if (!err.isOperational && statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected server error occurred';
    details = null;
  }

  const requestId = req?.requestId || (res && typeof res.getHeader === 'function' ? res.getHeader('X-Request-Id') : null);
  const payload = formatError(message, code, details, requestId);

  // Development stack tracing for diagnostics
  if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && !err.isOperational && statusCode === 500) {
    payload.error.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}

export default errorHandler;
