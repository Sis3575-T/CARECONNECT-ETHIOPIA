/**
 * CareConnect Ethiopia - Security Headers & CORS Configuration
 */

import cors from 'cors';
import helmet from 'helmet';
import { corsOptions } from '../config/cors.js';

export function configureSecurity(app) {
  // Helmet security HTTP headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for API endpoints
    crossOriginEmbedderPolicy: false
  }));

  // CORS Origin validation
  app.use(cors(corsOptions));
}

export default configureSecurity;
