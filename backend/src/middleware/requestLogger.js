/**
 * CareConnect Ethiopia - Request Logging & Correlation ID Middleware
 * Structured logging with sensitive data redaction and request correlation.
 */

import crypto from 'crypto';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'cookie',
  'clinicalsummary',
  'vitalsigns',
  'apikey',
  'creditcard',
  'nationalid',
  'ssn'
]);

/**
 * Deeply redacts sensitive fields from objects or arrays
 * @param {any} target - Data object to redact
 * @param {Set} [visited] - Internal set to prevent cyclic references
 * @returns {any} Redacted copy of data
 */
export function redactSensitiveData(target, visited = new WeakSet()) {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (visited.has(target)) {
    return '[CIRCULAR]';
  }
  visited.add(target);

  if (Array.isArray(target)) {
    return target.map((item) => redactSensitiveData(item, visited));
  }

  const result = {};
  for (const [key, value] of Object.entries(target)) {
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
    if (SENSITIVE_KEYS.has(normalizedKey)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveData(value, visited);
    } else {
      result[key] = value;
    }
  }

  return result;
}

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

    // Redacted structured log line
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

