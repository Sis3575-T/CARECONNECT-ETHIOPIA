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
  min: parseInt(process.env.PGMIN || '2', 10),
  max: parseInt(process.env.PGMAX || '10', 10),
  idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT || '5000', 10),
  statementTimeoutMillis: parseInt(process.env.PG_STATEMENT_TIMEOUT || '10000', 10)
};

// Create PostgreSQL connection pool with Neon SSL support
export const pool = new Pool(
  dbConfig.connectionString
    ? {
        connectionString: dbConfig.connectionString,
        ssl: dbConfig.ssl,
        min: dbConfig.min,
        max: dbConfig.max,
        idleTimeoutMillis: dbConfig.idleTimeoutMillis,
        connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
        statement_timeout: dbConfig.statementTimeoutMillis
      }
    : {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
        ssl: dbConfig.ssl,
        min: dbConfig.min,
        max: dbConfig.max,
        idleTimeoutMillis: dbConfig.idleTimeoutMillis,
        connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
        statement_timeout: dbConfig.statementTimeoutMillis
      }
);

pool.on('error', (err) => {
  const safeMessage = sanitizeConnectionString(err.message || 'Unknown database error');
  console.error('[CareConnect DB Pool] Idle client error:', safeMessage);
});

/**
 * Returns instantaneous connection pool utilization metrics
 */
export function getPoolMetrics() {
  return {
    totalCount: pool ? pool.totalCount : 0,
    idleCount: pool ? pool.idleCount : 0,
    waitingCount: pool ? pool.waitingCount : 0,
    maxLimit: dbConfig.max,
    minLimit: dbConfig.min
  };
}

/**
 * Transient error detection for safe query retries
 */
const TRANSIENT_ERROR_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '40001', // serialization_failure
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '53300'  // too_many_connections
]);

export function isTransientError(err) {
  if (!err) return false;
  if (err.code && TRANSIENT_ERROR_CODES.has(err.code)) return true;
  const msg = err.message || '';
  return (
    msg.includes('Connection terminated unexpectedly') ||
    msg.includes('timeout exceeded') ||
    msg.includes('ECONNRESET') ||
    msg.includes('deadlock detected')
  );
}

/**
 * Executes an operation with exponential backoff and jitter for transient errors
 * Strictly for idempotent read operations unless explicitly overridden
 */
export async function executeWithRetry(operation, options = {}) {
  const { maxRetries = 3, baseDelayMs = 100, isIdempotent = true } = options;
  if (!isIdempotent) {
    return operation();
  }

  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries || !isTransientError(err)) {
        throw err;
      }
      const jitter = Math.floor(Math.random() * 50);
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1) + jitter, 2000);
      console.warn(`[CareConnect DB] Transient error detected on attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

/**
 * Graceful connection pool draining with timeout guard
 */
export async function closePool(timeoutMs = 5000) {
  if (!pool || typeof pool.end !== 'function') return;

  const drainPromise = pool.end();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Connection pool drain timeout')), timeoutMs)
  );

  try {
    await Promise.race([drainPromise, timeoutPromise]);
    console.log('[CareConnect DB] Connection pool successfully drained.');
  } catch (err) {
    console.error('[CareConnect DB] Error draining connection pool:', err.message);
  }
}

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
  const poolMetrics = getPoolMetrics();
  try {
    const res = await pool.query('SELECT NOW() as now, current_database() as database, version() as version');
    return {
      connected: true,
      timestamp: res.rows[0].now,
      database: res.rows[0].database,
      version: res.rows[0].version,
      ssl: !!dbConfig.ssl,
      provider: dbConfig.connectionString.includes('neon.tech') ? 'Neon PostgreSQL Cloud' : 'Standard PostgreSQL',
      pool: poolMetrics
    };
  } catch (err) {
    const safeMsg = sanitizeConnectionString(err.message || 'Connection failed');
    return {
      connected: false,
      error: safeMsg,
      ssl: !!dbConfig.ssl,
      pool: poolMetrics,
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

export default {
  pool,
  query,
  testConnection,
  dbConfig,
  sanitizeConnectionString,
  getPoolMetrics,
  isTransientError,
  executeWithRetry,
  closePool
};
