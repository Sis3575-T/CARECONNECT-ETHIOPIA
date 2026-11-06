/**
 * CareConnect Ethiopia - Centralized Error Handling Middleware
 */

import { AppError, NotFoundError } from '../utils/errors.js';

export function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} does not exist on this server`));
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : (statusCode === 500 ? 'An unexpected server error occurred' : err.message);

  const errorResponse = {
    success: false,
    message,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
      timestamp: new Date().toISOString()
    },
    ...(req && req.requestId ? { requestId: req.requestId } : {})
  };

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    if (!err.isOperational && statusCode === 500) {
      errorResponse.error.stack = err.stack;
    }
  }

  res.status(statusCode).json(errorResponse);
}

export default errorHandler;
