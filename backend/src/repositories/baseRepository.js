/**
 * CareConnect Ethiopia - Base Repository Architecture
 * Provides common parameterized database access methods.
 */

import { query, pool } from '../config/database.js';

export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async findById(id) {
    const res = await query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  async findByUuid(uuid) {
    const res = await query(`SELECT * FROM ${this.tableName} WHERE uuid = $1`, [uuid]);
    return res.rows[0] || null;
  }

  async findAll(options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const res = await query(`SELECT * FROM ${this.tableName} LIMIT $1 OFFSET $2`, [limit, offset]);
    return res.rows;
  }

  async count() {
    const res = await query(`SELECT COUNT(*)::int as count FROM ${this.tableName}`);
    return res.rows[0].count;
  }

  static getPool() {
    return pool;
  }
}

export default BaseRepository;
