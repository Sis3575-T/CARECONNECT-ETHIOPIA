/**
 * CareConnect Ethiopia - PostgreSQL Connection Configuration
 * Manages database connection pool, health checks, and query execution.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const { Pool } = pg;

export const dbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'careconnect_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.PGMAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000
};

// Create PostgreSQL connection pool
export const pool = new Pool(
  dbConfig.connectionString
    ? { connectionString: dbConfig.connectionString, max: dbConfig.max, connectionTimeoutMillis: dbConfig.connectionTimeoutMillis }
    : {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
        max: dbConfig.max,
        idleTimeoutMillis: dbConfig.idleTimeoutMillis,
        connectionTimeoutMillis: dbConfig.connectionTimeoutMillis
      }
);

pool.on('connect', () => {
  // Client checked out
});

pool.on('error', (err) => {
  console.error('[CareConnect DB Pool] Unexpected error on idle client:', err.message);
});

/**
 * Executes a parameterized SQL query with execution timing
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
    console.error(`[CareConnect DB] Query error: ${err.message} | Query: ${text}`);
    throw err;
  }
}

/**
 * Checks PostgreSQL server connectivity
 */
export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() as now, current_database() as database, version() as version');
    return {
      connected: true,
      timestamp: res.rows[0].now,
      database: res.rows[0].database,
      version: res.rows[0].version
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      config: { host: dbConfig.host, port: dbConfig.port, database: dbConfig.database, user: dbConfig.user }
    };
  }
}

export default { pool, query, testConnection, dbConfig };
