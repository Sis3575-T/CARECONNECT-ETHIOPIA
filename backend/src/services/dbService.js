/**
 * CareConnect Ethiopia - Backend Database Service & Infrastructure Gateway
 * Reuses Part 02 Neon PostgreSQL connection pool, providing transactional query helpers,
 * latency profiling, and resilient offline/healthcheck detection.
 */

import {
  pool,
  query,
  testConnection,
  sanitizeConnectionString,
  getPoolMetrics,
  executeWithRetry,
  closePool
} from '../config/database.js';

export class DbService {
  /**
   * Execute parameterized query with optional execution timing
   */
  static async query(text, params = []) {
    return query(text, params);
  }

  /**
   * Return a single matching row or null
   */
  static async queryOne(text, params = []) {
    const res = await query(text, params);
    return res.rows && res.rows.length > 0 ? res.rows[0] : null;
  }

  /**
   * Return an array of all matching rows
   */
  static async queryMany(text, params = []) {
    const res = await query(text, params);
    return res.rows || [];
  }

  /**
   * Execute an idempotent query with exponential backoff retry for transient network faults
   */
  static async queryWithRetry(text, params = [], options = {}) {
    return executeWithRetry(() => query(text, params), { ...options, isIdempotent: true });
  }

  /**
   * Returns current pool utilization metrics
   */
  static getPoolMetrics() {
    return getPoolMetrics();
  }

  /**
   * Execute a series of operations atomically inside an isolated transaction
   * Supports isolation levels, read-only mode, and automated rollback
   */
  static async transaction(callback, options = {}) {
    const { isolationLevel = null, readOnly = false } = options;
    const client = await pool.connect();
    try {
      let beginSql = 'BEGIN';
      if (isolationLevel) {
        beginSql += ` ISOLATION LEVEL ${isolationLevel}`;
      }
      if (readOnly) {
        beginSql += ' READ ONLY';
      }
      await client.query(beginSql);

      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      const safeError = sanitizeConnectionString(err.message || 'Transaction aborted');
      throw new Error(`[CareConnect DB Transaction Failed]: ${safeError}`);
    } finally {
      client.release();
    }
  }

  /**
   * Execute operations within a named savepoint (nested atomic unit)
   */
  static async withSavepoint(client, savepointName, callback) {
    const sanitizedName = savepointName.replace(/[^a-zA-Z0-9_]/g, '');
    try {
      await client.query(`SAVEPOINT ${sanitizedName}`);
      const result = await callback(client);
      await client.query(`RELEASE SAVEPOINT ${sanitizedName}`);
      return result;
    } catch (err) {
      await client.query(`ROLLBACK TO SAVEPOINT ${sanitizedName}`);
      const safeError = sanitizeConnectionString(err.message || 'Savepoint aborted');
      throw new Error(`[CareConnect DB Savepoint Failed]: ${safeError}`);
    }
  }

  /**
   * Acquires a row-level lock on a record to guarantee sequential consistency
   */
  static async acquireLock(client, tableName, id, lockMode = 'FOR UPDATE') {
    const validModes = ['FOR UPDATE', 'FOR NO KEY UPDATE', 'FOR SHARE', 'FOR KEY SHARE'];
    const mode = validModes.includes(lockMode) ? lockMode : 'FOR UPDATE';
    const queryText = `SELECT id FROM ${tableName} WHERE id = $1 ${mode}`;
    return client.query(queryText, [id]);
  }

  /**
   * Health check probe reporting database latency and connection status
   */
  static async healthCheck() {
    const start = Date.now();
    const result = await testConnection();
    const latencyMs = Date.now() - start;

    return {
      ...result,
      latencyMs
    };
  }

  /**
   * Safe pool drain on application shutdown with timeout protection
   */
  static async closePool(timeoutMs = 5000) {
    return closePool(timeoutMs);
  }
}

export default DbService;
