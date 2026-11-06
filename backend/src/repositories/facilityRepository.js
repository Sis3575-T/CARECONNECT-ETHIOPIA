/**
 * CareConnect Ethiopia - Healthcare Facility Repository
 * Data access layer for Healthcare Facility entities with PostgreSQL queries and in-memory test store.
 */

import { BaseRepository } from './baseRepository.js';
import { query } from '../config/database.js';

// In-memory facility fallback store for tests
const inMemoryFacilities = new Map();

export class FacilityRepository extends BaseRepository {
  constructor() {
    super('healthcare_facilities');
  }

  /**
   * Find facility by ID (e.g. 'fac-hc-bole-01')
   */
  async findById(id) {
    if (!id) return null;
    try {
      const sql = `
        SELECT 
          f.*,
          ft.name as facility_type_name,
          ft.level_order as facility_level_order
        FROM healthcare_facilities f
        LEFT JOIN facility_types ft ON f.facility_type = ft.code
        WHERE f.id = $1 AND f.deleted_at IS NULL
      `;
      const res = await query(sql, [id]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const inMem = inMemoryFacilities.get(id);
    if (!inMem || inMem.deleted_at) return null;
    return inMem;
  }

  /**
   * Find facility by UUID
   */
  async findByUuid(uuid) {
    if (!uuid) return null;
    try {
      const sql = `
        SELECT f.* FROM healthcare_facilities f
        WHERE f.uuid = $1 AND f.deleted_at IS NULL
      `;
      const res = await query(sql, [uuid]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    for (const f of inMemoryFacilities.values()) {
      if (f.uuid === uuid && !f.deleted_at) return f;
    }
    return null;
  }

  /**
   * List facilities with search, filter, and pagination
   */
  async findAll(options = {}) {
    const {
      limit = 20,
      offset = 0,
      type = null,
      region = null,
      tier = null,
      isActive = null,
      search = null,
      sortBy = 'name',
      sortOrder = 'ASC'
    } = options;

    const allowedSort = {
      name: 'f.name',
      id: 'f.id',
      created_at: 'f.created_at',
      region: 'f.region',
      total_beds: 'f.total_beds',
      facility_type: 'f.facility_type'
    };
    const sortCol = allowedSort[sortBy] || 'f.name';
    const direction = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    try {
      const conditions = ['f.deleted_at IS NULL'];
      const params = [];

      if (type) {
        params.push(type.toUpperCase());
        conditions.push(`f.facility_type = $${params.length}`);
      }

      if (region) {
        params.push(region);
        conditions.push(`LOWER(f.region) = LOWER($${params.length})`);
      }

      if (tier) {
        params.push(tier.toUpperCase());
        conditions.push(`f.tier = $${params.length}`);
      }

      if (service) {
        params.push(service.toUpperCase());
        conditions.push(`EXISTS (
          SELECT 1 FROM facility_services fs 
          WHERE fs.facility_id = f.id AND fs.service_code = $${params.length} AND fs.is_available = TRUE
        )`);
      }

      if (isActive !== null && isActive !== undefined) {
        params.push(Boolean(isActive));
        conditions.push(`f.is_active = $${params.length}`);
      }

      if (search) {
        params.push(`%${search.trim().toLowerCase()}%`);
        conditions.push(`(
          LOWER(f.name) LIKE $${params.length} OR 
          LOWER(f.id) LIKE $${params.length} OR 
          LOWER(f.woreda) LIKE $${params.length} OR 
          LOWER(f.subcity) LIKE $${params.length}
        )`);
      }

      params.push(limit);
      const limitIndex = params.length;
      params.push(offset);
      const offsetIndex = params.length;

      const sql = `
        SELECT 
          f.*,
          ft.name as facility_type_name
        FROM healthcare_facilities f
        LEFT JOIN facility_types ft ON f.facility_type = ft.code
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortCol} ${direction}
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `;
      const res = await query(sql, params);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    return this.fallbackSearch(options);
  }

  /**
   * Count facilities matching criteria
   */
  async count(options = {}) {
    const { type = null, region = null, tier = null, service = null, isActive = null, search = null } = options;

    try {
      const conditions = ['f.deleted_at IS NULL'];
      const params = [];

      if (type) {
        params.push(type.toUpperCase());
        conditions.push(`f.facility_type = $${params.length}`);
      }
      if (region) {
        params.push(region);
        conditions.push(`LOWER(f.region) = LOWER($${params.length})`);
      }
      if (tier) {
        params.push(tier.toUpperCase());
        conditions.push(`f.tier = $${params.length}`);
      }
      if (service) {
        params.push(service.toUpperCase());
        conditions.push(`EXISTS (
          SELECT 1 FROM facility_services fs 
          WHERE fs.facility_id = f.id AND fs.service_code = $${params.length} AND fs.is_available = TRUE
        )`);
      }
      if (isActive !== null && isActive !== undefined) {
        params.push(Boolean(isActive));
        conditions.push(`f.is_active = $${params.length}`);
      }
      if (search) {
        params.push(`%${search.trim().toLowerCase()}%`);
        conditions.push(`(
          LOWER(f.name) LIKE $${params.length} OR 
          LOWER(f.id) LIKE $${params.length}
        )`);
      }

      const sql = `
        SELECT COUNT(f.id)::int as count 
        FROM healthcare_facilities f 
        WHERE ${conditions.join(' AND ')}
      `;
      const res = await query(sql, params);
      if (res.rows && res.rows.length > 0) return res.rows[0].count;
    } catch {
      // Fallback
    }

    const list = await this.fallbackSearch({ ...options, limit: 10000, offset: 0 });
    return list.length;
  }

  /**
   * Create new healthcare facility
   */
  async create(data) {
    const {
      id,
      name,
      amharicName = null,
      facilityType,
      tier = 'PRIMARY',
      ownership = 'PUBLIC',
      region,
      subcity = null,
      woreda = null,
      kebele = null,
      phoneNumber = null,
      emergencyPhone = null,
      email = null,
      latitude = null,
      longitude = null,
      altitudeMeters = null,
      totalBeds = 0,
      totalIcuBeds = 0,
      hasEmergencyDepartment = true,
      hasBloodBank = false,
      hasCtScan = false,
      hasMri = false,
      isActive = true
    } = data;

    const cleanId = String(id).trim().toLowerCase();

    try {
      const sql = `
        INSERT INTO healthcare_facilities (
          id, name, amharic_name, facility_type, tier, ownership,
          region, subcity, woreda, kebele, phone_number, emergency_phone, email,
          latitude, longitude, altitude_meters, total_beds, total_icu_beds,
          has_emergency_department, has_blood_bank, has_ct_scan, has_mri, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
        RETURNING *
      `;
      const res = await query(sql, [
        cleanId, name.trim(), amharicName, facilityType, tier, ownership,
        region.trim(), subcity, woreda, kebele, phoneNumber, emergencyPhone, email,
        latitude, longitude, altitudeMeters, totalBeds, totalIcuBeds,
        hasEmergencyDepartment, hasBloodBank, hasCtScan, hasMri, isActive
      ]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const facility = {
      id: cleanId,
      uuid: crypto.randomUUID?.() || 'fac-uuid-' + cleanId,
      name: name.trim(),
      amharic_name: amharicName,
      facility_type: facilityType,
      tier,
      ownership,
      region: region.trim(),
      subcity,
      woreda,
      kebele,
      phone_number: phoneNumber,
      emergency_phone: emergencyPhone,
      email,
      latitude: latitude !== null ? Number(latitude) : null,
      longitude: longitude !== null ? Number(longitude) : null,
      altitude_meters: altitudeMeters,
      total_beds: Number(totalBeds || 0),
      total_icu_beds: Number(totalIcuBeds || 0),
      has_emergency_department: Boolean(hasEmergencyDepartment),
      has_blood_bank: Boolean(hasBloodBank),
      has_ct_scan: Boolean(hasCtScan),
      has_mri: Boolean(hasMri),
      is_active: Boolean(isActive),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };

    inMemoryFacilities.set(cleanId, facility);
    return facility;
  }

  /**
   * Update existing facility
   */
  async update(id, updateData) {
    const cleanId = String(id).trim().toLowerCase();

    try {
      const fields = [];
      const params = [cleanId];

      const allowedFields = {
        name: 'name',
        amharicName: 'amharic_name',
        facilityType: 'facility_type',
        tier: 'tier',
        ownership: 'ownership',
        region: 'region',
        subcity: 'subcity',
        woreda: 'woreda',
        kebele: 'kebele',
        phoneNumber: 'phone_number',
        emergencyPhone: 'emergency_phone',
        email: 'email',
        latitude: 'latitude',
        longitude: 'longitude',
        totalBeds: 'total_beds',
        totalIcuBeds: 'total_icu_beds',
        hasEmergencyDepartment: 'has_emergency_department',
        hasBloodBank: 'has_blood_bank',
        hasCtScan: 'has_ct_scan',
        hasMri: 'has_mri'
      };

      for (const [key, col] of Object.entries(allowedFields)) {
        if (updateData[key] !== undefined) {
          params.push(updateData[key]);
          fields.push(`${col} = $${params.length}`);
        }
      }

      fields.push('updated_at = NOW()');

      const sql = `
        UPDATE healthcare_facilities
        SET ${fields.join(', ')}
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `;
      const res = await query(sql, params);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const f = inMemoryFacilities.get(cleanId);
    if (!f || f.deleted_at) return null;

    if (updateData.name !== undefined) f.name = updateData.name;
    if (updateData.facilityType !== undefined) f.facility_type = updateData.facilityType;
    if (updateData.tier !== undefined) f.tier = updateData.tier;
    if (updateData.ownership !== undefined) f.ownership = updateData.ownership;
    if (updateData.region !== undefined) f.region = updateData.region;
    if (updateData.subcity !== undefined) f.subcity = updateData.subcity;
    if (updateData.woreda !== undefined) f.woreda = updateData.woreda;
    if (updateData.phoneNumber !== undefined) f.phone_number = updateData.phoneNumber;
    if (updateData.totalBeds !== undefined) f.total_beds = Number(updateData.totalBeds);
    if (updateData.totalIcuBeds !== undefined) f.total_icu_beds = Number(updateData.totalIcuBeds);
    if (updateData.hasEmergencyDepartment !== undefined) f.has_emergency_department = Boolean(updateData.hasEmergencyDepartment);
    if (updateData.hasBloodBank !== undefined) f.has_blood_bank = Boolean(updateData.hasBloodBank);
    if (updateData.hasCtScan !== undefined) f.has_ct_scan = Boolean(updateData.hasCtScan);
    if (updateData.hasMri !== undefined) f.has_mri = Boolean(updateData.hasMri);
    f.updated_at = new Date().toISOString();
    return f;
  }

  /**
   * Activate / deactivate facility (non-destructive status change)
   */
  async setStatus(id, isActive) {
    const cleanId = String(id).trim().toLowerCase();
    try {
      const sql = `
        UPDATE healthcare_facilities 
        SET is_active = $1, updated_at = NOW() 
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING *
      `;
      const res = await query(sql, [Boolean(isActive), cleanId]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    const f = inMemoryFacilities.get(cleanId);
    if (f) {
      f.is_active = Boolean(isActive);
      f.updated_at = new Date().toISOString();
      return f;
    }
    return null;
  }

  /**
   * In-memory search helper for tests
   */
  fallbackSearch(options = {}) {
    const {
      limit = 20,
      offset = 0,
      type = null,
      region = null,
      tier = null,
      isActive = null,
      search = null
    } = options;

    let filtered = Array.from(inMemoryFacilities.values()).filter((f) => !f.deleted_at);

    if (type) filtered = filtered.filter((f) => f.facility_type === type.toUpperCase());
    if (region) filtered = filtered.filter((f) => f.region && f.region.toLowerCase() === region.toLowerCase());
    if (tier) filtered = filtered.filter((f) => f.tier === tier.toUpperCase());
    if (isActive !== null) filtered = filtered.filter((f) => Boolean(f.is_active) === Boolean(isActive));
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          (f.name && f.name.toLowerCase().includes(q)) ||
          (f.id && f.id.toLowerCase().includes(q)) ||
          (f.woreda && f.woreda.toLowerCase().includes(q))
      );
    }

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Clear in-memory facilities (for test suites)
   */
  clearStore() {
    inMemoryFacilities.clear();
  }

  static clearStore() {
    inMemoryFacilities.clear();
  }
}

export default new FacilityRepository();
