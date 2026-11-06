/**
 * CareConnect Ethiopia - Standard API Response Contract
 * Formats standardized JSON success and error payloads.
 */

import { HTTP_STATUS } from '../constants/index.js';

/**
 * Sends a standardized successful JSON response
 */
export function successResponse(res, data = {}, message = 'Operation completed successfully', statusCode = HTTP_STATUS.OK, meta = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });
}

/**
 * Sends a standardized paginated JSON response
 */
export function paginatedResponse(res, items = [], page = 1, limit = 20, total = 0, message = 'Items retrieved successfully') {
  const totalPages = Math.ceil(total / limit) || 1;
  const numPage = Number(page);
  const numLimit = Number(limit);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data: items,
    meta: {
      pagination: {
        page: numPage,
        limit: numLimit,
        total: Number(total),
        totalPages,
        hasNext: numPage < totalPages,
        hasPrev: numPage > 1
      },
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Sends a standardized error JSON response
 */
export function errorResponse(res, message = 'An error occurred', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = 'INTERNAL_ERROR', details = null, requestId = null) {
  const response = {
    success: false,
    message,
    error: {
      code,
      ...(details ? { details } : {})
    },
    ...(requestId ? { requestId } : {})
  };

  return res.status(statusCode).json(response);
}

export default {
  successResponse,
  paginatedResponse,
  errorResponse
};
