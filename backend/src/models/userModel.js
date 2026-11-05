/**
 * CareConnect Ethiopia - User Model & Data Access
 */

import { query, pool } from '../config/database.js';

// In-memory fallback user repository for tests & offline development
const inMemoryUsers = new Map();
let nextUserId = 10;

export class UserModel {
  /**
   * Find user by email (case-insensitive)
   */
  static async findByEmail(email) {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback to in-memory store
    }
    return inMemoryUsers.get(cleanEmail) || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    try {
      const res = await query('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }
    for (const u of inMemoryUsers.values()) {
      if (u.id === Number(id)) return u;
    }
    return null;
  }

  /**
   * Create a new user record
   */
  static async create(userData) {
    const {
      email,
      passwordHash,
      firstName,
      lastName,
      phoneNumber,
      roleId = 1,
      facilityId = null,
      department = 'General',
      jobTitle = 'Staff'
    } = userData;

    const cleanEmail = email.trim().toLowerCase();

    try {
      const sql = `
        INSERT INTO users (
          email, password_hash, first_name, last_name, phone_number,
          role_id, facility_id, department, job_title, is_active, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE)
        RETURNING id, email, first_name, last_name, phone_number, role_id, facility_id, department, job_title, is_active, created_at
      `;
      const res = await query(sql, [
        cleanEmail, passwordHash, firstName, lastName, phoneNumber,
        roleId, facilityId, department, jobTitle
      ]);
      return res.rows[0];
    } catch {
      // In-memory fallback
      const user = {
        id: nextUserId++,
        email: cleanEmail,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        role_id: Number(roleId),
        facility_id: facilityId,
        department,
        job_title: jobTitle,
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString()
      };
      inMemoryUsers.set(cleanEmail, user);
      const { password_hash, ...safeUser } = user;
      return safeUser;
    }
  }

  /**
   * Clear in-memory users (for tests)
   */
  static clearMockUsers() {
    inMemoryUsers.clear();
  }
}

export default UserModel;
