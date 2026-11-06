/**
 * CareConnect Ethiopia - User Model & Data Access
 */

import { query } from '../config/database.js';

// In-memory fallback user repository for tests & offline development
const inMemoryUsers = new Map();
let nextUserId = 10;

export class UserModel {
  /**
   * Find user by email (case-insensitive)
   */
  static async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL', [cleanEmail]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback to in-memory store
    }
    return inMemoryUsers.get(cleanEmail) || null;
  }

  /**
   * Find user by email joined with role & portal access
   */
  static async findByEmailWithRole(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const sql = `
        SELECT 
          u.*,
          r.name as role_name,
          r.display_name as role_display_name,
          r.portal_access
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE LOWER(u.email) = LOWER($1) AND u.deleted_at IS NULL
      `;
      const res = await query(sql, [cleanEmail]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const inMem = inMemoryUsers.get(cleanEmail);
    if (!inMem) return null;

    // Attach default role mapping in fallback mode
    const roleId = Number(inMem.role_id || 1);
    const roleNames = {
      1: { name: 'HEALTH_CENTRE_STAFF', portal: 'HEALTH_CENTRE' },
      2: { name: 'HOSPITAL_STAFF', portal: 'HOSPITAL' },
      3: { name: 'HOSPITAL_TRIAGE', portal: 'HOSPITAL' },
      4: { name: 'TRANSPORT_COORDINATOR', portal: 'TRANSPORT' },
      5: { name: 'AMBULANCE_DRIVER', portal: 'TRANSPORT' },
      6: { name: 'SYSTEM_ADMINISTRATOR', portal: 'ADMINISTRATOR' },
      7: { name: 'REGIONAL_OFFICER', portal: 'ADMINISTRATOR' }
    };
    const roleInfo = roleNames[roleId] || roleNames[1];

    return {
      ...inMem,
      role_name: roleInfo.name,
      portal_access: roleInfo.portal
    };
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    if (!id) return null;
    try {
      const res = await query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
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
          role_id, facility_id, department, job_title, is_active, is_verified,
          failed_login_attempts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE, 0)
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
        failed_login_attempts: 0,
        locked_until: null,
        created_at: new Date().toISOString()
      };
      inMemoryUsers.set(cleanEmail, user);
      const { password_hash, ...safeUser } = user;
      return safeUser;
    }
  }

  /**
   * Increment failed login attempts and lock account if max attempts reached
   */
  static async recordLoginFailure(userId, currentAttempts = 0) {
    const newAttempts = Number(currentAttempts) + 1;
    const isLocking = newAttempts >= 5;
    const lockTime = isLocking ? new Date(Date.now() + 15 * 60 * 1000) : null;

    try {
      const sql = `
        UPDATE users 
        SET failed_login_attempts = $1,
            locked_until = $2
        WHERE id = $3
      `;
      await query(sql, [newAttempts, lockTime, userId]);
    } catch {
      // In-memory fallback
      for (const u of inMemoryUsers.values()) {
        if (u.id === Number(userId)) {
          u.failed_login_attempts = newAttempts;
          u.locked_until = lockTime;
          break;
        }
      }
    }

    return { attempts: newAttempts, isLocked: isLocking, lockedUntil: lockTime };
  }

  /**
   * Reset failed attempts and update last login timestamp on success
   */
  static async recordLoginSuccess(userId) {
    const now = new Date();
    try {
      const sql = `
        UPDATE users 
        SET failed_login_attempts = 0,
            locked_until = NULL,
            last_login_at = $1
        WHERE id = $2
      `;
      await query(sql, [now, userId]);
    } catch {
      // In-memory fallback
      for (const u of inMemoryUsers.values()) {
        if (u.id === Number(userId)) {
          u.failed_login_attempts = 0;
          u.locked_until = null;
          u.last_login_at = now.toISOString();
          break;
        }
      }
    }
  }

  /**
   * Update password hash
   */
  static async updatePassword(userId, newPasswordHash) {
    try {
      const sql = `
        UPDATE users 
        SET password_hash = $1,
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = $2
      `;
      await query(sql, [newPasswordHash, userId]);
    } catch {
      for (const u of inMemoryUsers.values()) {
        if (u.id === Number(userId)) {
          u.password_hash = newPasswordHash;
          u.failed_login_attempts = 0;
          u.locked_until = null;
          break;
        }
      }
    }
  }

  /**
   * Activate or deactivate account
   */
  static async setAccountStatus(userId, isActive) {
    try {
      await query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [isActive, userId]);
    } catch {
      for (const u of inMemoryUsers.values()) {
        if (u.id === Number(userId)) {
          u.is_active = Boolean(isActive);
          break;
        }
      }
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
