/**
 * CareConnect Ethiopia - Patient Repository Architecture
 * Data access layer for Patient entities, Identifiers, Contacts, Baseline, Corrections & Duplicate Reviews.
 * Features dual-mode execution: Live PostgreSQL database queries with transparent in-memory test store fallback.
 */

import crypto from 'crypto';
import { BaseRepository } from './baseRepository.js';
import { query } from '../config/database.js';

// In-memory test stores
const inMemoryPatients = new Map();
const inMemoryIdentifiers = new Map();
const inMemoryEmergencyContacts = new Map();
const inMemoryMedicalBaseline = new Map();
const inMemoryCorrections = new Map();
const inMemoryDuplicateReviews = new Map();
const inMemoryMergeRequests = new Map();

export class PatientRepository extends BaseRepository {
  constructor() {
    super('patients');
  }

  /**
   * Generate standardized Ethiopian patient reference ID: ETH-PAT-YYYY-XXXXXX
   */
  generatePatientId() {
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ETH-PAT-${year}-${randomHex}`;
  }

  /**
   * Find patient by primary ID with attached identifiers, contacts, and baseline
   */
  async findById(id) {
    if (!id) return null;

    try {
      const sql = `
        SELECT 
          p.*,
          f.name as registered_facility_name,
          f.facility_type as registered_facility_type
        FROM patients p
        LEFT JOIN healthcare_facilities f ON p.registered_facility_id = f.id
        WHERE p.id = $1 AND p.deleted_at IS NULL
      `;
      const res = await query(sql, [id]);
      if (res.rows && res.rows.length > 0) {
        const patient = res.rows[0];
        patient.identifiers = await this.getIdentifiers(patient.id);
        patient.emergency_contacts = await this.getEmergencyContacts(patient.id);
        patient.medical_baseline = await this.getMedicalBaseline(patient.id);
        return patient;
      }
    } catch {
      // Fallback to in-memory store
    }

    const inMem = inMemoryPatients.get(id);
    if (!inMem || inMem.deleted_at) return null;

    const patient = { ...inMem };
    patient.identifiers = await this.getIdentifiers(patient.id);
    patient.emergency_contacts = await this.getEmergencyContacts(patient.id);
    patient.medical_baseline = await this.getMedicalBaseline(patient.id);
    return patient;
  }

  /**
   * Find patient by UUID
   */
  async findByUuid(uuid) {
    if (!uuid) return null;

    try {
      const sql = `
        SELECT p.* FROM patients p
        WHERE p.uuid = $1 AND p.deleted_at IS NULL
      `;
      const res = await query(sql, [uuid]);
      if (res.rows && res.rows.length > 0) {
        return this.findById(res.rows[0].id);
      }
    } catch {
      // Fallback
    }

    for (const p of inMemoryPatients.values()) {
      if (p.uuid === uuid && !p.deleted_at) {
        return this.findById(p.id);
      }
    }
    return null;
  }

  /**
   * Find patient by Medical Record Number (MRN)
   */
  async findByMrn(mrn) {
    if (!mrn) return null;
    const cleanMrn = String(mrn).trim().toUpperCase();

    try {
      const sql = `
        SELECT p.* FROM patients p
        WHERE (UPPER(p.medical_record_number) = $1 OR p.id = $1)
          AND p.deleted_at IS NULL
      `;
      const res = await query(sql, [cleanMrn]);
      if (res.rows && res.rows.length > 0) {
        return this.findById(res.rows[0].id);
      }
    } catch {
      // Fallback
    }

    for (const p of inMemoryPatients.values()) {
      if (
        !p.deleted_at &&
        ((p.medical_record_number && p.medical_record_number.toUpperCase() === cleanMrn) ||
          p.id.toUpperCase() === cleanMrn)
      ) {
        return this.findById(p.id);
      }
    }
    return null;
  }

  /**
   * Find patient by Ethiopian Fayda National ID
   */
  async findByNationalId(nationalId) {
    if (!nationalId) return null;
    const cleanId = String(nationalId).trim().toUpperCase();

    try {
      const sql = `
        SELECT p.* FROM patients p
        WHERE UPPER(p.national_id) = $1 AND p.deleted_at IS NULL
      `;
      const res = await query(sql, [cleanId]);
      if (res.rows && res.rows.length > 0) {
        return this.findById(res.rows[0].id);
      }
    } catch {
      // Fallback
    }

    for (const p of inMemoryPatients.values()) {
      if (!p.deleted_at && p.national_id && p.national_id.toUpperCase() === cleanId) {
        return this.findById(p.id);
      }
    }
    return null;
  }

  /**
   * Create a new patient record
   */
  async create(data) {
    const patientId = data.id || this.generatePatientId();
    const patientUuid = data.uuid || crypto.randomUUID();
    const now = new Date().toISOString();

    const record = {
      id: patientId,
      uuid: patientUuid,
      first_name: data.first_name,
      father_name: data.father_name,
      grandfather_name: data.grandfather_name || null,
      gender: data.gender ? data.gender.toUpperCase() : 'OTHER',
      date_of_birth: data.date_of_birth || null,
      age_years: data.age_years !== undefined ? Number(data.age_years) : 0,
      age_months: data.age_months !== undefined ? Number(data.age_months) : 0,
      is_dob_estimated: Boolean(data.is_dob_estimated),
      national_id: data.national_id ? String(data.national_id).trim().toUpperCase() : null,
      kebele_id: data.kebele_id ? String(data.kebele_id).trim() : null,
      phone_number: data.phone_number ? String(data.phone_number).trim() : null,
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      emergency_contact_relation: data.emergency_contact_relation || null,
      region: data.region || 'Addis Ababa',
      subcity_zone: data.subcity_zone || null,
      woreda: data.woreda || null,
      kebele: data.kebele || null,
      house_number: data.house_number || null,
      blood_type: data.blood_type || null,
      known_allergies: data.known_allergies || null,
      chronic_conditions: data.chronic_conditions || null,
      registered_facility_id: data.registered_facility_id || null,
      medical_record_number: data.medical_record_number || `MRN-${patientId.replace('ETH-PAT-', '')}`,
      primary_language: data.primary_language || 'AMHARIC',
      is_pregnant: Boolean(data.is_pregnant),
      edd_date: data.edd_date || null,
      confidentiality_level: data.confidentiality_level || 'STANDARD',
      status: data.status || 'ACTIVE',
      merged_into_patient_id: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    try {
      const sql = `
        INSERT INTO patients (
          id, uuid, first_name, father_name, grandfather_name,
          gender, date_of_birth, age_years, age_months, is_dob_estimated,
          national_id, kebele_id, phone_number,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
          region, subcity_zone, woreda, kebele, house_number,
          blood_type, known_allergies, chronic_conditions,
          registered_facility_id, medical_record_number, primary_language,
          is_pregnant, edd_date, confidentiality_level, status,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16,
          $17, $18, $19, $20, $21,
          $22, $23, $24,
          $25, $26, $27,
          $28, $29, $30, $31,
          $32, $33
        ) RETURNING *
      `;
      const values = [
        record.id, record.uuid, record.first_name, record.father_name, record.grandfather_name,
        record.gender, record.date_of_birth, record.age_years, record.age_months, record.is_dob_estimated,
        record.national_id, record.kebele_id, record.phone_number,
        record.emergency_contact_name, record.emergency_contact_phone, record.emergency_contact_relation,
        record.region, record.subcity_zone, record.woreda, record.kebele, record.house_number,
        record.blood_type, record.known_allergies, record.chronic_conditions,
        record.registered_facility_id, record.medical_record_number, record.primary_language,
        record.is_pregnant, record.edd_date, record.confidentiality_level, record.status,
        record.created_at, record.updated_at
      ];
      const res = await query(sql, values);
      if (res.rows && res.rows.length > 0) {
        const created = res.rows[0];
        inMemoryPatients.set(created.id, created);
        await this.postCreateRelations(created.id, data);
        return this.findById(created.id);
      }
    } catch {
      // In-memory fallback
    }

    inMemoryPatients.set(record.id, record);
    await this.postCreateRelations(record.id, data);
    return this.findById(record.id);
  }

  /**
   * Helper to attach identifiers, emergency contacts and medical baseline on creation
   */
  async postCreateRelations(patientId, data) {
    // 1. National ID identifier
    if (data.national_id) {
      await this.addIdentifier(patientId, {
        identifier_type: 'FAYDA_ID',
        identifier_value: data.national_id,
        issuing_authority: 'National ID Program Ethiopia',
        is_primary: true
      });
    }

    // 2. Kebele ID identifier
    if (data.kebele_id) {
      await this.addIdentifier(patientId, {
        identifier_type: 'KEBELE_ID',
        identifier_value: data.kebele_id,
        issuing_authority: `${data.woreda || 'Local'} Kebele Administration`,
        is_primary: false
      });
    }

    // 3. Facility MRN identifier
    if (data.medical_record_number) {
      await this.addIdentifier(patientId, {
        identifier_type: 'FACILITY_MRN',
        identifier_value: data.medical_record_number,
        issuing_authority: data.registered_facility_id || 'Healthcare Facility',
        is_primary: false
      });
    }

    // 4. Initial Emergency Contact
    if (data.emergency_contact_name && data.emergency_contact_phone) {
      await this.addEmergencyContact(patientId, {
        full_name: data.emergency_contact_name,
        relationship: data.emergency_contact_relation || 'FAMILY',
        phone_number: data.emergency_contact_phone,
        is_primary_contact: true
      });
    }

    // 5. Medical Baseline
    if (data.blood_type || data.known_allergies || data.chronic_conditions) {
      await this.setMedicalBaseline(patientId, {
        blood_group: data.blood_type,
        allergies: data.known_allergies,
        chronic_illnesses: data.chronic_conditions,
        recorded_by_user_id: data.recorded_by_user_id || null
      });
    }
  }

  /**
   * Update existing patient demographics
   */
  async update(id, updates = {}) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const fields = [];
    const values = [];
    let idx = 1;

    const allowedFields = [
      'first_name', 'father_name', 'grandfather_name', 'gender',
      'date_of_birth', 'age_years', 'age_months', 'is_dob_estimated',
      'national_id', 'kebele_id', 'phone_number',
      'region', 'subcity_zone', 'woreda', 'kebele', 'house_number',
      'blood_type', 'known_allergies', 'chronic_conditions',
      'registered_facility_id', 'medical_record_number', 'primary_language',
      'is_pregnant', 'edd_date', 'confidentiality_level', 'status'
    ];

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) return existing;

    const now = new Date().toISOString();
    fields.push(`updated_at = $${idx++}`);
    values.push(now);
    values.push(id);

    try {
      const sql = `
        UPDATE patients 
        SET ${fields.join(', ')} 
        WHERE id = $${idx} AND deleted_at IS NULL
        RETURNING *
      `;
      const res = await query(sql, values);
      if (res.rows && res.rows.length > 0) {
        inMemoryPatients.set(id, { ...existing, ...res.rows[0] });
        return this.findById(id);
      }
    } catch {
      // In-memory fallback
    }

    const inMem = inMemoryPatients.get(id);
    if (inMem) {
      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          inMem[key] = updates[key];
        }
      }
      inMem.updated_at = now;
      inMemoryPatients.set(id, inMem);
    }

    return this.findById(id);
  }

  /**
   * Update patient lifecycle status (ACTIVE, INACTIVE, DECEASED, MERGED)
   */
  async updateStatus(id, status, mergedIntoId = null) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    try {
      const sql = `
        UPDATE patients 
        SET status = $1, merged_into_patient_id = $2, updated_at = $3
        WHERE id = $4 AND deleted_at IS NULL
        RETURNING *
      `;
      const res = await query(sql, [status, mergedIntoId, now, id]);
      if (res.rows && res.rows.length > 0) {
        inMemoryPatients.set(id, { ...existing, ...res.rows[0] });
        return this.findById(id);
      }
    } catch {
      // In-memory fallback
    }

    const inMem = inMemoryPatients.get(id);
    if (inMem) {
      inMem.status = status;
      inMem.merged_into_patient_id = mergedIntoId;
      inMem.updated_at = now;
      inMemoryPatients.set(id, inMem);
    }
    return this.findById(id);
  }

  /**
   * Soft-delete patient
   */
  async softDelete(id) {
    const now = new Date().toISOString();
    try {
      const sql = `
        UPDATE patients 
        SET deleted_at = $1, status = 'INACTIVE', updated_at = $1
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING *
      `;
      const res = await query(sql, [now, id]);
      if (res.rows && res.rows.length > 0) {
        const inMem = inMemoryPatients.get(id);
        if (inMem) {
          inMem.deleted_at = now;
          inMem.status = 'INACTIVE';
        }
        return true;
      }
    } catch {
      // Fallback
    }

    const inMem = inMemoryPatients.get(id);
    if (inMem && !inMem.deleted_at) {
      inMem.deleted_at = now;
      inMem.status = 'INACTIVE';
      return true;
    }
    return false;
  }

  /**
   * Search patients with facility tenancy isolation, pagination & filters
   */
  async search(options = {}) {
    const {
      limit = 20,
      offset = 0,
      facilityId = null,
      search = null,
      region = null,
      woreda = null,
      gender = null,
      status = null
    } = options;

    try {
      let conditions = ['p.deleted_at IS NULL'];
      const params = [];
      let idx = 1;

      if (facilityId) {
        conditions.push(`p.registered_facility_id = $${idx++}`);
        params.push(facilityId);
      }

      if (region) {
        conditions.push(`LOWER(p.region) = LOWER($${idx++})`);
        params.push(region);
      }

      if (woreda) {
        conditions.push(`LOWER(p.woreda) = LOWER($${idx++})`);
        params.push(woreda);
      }

      if (gender) {
        conditions.push(`p.gender = $${idx++}`);
        params.push(gender.toUpperCase());
      }

      if (status) {
        conditions.push(`p.status = $${idx++}`);
        params.push(status.toUpperCase());
      }

      if (search) {
        conditions.push(`(
          p.id ILIKE $${idx} OR
          p.medical_record_number ILIKE $${idx} OR
          p.national_id ILIKE $${idx} OR
          p.phone_number ILIKE $${idx} OR
          p.first_name ILIKE $${idx} OR
          p.father_name ILIKE $${idx} OR
          p.grandfather_name ILIKE $${idx}
        )`);
        params.push(`%${search}%`);
        idx++;
      }

      const whereClause = conditions.join(' AND ');
      const sql = `
        SELECT 
          p.*,
          f.name as registered_facility_name
        FROM patients p
        LEFT JOIN healthcare_facilities f ON p.registered_facility_id = f.id
        WHERE ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;
      params.push(limit, offset);

      const res = await query(sql, params);
      if (res.rows) {
        return res.rows;
      }
    } catch {
      // In-memory fallback
    }

    return this.fallbackSearch(options);
  }

  /**
   * Count matching patients for pagination
   */
  async count(options = {}) {
    const {
      facilityId = null,
      search = null,
      region = null,
      woreda = null,
      gender = null,
      status = null
    } = options;

    try {
      let conditions = ['p.deleted_at IS NULL'];
      const params = [];
      let idx = 1;

      if (facilityId) {
        conditions.push(`p.registered_facility_id = $${idx++}`);
        params.push(facilityId);
      }

      if (region) {
        conditions.push(`LOWER(p.region) = LOWER($${idx++})`);
        params.push(region);
      }

      if (woreda) {
        conditions.push(`LOWER(p.woreda) = LOWER($${idx++})`);
        params.push(woreda);
      }

      if (gender) {
        conditions.push(`p.gender = $${idx++}`);
        params.push(gender.toUpperCase());
      }

      if (status) {
        conditions.push(`p.status = $${idx++}`);
        params.push(status.toUpperCase());
      }

      if (search) {
        conditions.push(`(
          p.id ILIKE $${idx} OR
          p.medical_record_number ILIKE $${idx} OR
          p.national_id ILIKE $${idx} OR
          p.phone_number ILIKE $${idx} OR
          p.first_name ILIKE $${idx} OR
          p.father_name ILIKE $${idx} OR
          p.grandfather_name ILIKE $${idx}
        )`);
        params.push(`%${search}%`);
        idx++;
      }

      const whereClause = conditions.join(' AND ');
      const sql = `SELECT COUNT(p.id)::int as count FROM patients p WHERE ${whereClause}`;
      const res = await query(sql, params);
      if (res.rows && res.rows.length > 0) {
        return res.rows[0].count;
      }
    } catch {
      // In-memory fallback
    }

    const allMatches = this.fallbackSearch({ ...options, limit: 100000, offset: 0 });
    return allMatches.length;
  }

  /**
   * In-memory search helper for testing
   */
  fallbackSearch(options = {}) {
    const {
      limit = 20,
      offset = 0,
      facilityId = null,
      search = null,
      region = null,
      woreda = null,
      gender = null,
      status = null
    } = options;

    let filtered = Array.from(inMemoryPatients.values()).filter((p) => !p.deleted_at);

    if (facilityId) {
      filtered = filtered.filter((p) => p.registered_facility_id === facilityId);
    }
    if (region) {
      filtered = filtered.filter((p) => p.region && p.region.toLowerCase() === region.toLowerCase());
    }
    if (woreda) {
      filtered = filtered.filter((p) => p.woreda && p.woreda.toLowerCase() === woreda.toLowerCase());
    }
    if (gender) {
      filtered = filtered.filter((p) => p.gender && p.gender.toUpperCase() === gender.toUpperCase());
    }
    if (status) {
      filtered = filtered.filter((p) => p.status && p.status.toUpperCase() === status.toUpperCase());
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((p) => {
        return (
          (p.id && p.id.toLowerCase().includes(q)) ||
          (p.medical_record_number && p.medical_record_number.toLowerCase().includes(q)) ||
          (p.national_id && p.national_id.toLowerCase().includes(q)) ||
          (p.phone_number && p.phone_number.toLowerCase().includes(q)) ||
          (p.first_name && p.first_name.toLowerCase().includes(q)) ||
          (p.father_name && p.father_name.toLowerCase().includes(q)) ||
          (p.grandfather_name && p.grandfather_name.toLowerCase().includes(q))
        );
      });
    }

    return filtered.slice(offset, offset + limit);
  }

  /* =========================================================================
   * IDENTIFIERS MANAGEMENT
   * ========================================================================= */
  async getIdentifiers(patientId) {
    try {
      const sql = `SELECT * FROM patient_identifiers WHERE patient_id = $1 ORDER BY is_primary DESC, id ASC`;
      const res = await query(sql, [patientId]);
      if (res.rows) return res.rows;
    } catch {
      // In-memory fallback
    }

    return Array.from(inMemoryIdentifiers.values()).filter((i) => i.patient_id === patientId);
  }

  async addIdentifier(patientId, identifierData) {
    const id = inMemoryIdentifiers.size + 1;
    const item = {
      id,
      uuid: crypto.randomUUID(),
      patient_id: patientId,
      identifier_type: identifierData.identifier_type,
      identifier_value: String(identifierData.identifier_value).trim(),
      issuing_authority: identifierData.issuing_authority || null,
      is_primary: Boolean(identifierData.is_primary),
      created_at: new Date().toISOString()
    };

    try {
      const sql = `
        INSERT INTO patient_identifiers (
          uuid, patient_id, identifier_type, identifier_value, issuing_authority, is_primary
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.patient_id, item.identifier_type,
        item.identifier_value, item.issuing_authority, item.is_primary
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryIdentifiers.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryIdentifiers.set(item.id, item);
    return item;
  }

  /* =========================================================================
   * EMERGENCY CONTACTS MANAGEMENT
   * ========================================================================= */
  async getEmergencyContacts(patientId) {
    try {
      const sql = `SELECT * FROM patient_emergency_contacts WHERE patient_id = $1 ORDER BY is_primary_contact DESC, id ASC`;
      const res = await query(sql, [patientId]);
      if (res.rows) return res.rows;
    } catch {
      // In-memory fallback
    }

    return Array.from(inMemoryEmergencyContacts.values()).filter((c) => c.patient_id === patientId);
  }

  async getEmergencyContactById(patientId, contactId) {
    try {
      const sql = `SELECT * FROM patient_emergency_contacts WHERE patient_id = $1 AND (id = $2 OR uuid = $2)`;
      const res = await query(sql, [patientId, contactId]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    return (
      Array.from(inMemoryEmergencyContacts.values()).find(
        (c) => c.patient_id === patientId && (String(c.id) === String(contactId) || c.uuid === contactId)
      ) || null
    );
  }

  async addEmergencyContact(patientId, contactData) {
    const id = inMemoryEmergencyContacts.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: crypto.randomUUID(),
      patient_id: patientId,
      full_name: contactData.full_name,
      relationship: contactData.relationship || 'FAMILY',
      phone_number: String(contactData.phone_number).trim(),
      alternate_phone: contactData.alternate_phone ? String(contactData.alternate_phone).trim() : null,
      address_text: contactData.address_text || null,
      is_primary_contact: contactData.is_primary_contact !== undefined ? Boolean(contactData.is_primary_contact) : true,
      created_at: now,
      updated_at: now
    };

    try {
      const sql = `
        INSERT INTO patient_emergency_contacts (
          uuid, patient_id, full_name, relationship, phone_number,
          alternate_phone, address_text, is_primary_contact, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.patient_id, item.full_name, item.relationship,
        item.phone_number, item.alternate_phone, item.address_text,
        item.is_primary_contact, item.created_at, item.updated_at
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryEmergencyContacts.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryEmergencyContacts.set(item.id, item);
    return item;
  }

  async updateEmergencyContact(patientId, contactId, contactData) {
    const existing = await this.getEmergencyContactById(patientId, contactId);
    if (!existing) return null;

    const now = new Date().toISOString();
    try {
      const sql = `
        UPDATE patient_emergency_contacts
        SET full_name = COALESCE($1, full_name),
            relationship = COALESCE($2, relationship),
            phone_number = COALESCE($3, phone_number),
            alternate_phone = COALESCE($4, alternate_phone),
            address_text = COALESCE($5, address_text),
            is_primary_contact = COALESCE($6, is_primary_contact),
            updated_at = $7
        WHERE patient_id = $8 AND (id = $9 OR uuid = $9)
        RETURNING *
      `;
      const res = await query(sql, [
        contactData.full_name, contactData.relationship, contactData.phone_number,
        contactData.alternate_phone, contactData.address_text,
        contactData.is_primary_contact, now, patientId, contactId
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryEmergencyContacts.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    const inMem = Array.from(inMemoryEmergencyContacts.values()).find(
      (c) => c.patient_id === patientId && (String(c.id) === String(contactId) || c.uuid === contactId)
    );
    if (inMem) {
      if (contactData.full_name) inMem.full_name = contactData.full_name;
      if (contactData.relationship) inMem.relationship = contactData.relationship;
      if (contactData.phone_number) inMem.phone_number = contactData.phone_number;
      if (contactData.alternate_phone !== undefined) inMem.alternate_phone = contactData.alternate_phone;
      if (contactData.address_text !== undefined) inMem.address_text = contactData.address_text;
      if (contactData.is_primary_contact !== undefined) inMem.is_primary_contact = contactData.is_primary_contact;
      inMem.updated_at = now;
      return inMem;
    }
    return null;
  }

  async deleteEmergencyContact(patientId, contactId) {
    try {
      const sql = `DELETE FROM patient_emergency_contacts WHERE patient_id = $1 AND (id = $2 OR uuid = $2) RETURNING id`;
      const res = await query(sql, [patientId, contactId]);
      if (res.rows && res.rows.length > 0) {
        return true;
      }
    } catch {
      // Fallback
    }

    for (const [k, c] of inMemoryEmergencyContacts.entries()) {
      if (c.patient_id === patientId && (String(c.id) === String(contactId) || c.uuid === contactId)) {
        inMemoryEmergencyContacts.delete(k);
        return true;
      }
    }
    return false;
  }

  /* =========================================================================
   * MEDICAL BASELINE MANAGEMENT
   * ========================================================================= */
  async getMedicalBaseline(patientId) {
    try {
      const sql = `SELECT * FROM patient_medical_baseline WHERE patient_id = $1`;
      const res = await query(sql, [patientId]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    return inMemoryMedicalBaseline.get(patientId) || null;
  }

  async setMedicalBaseline(patientId, baselineData) {
    const now = new Date().toISOString();
    const item = {
      uuid: crypto.randomUUID(),
      patient_id: patientId,
      blood_group: baselineData.blood_group || null,
      allergies: baselineData.allergies || null,
      chronic_illnesses: baselineData.chronic_illnesses || null,
      current_medications: baselineData.current_medications || null,
      disabilities: baselineData.disabilities || null,
      baseline_notes: baselineData.baseline_notes || null,
      recorded_by_user_id: baselineData.recorded_by_user_id || null,
      created_at: now,
      updated_at: now
    };

    try {
      const sql = `
        INSERT INTO patient_medical_baseline (
          uuid, patient_id, blood_group, allergies, chronic_illnesses,
          current_medications, disabilities, baseline_notes, recorded_by_user_id,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (patient_id) DO UPDATE SET
          blood_group = EXCLUDED.blood_group,
          allergies = EXCLUDED.allergies,
          chronic_illnesses = EXCLUDED.chronic_illnesses,
          current_medications = EXCLUDED.current_medications,
          disabilities = EXCLUDED.disabilities,
          baseline_notes = EXCLUDED.baseline_notes,
          recorded_by_user_id = EXCLUDED.recorded_by_user_id,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.patient_id, item.blood_group, item.allergies,
        item.chronic_illnesses, item.current_medications, item.disabilities,
        item.baseline_notes, item.recorded_by_user_id, item.created_at, item.updated_at
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryMedicalBaseline.set(patientId, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryMedicalBaseline.set(patientId, item);
    return item;
  }

  /* =========================================================================
   * DEMOGRAPHIC CORRECTIONS AUDIT TRAIL
   * ========================================================================= */
  async recordCorrection(patientId, correctionData) {
    const id = inMemoryCorrections.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: crypto.randomUUID(),
      patient_id: patientId,
      field_name: correctionData.field_name,
      old_value: correctionData.old_value !== undefined ? String(correctionData.old_value) : null,
      new_value: correctionData.new_value !== undefined ? String(correctionData.new_value) : null,
      reason: correctionData.reason,
      corrected_by_user_id: correctionData.corrected_by_user_id || null,
      created_at: now
    };

    try {
      const sql = `
        INSERT INTO patient_corrections (
          uuid, patient_id, field_name, old_value, new_value, reason, corrected_by_user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.patient_id, item.field_name, item.old_value,
        item.new_value, item.reason, item.corrected_by_user_id, item.created_at
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryCorrections.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryCorrections.set(item.id, item);
    return item;
  }

  async getCorrections(patientId) {
    try {
      const sql = `
        SELECT c.*, u.first_name as user_first_name, u.last_name as user_last_name
        FROM patient_corrections c
        LEFT JOIN users u ON c.corrected_by_user_id = u.id
        WHERE c.patient_id = $1
        ORDER BY c.created_at DESC
      `;
      const res = await query(sql, [patientId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    return Array.from(inMemoryCorrections.values())
      .filter((c) => c.patient_id === patientId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  /* =========================================================================
   * DUPLICATE DETECTION & CLINICAL REVIEWS
   * ========================================================================= */
  async recordDuplicateReview(targetId, candidateId, reviewData) {
    const id = inMemoryDuplicateReviews.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: crypto.randomUUID(),
      target_patient_id: targetId,
      candidate_patient_id: candidateId,
      review_status: reviewData.review_status, // 'CONFIRMED_MATCH', 'FALSE_POSITIVE', 'UNDER_INVESTIGATION'
      match_score: reviewData.match_score || 0,
      match_signals: reviewData.match_signals || {},
      reviewed_by_user_id: reviewData.reviewed_by_user_id || null,
      notes: reviewData.notes || null,
      created_at: now,
      updated_at: now
    };

    try {
      const sql = `
        INSERT INTO patient_duplicate_reviews (
          uuid, target_patient_id, candidate_patient_id, review_status,
          match_score, match_signals, reviewed_by_user_id, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (target_patient_id, candidate_patient_id) DO UPDATE SET
          review_status = EXCLUDED.review_status,
          match_score = EXCLUDED.match_score,
          match_signals = EXCLUDED.match_signals,
          reviewed_by_user_id = EXCLUDED.reviewed_by_user_id,
          notes = EXCLUDED.notes,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.target_patient_id, item.candidate_patient_id,
        item.review_status, item.match_score, JSON.stringify(item.match_signals),
        item.reviewed_by_user_id, item.notes, item.created_at, item.updated_at
      ]);
      if (res.rows && res.rows.length > 0) {
        const key = `${targetId}:${candidateId}`;
        inMemoryDuplicateReviews.set(key, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    const key = `${targetId}:${candidateId}`;
    inMemoryDuplicateReviews.set(key, item);
    return item;
  }

  async getDuplicateReviews(patientId) {
    try {
      const sql = `
        SELECT r.*, u.first_name as reviewer_first_name, u.last_name as reviewer_last_name
        FROM patient_duplicate_reviews r
        LEFT JOIN users u ON r.reviewed_by_user_id = u.id
        WHERE r.target_patient_id = $1 OR r.candidate_patient_id = $1
        ORDER BY r.updated_at DESC
      `;
      const res = await query(sql, [patientId]);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    return Array.from(inMemoryDuplicateReviews.values()).filter(
      (r) => r.target_patient_id === patientId || r.candidate_patient_id === patientId
    );
  }

  /* =========================================================================
   * MERGE REQUESTS MANAGEMENT
   * ========================================================================= */
  async createMergeRequest(sourceId, targetId, mergeData) {
    const id = inMemoryMergeRequests.size + 1;
    const now = new Date().toISOString();
    const item = {
      id,
      uuid: crypto.randomUUID(),
      source_patient_id: sourceId,
      target_patient_id: targetId,
      status: 'PENDING',
      reason: mergeData.reason,
      requested_by_user_id: mergeData.requested_by_user_id,
      reviewed_by_user_id: null,
      review_notes: null,
      created_at: now,
      reviewed_at: null,
      merged_at: null
    };

    try {
      const sql = `
        INSERT INTO patient_merge_requests (
          uuid, source_patient_id, target_patient_id, status, reason,
          requested_by_user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const res = await query(sql, [
        item.uuid, item.source_patient_id, item.target_patient_id,
        item.status, item.reason, item.requested_by_user_id, item.created_at
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryMergeRequests.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    inMemoryMergeRequests.set(item.id, item);
    return item;
  }

  async getMergeRequestById(requestId) {
    try {
      const sql = `SELECT * FROM patient_merge_requests WHERE id = $1 OR uuid = $1`;
      const res = await query(sql, [requestId]);
      if (res.rows && res.rows.length > 0) return res.rows[0];
    } catch {
      // Fallback
    }

    return (
      Array.from(inMemoryMergeRequests.values()).find(
        (r) => String(r.id) === String(requestId) || r.uuid === requestId
      ) || null
    );
  }

  async getMergeRequests(options = {}) {
    const { status = null, patientId = null } = options;
    try {
      let conditions = [];
      const params = [];
      let idx = 1;

      if (status) {
        conditions.push(`status = $${idx++}`);
        params.push(status.toUpperCase());
      }
      if (patientId) {
        conditions.push(`(source_patient_id = $${idx} OR target_patient_id = $${idx})`);
        params.push(patientId);
        idx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `SELECT * FROM patient_merge_requests ${whereClause} ORDER BY created_at DESC`;
      const res = await query(sql, params);
      if (res.rows) return res.rows;
    } catch {
      // Fallback
    }

    let results = Array.from(inMemoryMergeRequests.values());
    if (status) results = results.filter((r) => r.status === status.toUpperCase());
    if (patientId) {
      results = results.filter((r) => r.source_patient_id === patientId || r.target_patient_id === patientId);
    }
    return results;
  }

  async updateMergeRequest(requestId, updateData) {
    const existing = await this.getMergeRequestById(requestId);
    if (!existing) return null;

    const now = new Date().toISOString();
    try {
      const sql = `
        UPDATE patient_merge_requests
        SET status = COALESCE($1, status),
            reviewed_by_user_id = COALESCE($2, reviewed_by_user_id),
            review_notes = COALESCE($3, review_notes),
            reviewed_at = $4,
            merged_at = $5
        WHERE id = $6 OR uuid = $6
        RETURNING *
      `;
      const res = await query(sql, [
        updateData.status, updateData.reviewed_by_user_id,
        updateData.review_notes, now,
        updateData.status === 'APPROVED' ? now : null,
        requestId
      ]);
      if (res.rows && res.rows.length > 0) {
        inMemoryMergeRequests.set(res.rows[0].id, res.rows[0]);
        return res.rows[0];
      }
    } catch {
      // Fallback
    }

    const inMem = Array.from(inMemoryMergeRequests.values()).find(
      (r) => String(r.id) === String(requestId) || r.uuid === requestId
    );
    if (inMem) {
      if (updateData.status) inMem.status = updateData.status;
      if (updateData.reviewed_by_user_id) inMem.reviewed_by_user_id = updateData.reviewed_by_user_id;
      if (updateData.review_notes) inMem.review_notes = updateData.review_notes;
      inMem.reviewed_at = now;
      if (updateData.status === 'APPROVED') inMem.merged_at = now;
      return inMem;
    }
    return null;
  }

  /**
   * Reset all in-memory stores for isolated test executions
   */
  clearStore() {
    inMemoryPatients.clear();
    inMemoryIdentifiers.clear();
    inMemoryEmergencyContacts.clear();
    inMemoryMedicalBaseline.clear();
    inMemoryCorrections.clear();
    inMemoryDuplicateReviews.clear();
    inMemoryMergeRequests.clear();
  }

  static clearStore() {
    inMemoryPatients.clear();
    inMemoryIdentifiers.clear();
    inMemoryEmergencyContacts.clear();
    inMemoryMedicalBaseline.clear();
    inMemoryCorrections.clear();
    inMemoryDuplicateReviews.clear();
    inMemoryMergeRequests.clear();
  }
}

export default new PatientRepository();
