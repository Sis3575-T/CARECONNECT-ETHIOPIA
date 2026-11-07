/**
 * CareConnect Ethiopia - Security Headers, CORS & Media Type Policy Middleware
 */

import cors from 'cors';
import helmet from 'helmet';
import { corsOptions } from '../config/cors.js';
import { formatError } from '../utils/response.js';

export function configureSecurity(app) {
  // Helmet security HTTP headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for pure REST API JSON endpoints
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'sameorigin' },
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: process.env.NODE_ENV === 'production' ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false
  }));

  // CORS Origin validation
  app.use(cors(corsOptions));
}

/**
 * Enforces valid Content-Type headers on requests containing a body payload
 */
export function enforceContentType(req, res, next) {
  const methodsWithBody = ['POST', 'PUT', 'PATCH'];
  if (!methodsWithBody.includes(req.method)) {
    return next();
  }

  const contentLength = req.headers['content-length'];
  const hasBody = (contentLength && contentLength !== '0') || req.headers['transfer-encoding'] === 'chunked';

  if (!hasBody) {
    return next();
  }

  const contentType = req.headers['content-type'];
  if (!contentType) {
    const requestId = req?.requestId || (res && typeof res.getHeader === 'function' ? res.getHeader('X-Request-Id') : null);
    return res.status(415).json(formatError(
      'Content-Type header is required for request payloads',
      'UNSUPPORTED_MEDIA_TYPE',
      null,
      requestId
    ));
  }

  const isJson = contentType.includes('application/json');
  const isMultipart = contentType.includes('multipart/form-data');
  const isUrlEncoded = contentType.includes('application/x-www-form-urlencoded');

  if (!isJson && !isMultipart && !isUrlEncoded) {
    const requestId = req?.requestId || (res && typeof res.getHeader === 'function' ? res.getHeader('X-Request-Id') : null);
    return res.status(415).json(formatError(
      `Unsupported Media Type '${contentType}'. Allowed types are application/json, multipart/form-data, or application/x-www-form-urlencoded`,
      'UNSUPPORTED_MEDIA_TYPE',
      null,
      requestId
    ));
  }

  next();
}

export default { configureSecurity, enforceContentType };

