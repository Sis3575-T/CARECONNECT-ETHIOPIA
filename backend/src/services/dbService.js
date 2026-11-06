/**
 * CareConnect Ethiopia - Backend Database Service & Infrastructure Gateway
 * Reuses Part 02 Neon PostgreSQL connection pool, providing transactional query helpers,
 * latency profiling, and resilient offline/healthcheck detection.
 */

import { pool, query, testConnection, sanitizeConnectionString } from '../config/database.js';

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
   * Execute a series of operations atomically inside an isolated transaction
   */
  static async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
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
   * Safe pool drain on application shutdown
   */
  static async closePool() {
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
  }
}

export default DbService;
