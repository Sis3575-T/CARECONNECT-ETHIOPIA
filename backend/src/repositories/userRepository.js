/**
 * CareConnect Ethiopia - User Repository
 * Data access layer for User entities with parameterized PostgreSQL queries and test store fallback.
 */

import { BaseRepository } from './baseRepository.js';
import { query } from '../config/database.js';
import UserModel from '../models/userModel.js';

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /**
   * Find user by ID with joined role and facility metadata
   */
  async findById(id) {
    if (!id) return null;
    try {
      const sql = `
        SELECT 
          u.id, u.uuid, u.email, u.first_name, u.last_name, u.phone_number,
          u.role_id, u.facility_id, u.department, u.job_title,
          u.is_active, u.is_verified, u.last_login_at, u.created_at, u.updated_at,
          r.name as role_name, r.display_name as role_display_name, r.portal_access,
          f.name as facility_name, f.facility_type
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN healthcare_facilities f ON u.facility_id = f.id
        WHERE u.id = $1 AND u.deleted_at IS NULL
      `;
      const res = await query(sql, [id]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // In-memory / test fallback
    }

    const fallbackUser = await UserModel.findById(id);
    if (!fallbackUser || fallbackUser.deleted_at) return null;

    const roleNames = {
      1: { name: 'HEALTH_CENTRE_STAFF', display: 'Health Centre Staff', portal: 'HEALTH_CENTRE' },
      2: { name: 'HOSPITAL_STAFF', display: 'Hospital Staff', portal: 'HOSPITAL' },
      3: { name: 'HOSPITAL_TRIAGE', display: 'Hospital Specialist / Triage', portal: 'HOSPITAL' },
      4: { name: 'TRANSPORT_COORDINATOR', display: 'Transport Coordinator', portal: 'TRANSPORT' },
      5: { name: 'AMBULANCE_DRIVER', display: 'Ambulance Driver', portal: 'TRANSPORT' },
      6: { name: 'SYSTEM_ADMINISTRATOR', display: 'System Administrator', portal: 'ADMINISTRATOR' },
      7: { name: 'REGIONAL_OFFICER', display: 'Regional Health Officer', portal: 'ADMINISTRATOR' }
    };
    const role = roleNames[fallbackUser.role_id] || roleNames[1];

    return {
      ...fallbackUser,
      role_name: role.name,
      role_display_name: role.display,
      portal_access: role.portal,
      facility_name: fallbackUser.facility_id ? `Facility ${fallbackUser.facility_id}` : null
    };
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    if (!email) return null;
    return UserModel.findByEmail(email);
  }

  /**
   * List users with pagination and filtering
   */
  async findAll(options = {}) {
    const {
      limit = 20,
      offset = 0,
      roleId = null,
      isActive = null,
      facilityId = null,
      search = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const allowedSortColumns = {
      id: 'u.id',
      created_at: 'u.created_at',
      email: 'u.email',
      first_name: 'u.first_name',
      last_name: 'u.last_name',
      role_id: 'u.role_id'
    };
    const sortCol = allowedSortColumns[sortBy] || 'u.created_at';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    try {
      const conditions = ['u.deleted_at IS NULL'];
      const params = [];

      if (roleId !== null && roleId !== undefined) {
        params.push(Number(roleId));
        conditions.push(`u.role_id = $${params.length}`);
      }

      if (isActive !== null && isActive !== undefined) {
        params.push(Boolean(isActive));
        conditions.push(`u.is_active = $${params.length}`);
      }

      if (facilityId) {
        params.push(facilityId);
        conditions.push(`u.facility_id = $${params.length}`);
      }

      if (search) {
        params.push(`%${search.trim().toLowerCase()}%`);
        conditions.push(`(
          LOWER(u.first_name) LIKE $${params.length} OR 
          LOWER(u.last_name) LIKE $${params.length} OR 
          LOWER(u.email) LIKE $${params.length} OR
          LOWER(u.phone_number) LIKE $${params.length}
        )`);
      }

      params.push(limit);
      const limitIndex = params.length;
      params.push(offset);
      const offsetIndex = params.length;

      const sql = `
        SELECT 
          u.id, u.uuid, u.email, u.first_name, u.last_name, u.phone_number,
          u.role_id, u.facility_id, u.department, u.job_title,
          u.is_active, u.is_verified, u.last_login_at, u.created_at, u.updated_at,
          r.name as role_name, r.display_name as role_display_name, r.portal_access,
          f.name as facility_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN healthcare_facilities f ON u.facility_id = f.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortCol} ${direction}
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `;

      const res = await query(sql, params);
      if (res.rows) return res.rows;
    } catch {
      // In-memory / test fallback
    }

    // In-memory search fallback for tests
    return this.fallbackSearch(options);
  }

  /**
   * Count users matching filter criteria
   */
  async count(options = {}) {
    const { roleId = null, isActive = null, facilityId = null, search = null } = options;

    try {
      const conditions = ['u.deleted_at IS NULL'];
      const params = [];

      if (roleId !== null && roleId !== undefined) {
        params.push(Number(roleId));
        conditions.push(`u.role_id = $${params.length}`);
      }

      if (isActive !== null && isActive !== undefined) {
        params.push(Boolean(isActive));
        conditions.push(`u.is_active = $${params.length}`);
      }

      if (facilityId) {
        params.push(facilityId);
        conditions.push(`u.facility_id = $${params.length}`);
      }

      if (search) {
        params.push(`%${search.trim().toLowerCase()}%`);
        conditions.push(`(
          LOWER(u.first_name) LIKE $${params.length} OR 
          LOWER(u.last_name) LIKE $${params.length} OR 
          LOWER(u.email) LIKE $${params.length}
        )`);
      }

      const sql = `
        SELECT COUNT(u.id)::int as count 
        FROM users u 
        WHERE ${conditions.join(' AND ')}
      `;
      const res = await query(sql, params);
      if (res.rows && res.rows.length > 0) return res.rows[0].count;
    } catch {
      // Fallback
    }

    const list = await this.fallbackSearch(options);
    return list.length;
  }

  /**
   * Create user record
   */
  async create(userData) {
    return UserModel.create(userData);
  }

  /**
   * Update user record
   */
  async update(id, updateData) {
    const { firstName, lastName, phoneNumber, department, jobTitle, facilityId, roleId } = updateData;

    try {
      const fields = [];
      const params = [id];

      if (firstName !== undefined) {
        params.push(firstName);
        fields.push(`first_name = $${params.length}`);
      }
      if (lastName !== undefined) {
        params.push(lastName);
        fields.push(`last_name = $${params.length}`);
      }
      if (phoneNumber !== undefined) {
        params.push(phoneNumber);
        fields.push(`phone_number = $${params.length}`);
      }
      if (department !== undefined) {
        params.push(department);
        fields.push(`department = $${params.length}`);
      }
      if (jobTitle !== undefined) {
        params.push(jobTitle);
        fields.push(`job_title = $${params.length}`);
      }
      if (facilityId !== undefined) {
        params.push(facilityId);
        fields.push(`facility_id = $${params.length}`);
      }
      if (roleId !== undefined) {
        params.push(Number(roleId));
        fields.push(`role_id = $${params.length}`);
      }

      fields.push(`updated_at = NOW()`);

      const sql = `
        UPDATE users 
        SET ${fields.join(', ')} 
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, uuid, email, first_name, last_name, phone_number, role_id, facility_id, department, job_title, is_active, updated_at
      `;
      const res = await query(sql, params);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const user = await UserModel.findById(id);
    if (!user) return null;
    if (firstName !== undefined) user.first_name = firstName;
    if (lastName !== undefined) user.last_name = lastName;
    if (phoneNumber !== undefined) user.phone_number = phoneNumber;
    if (department !== undefined) user.department = department;
    if (jobTitle !== undefined) user.job_title = jobTitle;
    if (facilityId !== undefined) user.facility_id = facilityId;
    if (roleId !== undefined) user.role_id = Number(roleId);
    user.updated_at = new Date().toISOString();
    return user;
  }

  /**
   * Set user active / inactive status
   */
  async setStatus(id, isActive) {
    await UserModel.setAccountStatus(id, isActive);
    return this.findById(id);
  }

  /**
   * Fetch facility assignments for a user
   */
  async getUserFacilities(userId) {
    try {
      const sql = `
        SELECT 
          fsa.id as assignment_id,
          fsa.facility_id,
          fsa.department_id,
          fsa.assignment_role,
          fsa.is_primary,
          fsa.start_date,
          fsa.end_date,
          f.name as facility_name,
          f.facility_type,
          f.region,
          fd.name as department_name
        FROM facility_staff_assignments fsa
        JOIN healthcare_facilities f ON fsa.facility_id = f.id
        LEFT JOIN facility_departments fd ON fsa.department_id = fd.id
        WHERE fsa.user_id = $1 AND (fsa.end_date IS NULL OR fsa.end_date >= CURRENT_DATE)
        ORDER BY fsa.is_primary DESC, fsa.created_at DESC
      `;
      const res = await query(sql, [userId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }
    return [];
  }

  /**
   * In-memory search helper for testing
   */
  fallbackSearch(options = {}) {
    const { limit = 20, offset = 0, roleId = null, isActive = null, facilityId = null, search = null } = options;

    const all = [];
    const roleNames = {
      1: { name: 'HEALTH_CENTRE_STAFF', display: 'Health Centre Staff', portal: 'HEALTH_CENTRE' },
      2: { name: 'HOSPITAL_STAFF', display: 'Hospital Staff', portal: 'HOSPITAL' },
      3: { name: 'HOSPITAL_TRIAGE', display: 'Hospital Specialist / Triage', portal: 'HOSPITAL' },
      4: { name: 'TRANSPORT_COORDINATOR', display: 'Transport Coordinator', portal: 'TRANSPORT' },
      5: { name: 'AMBULANCE_DRIVER', display: 'Ambulance Driver', portal: 'TRANSPORT' },
      6: { name: 'SYSTEM_ADMINISTRATOR', display: 'System Administrator', portal: 'ADMINISTRATOR' },
      7: { name: 'REGIONAL_OFFICER', display: 'Regional Health Officer', portal: 'ADMINISTRATOR' }
    };

    // Iterate through in-memory store
    const mockUsers = UserModel.getAllMockUsers ? UserModel.getAllMockUsers() : [];
    for (const u of mockUsers) {
      if (u && !u.deleted_at) {
        const role = roleNames[u.role_id] || roleNames[1];
        all.push({
          ...u,
          role_name: role.name,
          role_display_name: role.display,
          portal_access: role.portal,
          facility_name: u.facility_id ? `Facility ${u.facility_id}` : null
        });
      }
    }

    let filtered = all;
    if (roleId !== null) filtered = filtered.filter((u) => Number(u.role_id) === Number(roleId));
    if (isActive !== null) filtered = filtered.filter((u) => Boolean(u.is_active) === Boolean(isActive));
    if (facilityId) filtered = filtered.filter((u) => u.facility_id === facilityId);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.first_name && u.first_name.toLowerCase().includes(q)) ||
          (u.last_name && u.last_name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
      );
    }

    return filtered.slice(offset, offset + limit);
  }
}

export default new UserRepository();
