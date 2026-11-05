/**
 * CareConnect Ethiopia - Security Headers & CORS Configuration
 */

import cors from 'cors';
import helmet from 'helmet';
import config from '../config/env.js';

export function configureSecurity(app) {
  // Helmet security HTTP headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for API endpoints
    crossOriginEmbedderPolicy: false
  }));

  // CORS Origin validation
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, tests)
      if (!origin) return callback(null, true);

      if (config.cors.allowedOrigins.includes(origin) || config.isDevelopment || config.isTest) {
        return callback(null, true);
      }
      callback(new Error(`CORS origin ${origin} is not authorized`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Facility-ID'],
    exposedHeaders: ['Content-Range', 'X-Total-Count']
  };

  app.use(cors(corsOptions));
}

export default configureSecurity;
