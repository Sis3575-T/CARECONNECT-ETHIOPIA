/**
 * CareConnect Ethiopia - Application Configuration & Environment Settings
 * Safely parses, validates, and defaults runtime environment parameters.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment files
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = process.env.NODE_ENV || 'development';

function getArray(val, fallback) {
  if (!val) return fallback;
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

function getInt(val, fallback) {
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export const config = {
  env,
  isProduction: env === 'production',
  isDevelopment: env === 'development',
  isTest: env === 'test',

  server: {
    port: getInt(process.env.PORT || process.env.BACKEND_PORT, 5000),
    host: process.env.HOST || '0.0.0.0',
    apiVersion: 'v1'
  },

  cors: {
    allowedOrigins: getArray(process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN, [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176'
    ])
  },

  db: {
    url: process.env.DATABASE_URL,
    host: process.env.PGHOST || 'localhost',
    port: getInt(process.env.PGPORT, 5432),
    database: process.env.PGDATABASE || 'careconnect_db',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    max: getInt(process.env.PGMAX, 20)
  },

  jwt: {
    secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'careconnect_dev_jwt_secret_change_in_production_min_32_chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET || 'careconnect_dev_refresh_secret_change_in_production_min_32_chars',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
  },

  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    timeoutMs: getInt(process.env.AI_TIMEOUT_MS, 15000)
  },

  externalService: {
    apiKey: process.env.EXTERNAL_SERVICE_API_KEY || null
  },

  uploads: {
    dir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')),
    maxFileSizeBytes: getInt(process.env.MAX_FILE_SIZE_MB, 10) * 1024 * 1024
  }
};

/**
 * Validates critical settings in production environments
 */
export function validateProductionSettings() {
  const issues = [];
  if (config.isProduction) {
    if (!process.env.JWT_SECRET || config.jwt.secret.length < 32) {
      issues.push('JWT_SECRET must be set and at least 32 characters in production');
    }
    if (!process.env.DATABASE_URL && (!process.env.PGPASSWORD || process.env.PGPASSWORD === 'postgres')) {
      issues.push('Production database must use a secure non-default password');
    }
  }
  return { valid: issues.length === 0, issues };
}

export default config;
