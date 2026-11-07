/**
 * CareConnect Ethiopia - Standard API Response Contract
 * Formats standardized JSON success, paginated, and error payloads
 * with automatic request correlation tracing and backward compatibility.
 */

import { HTTP_STATUS } from '../constants/index.js';

/**
 * Extracts request ID from Express res object or incoming headers
 */
function extractRequestId(res, explicitId = null) {
  if (explicitId) return explicitId;
  if (res && res.req && res.req.requestId) return res.req.requestId;
  if (res && typeof res.getHeader === 'function') {
    const headerId = res.getHeader('X-Request-Id');
    if (headerId) return headerId;
  }
  return null;
}

/**
 * Pure formatter for standard success response
 */
export function formatSuccess(data = {}, message = 'Request completed successfully', meta = {}, requestId = null) {
  const reqId = requestId || meta.requestId || null;
  return {
    success: true,
    message,
    data,
    meta: {
      ...(reqId ? { requestId: reqId } : {}),
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

/**
 * Sends a standardized successful JSON response (HTTP 200 by default)
 */
export function successResponse(res, data = {}, message = 'Request completed successfully', statusCode = HTTP_STATUS.OK, meta = {}) {
  const requestId = extractRequestId(res, meta.requestId);
  const payload = formatSuccess(data, message, meta, requestId);
  return res.status(statusCode).json(payload);
}

/**
 * Sends a standardized created JSON response (HTTP 201)
 */
export function createdResponse(res, data = {}, message = 'Resource created successfully', meta = {}) {
  return successResponse(res, data, message, HTTP_STATUS.CREATED, meta);
}

/**
 * Sends a standardized empty JSON response (HTTP 204)
 */
export function noContentResponse(res) {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}

/**
 * Pure formatter for standard paginated response
 */
export function formatPaginated(items = [], page = 1, limit = 20, total = 0, message = 'Records retrieved successfully', meta = {}, requestId = null) {
  const numLimit = Math.max(1, Number(limit) || 20);
  const numTotal = Number(total) || 0;
  const totalPages = Math.ceil(numTotal / numLimit) || 1;
  const numPage = Math.max(1, Number(page) || 1);
  const reqId = requestId || meta.requestId || null;

  return {
    success: true,
    message,
    data: items,
    meta: {
      ...(reqId ? { requestId: reqId } : {}),
      timestamp: new Date().toISOString(),
      pagination: {
        page: numPage,
        limit: numLimit,
        total: numTotal,
        totalPages,
        hasNext: numPage < totalPages,
        hasPrev: numPage > 1
      },
      ...meta
    }
  };
}

/**
 * Sends a standardized paginated JSON response
 */
export function paginatedResponse(res, items = [], page = 1, limit = 20, total = 0, message = 'Records retrieved successfully', meta = {}) {
  const requestId = extractRequestId(res, meta.requestId);
  const payload = formatPaginated(items, page, limit, total, message, meta, requestId);
  return res.status(HTTP_STATUS.OK).json(payload);
}

/**
 * Pure formatter for standard error response
 */
export function formatError(message = 'An error occurred', code = 'INTERNAL_ERROR', details = null, requestId = null, meta = {}) {
  const reqId = requestId || meta.requestId || null;
  const isoTimestamp = new Date().toISOString();
  return {
    success: false,
    message,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      timestamp: isoTimestamp
    },
    meta: {
      ...(reqId ? { requestId: reqId } : {}),
      timestamp: isoTimestamp,
      ...meta
    },
    // Top-level requestId preserved for client backward compatibility
    ...(reqId ? { requestId: reqId } : {})
  };
}

/**
 * Sends a standardized error JSON response
 */
export function errorResponse(res, message = 'An error occurred', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = 'INTERNAL_ERROR', details = null, requestId = null) {
  const reqId = extractRequestId(res, requestId);
  const payload = formatError(message, code, details, reqId);
  return res.status(statusCode).json(payload);
}

export default {
  formatSuccess,
  formatPaginated,
  formatError,
  successResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
  errorResponse
};
