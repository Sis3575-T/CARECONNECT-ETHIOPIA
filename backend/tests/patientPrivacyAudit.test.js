import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';
import securityAuditService from '../src/services/securityAuditService.js';

test('Patient Record Audit & Privacy Controls Suite — Commit 047', async (t) => {
  patientRepository.clearStore();
  UserModel.clearMockUsers();
  securityAuditService.clearStore();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const staff = await UserModel.create({
    email: 'clinical.staff@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tigist',
    lastName: 'Alemu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const transportUser = await UserModel.create({
    email: 'trans.privacy@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Kassahun',
    lastName: 'Bekele',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: null
  });

  const adminUser = await UserModel.create({
    email: 'admin.privacy@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'System',
    lastName: 'Admin',
    roleId: 6, // SYSTEM_ADMINISTRATOR
    facilityId: null
  });

  const staffToken = generateAccessToken(staff);
  const transportToken = generateAccessToken(transportUser);
  const adminToken = generateAccessToken(adminUser);

  // Register patient with sensitive medical baseline
  const patient = await patientRepository.create({
    first_name: 'Lensa',
    father_name: 'Dabala',
    grandfather_name: 'Tolosa',
    gender: 'FEMALE',
    date_of_birth: '1994-11-03',
    age_years: 32,
    phone_number: '+251911556677',
    region: 'Oromia',
    woreda: 'Bishoftu Woreda',
    registered_facility_id: 'fac-hc-bole-01',
    blood_type: 'AB+',
    known_allergies: 'Severe sulfonamide anaphylactic allergy',
    chronic_conditions: 'Chronic viral hepatitis, Asthmatic'
  });

  await t.test('GET /api/v1/patients/:patientId logs PATIENT_RECORD_VIEWED in audit trail', async () => {
    const res = await request(app).get(`/api/v1/patients/${patient.id}`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify audit log captured view event
    const auditLogs = securityAuditService.getInMemoryLogs();
    assert.ok(
      auditLogs.some((l) => l.event_name === 'PATIENT_RECORD_VIEWED' && l.user_id === staff.id)
    );
  });

  await t.test('Audit log details sanitize and never leak sensitive clinical descriptions in plaintext', async () => {
    const auditLogs = securityAuditService.getInMemoryLogs();
    for (const log of auditLogs) {
      const detailsStr = JSON.stringify(log.details || {});
      // Ensure private clinical texts are never logged into system audit logs
      assert.ok(!detailsStr.includes('Severe sulfonamide anaphylactic allergy'));
      assert.ok(!detailsStr.includes('Chronic viral hepatitis'));
    }
  });

  await t.test('Transport Coordinator receives only journey-essential transit details', async () => {
    const res = await request(app).get(`/api/v1/patients/${patient.id}`, {
      headers: { Authorization: `Bearer ${transportToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data.patient;

    // Allowed transit fields
    assert.equal(data.id, patient.id);
    assert.equal(data.full_name, 'Lensa Dabala Tolosa');
    assert.equal(data.gender, 'FEMALE');
    assert.equal(data.region, 'Oromia');
    assert.equal(data.woreda, 'Bishoftu Woreda');

    // Strictly forbidden clinical fields must be omitted
    assert.equal(data.blood_type, undefined);
    assert.equal(data.known_allergies, undefined);
    assert.equal(data.chronic_conditions, undefined);
    assert.equal(data.medical_baseline, undefined);
  });

  await t.test('System Administrator views administrative demographics without clinical charts', async () => {
    const res = await request(app).get(`/api/v1/patients/${patient.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data.patient;

    assert.equal(data.id, patient.id);
    assert.equal(data.full_name, 'Lensa Dabala Tolosa');
    assert.equal(data.status, 'ACTIVE');

    // Administrator does not automatically receive clinical baseline records
    assert.equal(data.blood_type, undefined);
    assert.equal(data.known_allergies, undefined);
    assert.equal(data.chronic_conditions, undefined);
    assert.equal(data.medical_baseline, undefined);
  });

  await t.test('GET /api/v1/audit exposes patient audit entries to administrator with audit:view permission', async () => {
    const res = await request(app).get('/api/v1/audit/logs', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.logs));
    assert.ok(res.body.data.logs.some((e) => e.event_name === 'PATIENT_RECORD_VIEWED'));
  });
});
