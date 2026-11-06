/**
 * CareConnect Ethiopia - CORS Policy Configuration
 * Centralized allowed origins, headers, and preflight options.
 */

import config from './env.js';

export const allowedOrigins = config.cors.allowedOrigins;

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile clients, curl, test suites)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || config.isDevelopment || config.isTest) {
      return callback(null, true);
    }

    callback(new Error(`CORS origin '${origin}' is not authorized`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-Request-Id',
    'X-Facility-ID'
  ],
  exposedHeaders: ['Content-Range', 'X-Total-Count', 'X-Request-Id'],
  maxAge: 86400 // 24 hours preflight cache
};

export default { allowedOrigins, corsOptions };
