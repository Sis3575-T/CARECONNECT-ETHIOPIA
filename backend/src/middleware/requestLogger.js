/**
 * CareConnect Ethiopia - Request Logging & Correlation ID Middleware
 */

import crypto from 'crypto';

export function requestLogger(req, res, next) {
  // Generate or forward Correlation ID if not already assigned
  const requestId = req.requestId || req.headers['x-request-id'] || `req-${crypto.randomBytes(8).toString('hex')}`;
  req.requestId = requestId;
  if (!res.getHeader('X-Request-Id')) {
    res.setHeader('X-Request-Id', requestId);
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    // Redact sensitive authorization headers from console logs
    const logLine = `[CareConnect HTTP] ${requestId} ${method} ${originalUrl} ${statusCode} ${duration}ms`;

    if (process.env.NODE_ENV !== 'test') {
      if (statusCode >= 500) {
        console.error(logLine);
      } else if (statusCode >= 400) {
        console.warn(logLine);
      } else {
        console.log(logLine);
      }
    }
  });

  next();
}

export default requestLogger;
