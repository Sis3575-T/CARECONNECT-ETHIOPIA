import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';
import securityAuditService from '../src/services/securityAuditService.js';

test('Part 06 Comprehensive Integration Verification Suite — Commit 048', async (t) => {
  patientRepository.clearStore();
  UserModel.clearMockUsers();
  securityAuditService.clearStore();

  const hashedPassword = await hashPassword('SecurePassword123!');

  // Set up 4 distinct actors across the portal boundaries
  const hcStaff = await UserModel.create({
    email: 'tigist.comprehensive@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tigist',
    lastName: 'Alemu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const otherHcStaff = await UserModel.create({
    email: 'kassahun.other@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Kassahun',
    lastName: 'Bekele',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-yeka-02'
  });

  const transportUser = await UserModel.create({
    email: 'driver.comprehensive@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dawit',
    lastName: 'Mulugeta',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: null
  });

  const adminUser = await UserModel.create({
    email: 'admin.comprehensive@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'System',
    lastName: 'Administrator',
    roleId: 6, // SYSTEM_ADMINISTRATOR
    facilityId: null
  });

  const hcToken = generateAccessToken(hcStaff);
  const otherHcToken = generateAccessToken(otherHcStaff);
  const transportToken = generateAccessToken(transportUser);
  const adminToken = generateAccessToken(adminUser);

  let patientId = null;
  let candidateDuplicateId = null;

  await t.test('1. Full Patronymic Patient Registration with Baseline & Contacts', async () => {
    const res = await request(app).post('/api/v1/patients', {
      first_name: 'Aster',
      father_name: 'Aweke',
      grandfather_name: 'Gebre',
      gender: 'FEMALE',
      date_of_birth: '1993-07-18',
      phone_number: '+251911002233',
      national_id: 'FAYDA-E2E-9999',
      region: 'Addis Ababa',
      subcity_zone: 'Bole',
      woreda: 'Woreda 03',
      kebele: 'Kebele 05',
      blood_type: 'O+',
      known_allergies: 'Ciprofloxacin hypersensitivity',
      chronic_conditions: 'Asthma',
      emergency_contact_name: 'Aweke Gebre',
      emergency_contact_phone: '+251911887766',
      emergency_contact_relation: 'PARENT'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.patient.id.startsWith('ETH-PAT-'));
    assert.equal(res.body.data.patient.full_name, 'Aster Aweke Gebre');
    assert.equal(res.body.data.patient.registered_facility_id, 'fac-hc-bole-01');
    assert.equal(res.body.data.patient.blood_type, 'O+');

    patientId = res.body.data.patient.id;
  });

  await t.test('2. Missing Phone and Estimated Age Registration (Ethiopian Reality)', async () => {
    const res = await request(app).post('/api/v1/patients', {
      first_name: 'Gemechu',
      father_name: 'Desta',
      gender: 'MALE',
      age_years: 72, // Elder without phone or birth record
      region: 'Oromia',
      woreda: 'Ambo Rural'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.patient.phone_number, null);
    assert.equal(res.body.data.patient.is_dob_estimated, true);
    assert.equal(res.body.data.patient.age_years, 72);
  });

  await t.test('3. Tenancy Isolation Blocks Cross-Facility Inspection and Search', async () => {
    // Other HC staff queries Bole patient profile -> 403 Forbidden
    const getRes = await request(app).get(`/api/v1/patients/${patientId}`, {
      headers: { Authorization: `Bearer ${otherHcToken}` }
    });
    assert.equal(getRes.status, 403);
    assert.equal(getRes.body.success, false);

    // Other HC staff searches patients -> Bole patient must NOT appear
    const searchRes = await request(app).get('/api/v1/patients', {
      headers: { Authorization: `Bearer ${otherHcToken}` }
    });
    assert.equal(searchRes.status, 200);
    assert.ok(!searchRes.body.data.some((p) => p.id === patientId));
  });

  await t.test('4. Role-Based Privacy Boundary Sanitization', async () => {
    // Transport coordinator gets only transit details
    const transRes = await request(app).get(`/api/v1/patients/${patientId}`, {
      headers: { Authorization: `Bearer ${transportToken}` }
    });
    assert.equal(transRes.status, 200);
    const transPatient = transRes.body.data.patient;
    assert.equal(transPatient.full_name, 'Aster Aweke Gebre');
    assert.equal(transPatient.blood_type, undefined);
    assert.equal(transPatient.known_allergies, undefined);
    assert.equal(transPatient.chronic_conditions, undefined);

    // Administrator gets demographics without raw medical baseline
    const adminRes = await request(app).get(`/api/v1/patients/${patientId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(adminRes.status, 200);
    const adminPatient = adminRes.body.data.patient;
    assert.equal(adminPatient.full_name, 'Aster Aweke Gebre');
    assert.equal(adminPatient.blood_type, undefined);
    assert.equal(adminPatient.known_allergies, undefined);
  });

  await t.test('5. Duplicate Detection Scoring & Clinical Human-in-the-Loop Review', async () => {
    // Seed candidate duplicate
    const candidate = await patientRepository.create({
      first_name: 'Aster',
      father_name: 'Aweke',
      gender: 'FEMALE',
      age_years: 33,
      phone_number: '+251911002233',
      region: 'Addis Ababa',
      woreda: 'Woreda 03',
      registered_facility_id: 'fac-hc-bole-01'
    });
    candidateDuplicateId = candidate.id;

    // Identify duplicates for Aster
    const dupRes = await request(app).get(`/api/v1/patients/${patientId}/possible-duplicates`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(dupRes.status, 200);
    assert.ok(dupRes.body.data.candidates.length >= 1);
    assert.ok(dupRes.body.data.candidates.some((c) => c.patient.id === candidateDuplicateId));

    // Clinician performs duplicate review
    const reviewRes = await request(app).post(`/api/v1/patients/${patientId}/duplicate-review`, {
      candidate_patient_id: candidateDuplicateId,
      review_status: 'CONFIRMED_MATCH',
      notes: 'Verified via kebele resident ID and matching phone number',
      match_score: 95
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(reviewRes.status, 201);
    assert.equal(reviewRes.body.data.review.review_status, 'CONFIRMED_MATCH');
  });

  await t.test('6. Formal Merge Request Governance Workflow', async () => {
    const mergeRes = await request(app).post('/api/v1/patients/merge-requests', {
      source_patient_id: candidateDuplicateId,
      target_patient_id: patientId,
      reason: 'Consolidating duplicate walk-in encounter into primary Fayda record'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(mergeRes.status, 201);
    assert.equal(mergeRes.body.success, true);
    assert.equal(mergeRes.body.data.mergeRequest.status, 'PENDING');
  });

  await t.test('7. Demographic Corrections Audit Trail', async () => {
    const corrRes = await request(app).post(`/api/v1/patients/${patientId}/corrections`, {
      field_name: 'kebele',
      old_value: 'Kebele 05',
      new_value: 'Kebele 06',
      reason: 'Corrected administrative boundary error reported during triage'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(corrRes.status, 201);
    assert.equal(corrRes.body.success, true);
    assert.equal(corrRes.body.data.correction.new_value, 'Kebele 06');

    // Retrieve history
    const histRes = await request(app).get(`/api/v1/patients/${patientId}/history`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(histRes.status, 200);
    assert.ok(histRes.body.data.corrections.some((c) => c.field_name === 'kebele'));
  });

  await t.test('8. Emergency Contact Management CRUD', async () => {
    // Add secondary contact
    const addRes = await request(app).post(`/api/v1/patients/${patientId}/emergency-contacts`, {
      full_name: 'Mesfin Aweke',
      relationship: 'SIBLING',
      phone_number: '+251922554433',
      is_primary_contact: false
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(addRes.status, 201);
    const contactId = addRes.body.data.contact.id;

    // List contacts
    const listRes = await request(app).get(`/api/v1/patients/${patientId}/emergency-contacts`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.contacts.length >= 2);

    // Delete contact
    const delRes = await request(app).delete(`/api/v1/patients/${patientId}/emergency-contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(delRes.status, 200);
  });

  await t.test('9. Security Audit Trail Logs Critical Patient Operations', async () => {
    const logs = securityAuditService.getInMemoryLogs();
    assert.ok(logs.some((l) => l.event_name === 'PATIENT_RECORD_CREATED'));
    assert.ok(logs.some((l) => l.event_name === 'PATIENT_RECORD_VIEWED'));
    assert.ok(logs.some((l) => l.event_name === 'DUPLICATE_REVIEW_RECORDED'));
    assert.ok(logs.some((l) => l.event_name === 'PATIENT_MERGE_REQUESTED'));
    assert.ok(logs.some((l) => l.event_name === 'PATIENT_RECORD_CORRECTED'));
  });
});
