/**
 * CareConnect Ethiopia - Backend Database Service
 * Provides query helpers, transactions, and fallback resilience.
 */

import { pool, query, testConnection } from '../config/database.js';

export class DbService {
  /**
   * Execute parameterized query
   */
  static async query(text, params = []) {
    return query(text, params);
  }

  /**
   * Return a single row or null
   */
  static async queryOne(text, params = []) {
    const res = await query(text, params);
    return res.rows && res.rows.length > 0 ? res.rows[0] : null;
  }

  /**
   * Return all matching rows
   */
  static async queryMany(text, params = []) {
    const res = await query(text, params);
    return res.rows || [];
  }

  /**
   * Execute transaction block
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
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Health check status of the database client
   */
  static async healthCheck() {
    return testConnection();
  }
}

export default DbService;
