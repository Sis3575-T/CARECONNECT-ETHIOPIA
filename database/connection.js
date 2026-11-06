/**
 * CareConnect Ethiopia - Secure PostgreSQL & Neon Cloud Connection Foundation
 * Manages database connection pool, SSL configuration, health checks,
 * and safe query execution with zero credential leakage.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment configuration safely
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const { Pool } = pg;

/**
 * Sanitizes a database connection string or error message by masking credentials
 */
export function sanitizeConnectionString(str) {
  if (!str) return '';
  return str.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:********@');
}

/**
 * Determines whether SSL is required (Neon Cloud or explicit SSL flag)
 */
function isSSLRequired(connStr) {
  if (process.env.PGSSL === 'true' || process.env.NODE_ENV === 'production') {
    return true;
  }
  if (connStr && (connStr.includes('neon.tech') || connStr.includes('sslmode=require'))) {
    return true;
  }
  return false;
}

const rawConnString = process.env.DATABASE_URL || '';
const needsSSL = isSSLRequired(rawConnString);

export const dbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'careconnect_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  connectionString: rawConnString,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.PGMAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
};

// Create PostgreSQL connection pool with Neon SSL support
export const pool = new Pool(
  dbConfig.connectionString
    ? {
        connectionString: dbConfig.connectionString,
        ssl: dbConfig.ssl,
        max: dbConfig.max,
        idleTimeoutMillis: dbConfig.idleTimeoutMillis,
        connectionTimeoutMillis: dbConfig.connectionTimeoutMillis
      }
    : {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
        ssl: dbConfig.ssl,
        max: dbConfig.max,
        idleTimeoutMillis: dbConfig.idleTimeoutMillis,
        connectionTimeoutMillis: dbConfig.connectionTimeoutMillis
      }
);

pool.on('error', (err) => {
  const safeMessage = sanitizeConnectionString(err.message || 'Unknown database error');
  console.error('[CareConnect DB Pool] Idle client error:', safeMessage);
});

/**
 * Executes a parameterized SQL query safely with execution timing
 */
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.log(`[CareConnect DB] Query executed in ${duration}ms: ${text.slice(0, 60)}...`);
    }
    return res;
  } catch (err) {
    const safeError = sanitizeConnectionString(err.message);
    console.error(`[CareConnect DB] Query error: ${safeError} | Query: ${text.slice(0, 80)}`);
    throw new Error(safeError);
  }
}

/**
 * Checks PostgreSQL / Neon server connectivity safely without exposing credentials
 */
export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() as now, current_database() as database, version() as version');
    return {
      connected: true,
      timestamp: res.rows[0].now,
      database: res.rows[0].database,
      version: res.rows[0].version,
      ssl: !!dbConfig.ssl,
      provider: dbConfig.connectionString.includes('neon.tech') ? 'Neon PostgreSQL Cloud' : 'Standard PostgreSQL'
    };
  } catch (err) {
    const safeMsg = sanitizeConnectionString(err.message || 'Connection failed');
    return {
      connected: false,
      error: safeMsg,
      ssl: !!dbConfig.ssl,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        hasConnectionString: !!dbConfig.connectionString
      }
    };
  }
}

export default { pool, query, testConnection, dbConfig, sanitizeConnectionString };
