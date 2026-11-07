/**
 * CareConnect Ethiopia - Standard API Error Classes
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden for your role or facility tenancy') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict or duplicate identifier') {
    super(message, 409, 'CONFLICT');
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Uploaded file exceeds allowed size limit') {
    super(message, 413, 'PAYLOAD_TOO_LARGE');
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = 'Unsupported file media type or invalid file signature') {
    super(message, 415, 'UNSUPPORTED_MEDIA_TYPE');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded. Please retry after the cooldown period') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'A database persistence error occurred') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable. Please retry shortly') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unable to process the contained clinical instructions', details = null) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }
}

export class MethodNotAllowedError extends AppError {
  constructor(message = 'HTTP method not allowed on this endpoint') {
    super(message, 405, 'METHOD_NOT_ALLOWED');
  }
}
