/**
 * CareConnect Ethiopia - Staff & Role Assignment Repository
 * Manages facility_staff_assignments and user_roles in PostgreSQL with in-memory test store.
 */

import { query } from '../config/database.js';
import { ROLE_MAP, DEFAULT_ROLE_PERMISSIONS } from '../middleware/rbac.js';

// In-memory test stores
const inMemoryStaffAssignments = new Map(); // id -> assignment
const inMemoryUserRoles = new Map(); // `${userId}:${roleId}` -> role record
let nextAssignmentId = 1;

export class AssignmentRepository {
  /**
   * Get active facility assignments for a user
   */
  async getUserFacilityAssignments(userId) {
    const numId = Number(userId);
    try {
      const sql = `
        SELECT 
          fsa.id as assignment_id,
          fsa.uuid as assignment_uuid,
          fsa.user_id,
          fsa.facility_id,
          fsa.department_id,
          fsa.assignment_role,
          fsa.is_primary,
          fsa.start_date,
          fsa.end_date,
          fsa.created_at,
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
      const res = await query(sql, [numId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    const assignments = [];
    for (const a of inMemoryStaffAssignments.values()) {
      if (a.user_id === numId && (!a.end_date || new Date(a.end_date) >= new Date())) {
        assignments.push(a);
      }
    }
    return assignments;
  }

  /**
   * Get staff assigned to a specific facility
   */
  async getFacilityStaff(facilityId) {
    const cleanFacilityId = String(facilityId).trim().toLowerCase();
    try {
      const sql = `
        SELECT 
          fsa.id as assignment_id,
          fsa.user_id,
          fsa.assignment_role,
          fsa.is_primary,
          fsa.start_date,
          fsa.end_date,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role_id,
          r.name as role_name,
          fd.name as department_name
        FROM facility_staff_assignments fsa
        JOIN users u ON fsa.user_id = u.id
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN facility_departments fd ON fsa.department_id = fd.id
        WHERE fsa.facility_id = $1 AND u.deleted_at IS NULL AND (fsa.end_date IS NULL OR fsa.end_date >= CURRENT_DATE)
        ORDER BY fsa.is_primary DESC, u.last_name ASC
      `;
      const res = await query(sql, [cleanFacilityId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    const staff = [];
    for (const a of inMemoryStaffAssignments.values()) {
      if (a.facility_id === cleanFacilityId && (!a.end_date || new Date(a.end_date) >= new Date())) {
        staff.push(a);
      }
    }
    return staff;
  }

  /**
   * Find existing active assignment for a user at a facility
   */
  async findActiveAssignment(userId, facilityId) {
    const numId = Number(userId);
    const cleanFacilityId = String(facilityId).trim().toLowerCase();
    try {
      const sql = `
        SELECT * FROM facility_staff_assignments
        WHERE user_id = $1 AND facility_id = $2 AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      `;
      const res = await query(sql, [numId, cleanFacilityId]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    for (const a of inMemoryStaffAssignments.values()) {
      if (a.user_id === numId && a.facility_id === cleanFacilityId && (!a.end_date || new Date(a.end_date) >= new Date())) {
        return a;
      }
    }
    return null;
  }

  /**
   * Create staff assignment
   */
  async createStaffAssignment(data) {
    const {
      userId,
      facilityId,
      departmentId = null,
      assignmentRole = 'Staff',
      isPrimary = true,
      startDate = new Date().toISOString().split('T')[0]
    } = data;

    const numUserId = Number(userId);
    const cleanFacilityId = String(facilityId).trim().toLowerCase();

    try {
      const sql = `
        INSERT INTO facility_staff_assignments (
          user_id, facility_id, department_id, assignment_role, is_primary, start_date
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const res = await query(sql, [numUserId, cleanFacilityId, departmentId, assignmentRole, isPrimary, startDate]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const assignment = {
      id: nextAssignmentId++,
      user_id: numUserId,
      facility_id: cleanFacilityId,
      department_id: departmentId,
      assignment_role: assignmentRole,
      is_primary: Boolean(isPrimary),
      start_date: startDate,
      end_date: null,
      created_at: new Date().toISOString()
    };
    inMemoryStaffAssignments.set(assignment.id, assignment);
    return assignment;
  }

  /**
   * End staff assignment (soft removal)
   */
  async endStaffAssignment(userId, facilityId) {
    const numUserId = Number(userId);
    const cleanFacilityId = String(facilityId).trim().toLowerCase();

    try {
      const sql = `
        UPDATE facility_staff_assignments 
        SET end_date = CURRENT_DATE 
        WHERE user_id = $1 AND facility_id = $2 AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        RETURNING *
      `;
      const res = await query(sql, [numUserId, cleanFacilityId]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    for (const a of inMemoryStaffAssignments.values()) {
      if (a.user_id === numUserId && a.facility_id === cleanFacilityId && (!a.end_date || new Date(a.end_date) >= new Date())) {
        a.end_date = new Date().toISOString().split('T')[0];
        return a;
      }
    }
    return null;
  }

  /**
   * Assign role to user in user_roles
   */
  async assignRole(userId, roleId, assignedByUserId) {
    const numUserId = Number(userId);
    const numRoleId = Number(roleId);
    const numAssignedBy = assignedByUserId ? Number(assignedByUserId) : null;

    try {
      const sql = `
        INSERT INTO user_roles (user_id, role_id, assigned_by_user_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, role_id) DO NOTHING
        RETURNING *
      `;
      const res = await query(sql, [numUserId, numRoleId, numAssignedBy]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const key = `${numUserId}:${numRoleId}`;
    const record = {
      user_id: numUserId,
      role_id: numRoleId,
      assigned_by_user_id: numAssignedBy,
      created_at: new Date().toISOString()
    };
    inMemoryUserRoles.set(key, record);
    return record;
  }

  /**
   * Remove role from user
   */
  async removeRole(userId, roleId) {
    const numUserId = Number(userId);
    const numRoleId = Number(roleId);

    try {
      const sql = `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING *`;
      const res = await query(sql, [numUserId, numRoleId]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const key = `${numUserId}:${numRoleId}`;
    if (inMemoryUserRoles.has(key)) {
      const rec = inMemoryUserRoles.get(key);
      inMemoryUserRoles.delete(key);
      return rec;
    }
    return null;
  }

  /**
   * Get all active roles assigned to a user
   */
  async getUserRoles(userId) {
    const numUserId = Number(userId);
    try {
      const sql = `
        SELECT r.id, r.name, r.display_name, r.description, r.portal_access
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `;
      const res = await query(sql, [numUserId]);
      if (res.rows && res.rows.length > 0) return res.rows;
    } catch {
      // Fallback
    }

    const roles = [];
    for (const [key, val] of inMemoryUserRoles.entries()) {
      if (val.user_id === numUserId) {
        const rInfo = ROLE_MAP[val.role_id] || { name: 'UNKNOWN', portal: 'NONE' };
        roles.push({
          id: val.role_id,
          name: rInfo.name,
          display_name: rInfo.name,
          portal_access: rInfo.portal
        });
      }
    }
    return roles;
  }

  /**
   * List all system roles
   */
  async getAllRoles() {
    try {
      const sql = `SELECT * FROM roles ORDER BY id ASC`;
      const res = await query(sql);
      if (res.rows && res.rows.length > 0) return res.rows;
    } catch {
      // Fallback
    }

    return Object.values(ROLE_MAP).map((r) => ({
      id: r.id,
      name: r.name,
      display_name: r.name.replace(/_/g, ' '),
      portal_access: r.portal
    }));
  }

  /**
   * Get permissions attached to a role
   */
  async getRolePermissions(roleId) {
    const numRoleId = Number(roleId);
    try {
      const sql = `
        SELECT p.id, p.code, p.name, p.category, p.description
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1
        ORDER BY p.code ASC
      `;
      const res = await query(sql, [numRoleId]);
      if (res.rows && res.rows.length > 0) return res.rows;
    } catch {
      // Fallback
    }

    const codes = DEFAULT_ROLE_PERMISSIONS[numRoleId] || [];
    return codes.map((c, idx) => ({
      id: idx + 1,
      code: c,
      name: c.replace(/:/g, ' '),
      category: c.split(':')[0].toUpperCase()
    }));
  }

  /**
   * Clear in-memory assignment stores
   */
  clearStore() {
    inMemoryStaffAssignments.clear();
    inMemoryUserRoles.clear();
    nextAssignmentId = 1;
  }

  static clearStore() {
    inMemoryStaffAssignments.clear();
    inMemoryUserRoles.clear();
    nextAssignmentId = 1;
  }
}

export default new AssignmentRepository();
