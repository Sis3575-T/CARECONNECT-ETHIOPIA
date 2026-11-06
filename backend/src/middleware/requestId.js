/**
 * CareConnect Ethiopia - Request ID Middleware
 * Generates or propagates distributed correlation identifiers for request tracing.
 */

import crypto from 'crypto';

export function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId = incomingId || `req-${crypto.randomBytes(8).toString('hex')}`;

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
}

export default requestIdMiddleware;
