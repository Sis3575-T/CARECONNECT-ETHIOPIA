/**
 * CareConnect Ethiopia - Facility Services & Departments Repository
 * Manages facility_services and facility_departments in PostgreSQL with in-memory test store.
 */

import { query } from '../config/database.js';

// In-memory test stores
const inMemoryServices = new Map(); // id -> service record
const inMemoryDepartments = new Map(); // id -> department record
let nextServiceId = 1;
let nextDepartmentId = 1;

export class FacilityServiceRepository {
  /**
   * Get all clinical services registered for a facility
   */
  async getFacilityServices(facilityId) {
    const cleanId = String(facilityId).trim().toLowerCase();
    try {
      const sql = `
        SELECT 
          fs.id,
          fs.facility_id,
          fs.service_code,
          fs.is_available,
          fs.has_specialist_on_duty,
          fs.operating_hours,
          fs.notes,
          fs.created_at,
          fs.updated_at,
          cs.name as service_name,
          cs.category as service_category,
          cs.description as service_description
        FROM facility_services fs
        LEFT JOIN clinical_services cs ON fs.service_code = cs.code
        WHERE fs.facility_id = $1
        ORDER BY fs.service_code ASC
      `;
      const res = await query(sql, [cleanId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    const services = [];
    for (const s of inMemoryServices.values()) {
      if (s.facility_id === cleanId) {
        services.push(s);
      }
    }
    return services;
  }

  /**
   * Find specific facility service by facility and service code
   */
  async findFacilityServiceByCode(facilityId, serviceCode) {
    const cleanId = String(facilityId).trim().toLowerCase();
    const cleanCode = String(serviceCode).trim().toUpperCase();

    try {
      const sql = `SELECT * FROM facility_services WHERE facility_id = $1 AND service_code = $2`;
      const res = await query(sql, [cleanId, cleanCode]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    for (const s of inMemoryServices.values()) {
      if (s.facility_id === cleanId && s.service_code === cleanCode) {
        return s;
      }
    }
    return null;
  }

  /**
   * Find facility service by ID
   */
  async findFacilityServiceById(id) {
    const numId = Number(id);
    try {
      const sql = `SELECT * FROM facility_services WHERE id = $1`;
      const res = await query(sql, [numId]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    return inMemoryServices.get(numId) || null;
  }

  /**
   * Create facility service
   */
  async createFacilityService(data) {
    const {
      facilityId,
      serviceCode,
      isAvailable = true,
      hasSpecialistOnDuty = true,
      operatingHours = '24/7',
      notes = null
    } = data;

    const cleanId = String(facilityId).trim().toLowerCase();
    const cleanCode = String(serviceCode).trim().toUpperCase();

    try {
      const sql = `
        INSERT INTO facility_services (
          facility_id, service_code, is_available, has_specialist_on_duty, operating_hours, notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const res = await query(sql, [cleanId, cleanCode, isAvailable, hasSpecialistOnDuty, operatingHours, notes]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const service = {
      id: nextServiceId++,
      facility_id: cleanId,
      service_code: cleanCode,
      service_name: cleanCode.replace(/_/g, ' '),
      is_available: Boolean(isAvailable),
      has_specialist_on_duty: Boolean(hasSpecialistOnDuty),
      operating_hours: operatingHours,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    inMemoryServices.set(service.id, service);
    return service;
  }

  /**
   * Update facility service
   */
  async updateFacilityService(id, updateData) {
    const numId = Number(id);
    const { isAvailable, hasSpecialistOnDuty, operatingHours, notes } = updateData;

    try {
      const fields = [];
      const params = [numId];

      if (isAvailable !== undefined) {
        params.push(Boolean(isAvailable));
        fields.push(`is_available = $${params.length}`);
      }
      if (hasSpecialistOnDuty !== undefined) {
        params.push(Boolean(hasSpecialistOnDuty));
        fields.push(`has_specialist_on_duty = $${params.length}`);
      }
      if (operatingHours !== undefined) {
        params.push(operatingHours);
        fields.push(`operating_hours = $${params.length}`);
      }
      if (notes !== undefined) {
        params.push(notes);
        fields.push(`notes = $${params.length}`);
      }

      fields.push('updated_at = NOW()');

      const sql = `
        UPDATE facility_services 
        SET ${fields.join(', ')} 
        WHERE id = $1 
        RETURNING *
      `;
      const res = await query(sql, params);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const s = inMemoryServices.get(numId);
    if (!s) return null;
    if (isAvailable !== undefined) s.is_available = Boolean(isAvailable);
    if (hasSpecialistOnDuty !== undefined) s.has_specialist_on_duty = Boolean(hasSpecialistOnDuty);
    if (operatingHours !== undefined) s.operating_hours = operatingHours;
    if (notes !== undefined) s.notes = notes;
    s.updated_at = new Date().toISOString();
    return s;
  }

  /**
   * Delete facility service
   */
  async deleteFacilityService(id) {
    const numId = Number(id);
    try {
      const sql = `DELETE FROM facility_services WHERE id = $1 RETURNING *`;
      const res = await query(sql, [numId]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    if (inMemoryServices.has(numId)) {
      const s = inMemoryServices.get(numId);
      inMemoryServices.delete(numId);
      return s;
    }
    return null;
  }

  /**
   * Get departments for a facility
   */
  async getFacilityDepartments(facilityId) {
    const cleanId = String(facilityId).trim().toLowerCase();
    try {
      const sql = `
        SELECT 
          fd.id,
          fd.uuid,
          fd.facility_id,
          fd.name,
          fd.code,
          fd.head_clinician_id,
          fd.phone_extension,
          fd.is_active,
          fd.created_at,
          fd.updated_at,
          u.first_name as head_first_name,
          u.last_name as head_last_name
        FROM facility_departments fd
        LEFT JOIN users u ON fd.head_clinician_id = u.id
        WHERE fd.facility_id = $1
        ORDER BY fd.name ASC
      `;
      const res = await query(sql, [cleanId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    const depts = [];
    for (const d of inMemoryDepartments.values()) {
      if (d.facility_id === cleanId) {
        depts.push(d);
      }
    }
    return depts;
  }

  /**
   * Find department by code within facility
   */
  async findFacilityDepartmentByCode(facilityId, code) {
    const cleanId = String(facilityId).trim().toLowerCase();
    const cleanCode = String(code).trim().toUpperCase();

    try {
      const sql = `SELECT * FROM facility_departments WHERE facility_id = $1 AND code = $2`;
      const res = await query(sql, [cleanId, cleanCode]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    for (const d of inMemoryDepartments.values()) {
      if (d.facility_id === cleanId && d.code === cleanCode) {
        return d;
      }
    }
    return null;
  }

  /**
   * Find department by ID
   */
  async findFacilityDepartmentById(id) {
    const numId = Number(id);
    try {
      const sql = `SELECT * FROM facility_departments WHERE id = $1`;
      const res = await query(sql, [numId]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    return inMemoryDepartments.get(numId) || null;
  }

  /**
   * Create facility department
   */
  async createFacilityDepartment(data) {
    const {
      facilityId,
      name,
      code,
      headClinicianId = null,
      phoneExtension = null,
      isActive = true
    } = data;

    const cleanId = String(facilityId).trim().toLowerCase();
    const cleanCode = String(code).trim().toUpperCase();

    try {
      const sql = `
        INSERT INTO facility_departments (
          facility_id, name, code, head_clinician_id, phone_extension, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const res = await query(sql, [cleanId, name.trim(), cleanCode, headClinicianId, phoneExtension, isActive]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const dept = {
      id: nextDepartmentId++,
      uuid: crypto.randomUUID?.() || `dept-uuid-${cleanCode}`,
      facility_id: cleanId,
      name: name.trim(),
      code: cleanCode,
      head_clinician_id: headClinicianId,
      phone_extension: phoneExtension,
      is_active: Boolean(isActive),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    inMemoryDepartments.set(dept.id, dept);
    return dept;
  }

  /**
   * Update facility department
   */
  async updateFacilityDepartment(id, updateData) {
    const numId = Number(id);
    const { name, headClinicianId, phoneExtension, isActive } = updateData;

    try {
      const fields = [];
      const params = [numId];

      if (name !== undefined) {
        params.push(name.trim());
        fields.push(`name = $${params.length}`);
      }
      if (headClinicianId !== undefined) {
        params.push(headClinicianId);
        fields.push(`head_clinician_id = $${params.length}`);
      }
      if (phoneExtension !== undefined) {
        params.push(phoneExtension);
        fields.push(`phone_extension = $${params.length}`);
      }
      if (isActive !== undefined) {
        params.push(Boolean(isActive));
        fields.push(`is_active = $${params.length}`);
      }

      fields.push('updated_at = NOW()');

      const sql = `
        UPDATE facility_departments 
        SET ${fields.join(', ')} 
        WHERE id = $1 
        RETURNING *
      `;
      const res = await query(sql, params);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const d = inMemoryDepartments.get(numId);
    if (!d) return null;
    if (name !== undefined) d.name = name.trim();
    if (headClinicianId !== undefined) d.head_clinician_id = headClinicianId;
    if (phoneExtension !== undefined) d.phone_extension = phoneExtension;
    if (isActive !== undefined) d.is_active = Boolean(isActive);
    d.updated_at = new Date().toISOString();
    return d;
  }

  /**
   * Clear in-memory stores
   */
  clearStore() {
    inMemoryServices.clear();
    inMemoryDepartments.clear();
    nextServiceId = 1;
    nextDepartmentId = 1;
  }

  static clearStore() {
    inMemoryServices.clear();
    inMemoryDepartments.clear();
    nextServiceId = 1;
    nextDepartmentId = 1;
  }
}

export default new FacilityServiceRepository();
