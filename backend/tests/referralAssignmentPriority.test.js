import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Referral Assignment & Priority Management Suite — Commit 053', async (t) => {
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const hcStaff = await UserModel.create({
    email: 'hc.triage@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Hanna',
    lastName: 'Kassa',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const coordinator = await UserModel.create({
    email: 'coordinator.priority@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Kassahun',
    lastName: 'Desta',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: 'fac-transport-central'
  });

  const admin = await UserModel.create({
    email: 'admin.assignment@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Super',
    lastName: 'Admin',
    roleId: 6, // SYSTEM_ADMIN
    facilityId: null
  });

  const hcToken = generateAccessToken(hcStaff);
  const coordToken = generateAccessToken(coordinator);
  const adminToken = generateAccessToken(admin);

  const patient = await patientRepository.create({
    first_name: 'Aster',
    father_name: 'Aweke',
    gender: 'FEMALE',
    age_years: 38,
    region: 'Addis Ababa',
    woreda: 'Bole 05',
    registered_facility_id: 'fac-hc-bole-01'
  });

  // Create referral submitted without destination hospital (enters PENDING_ASSIGNMENT)
  const createRes = await request(app).post('/api/v1/referrals', {
    patient_id: patient.id,
    priority: 'ROUTINE',
    status: 'SUBMITTED',
    primary_diagnosis: 'Symptomatic Cholelithiasis with recurrent biliary colic',
    clinical_summary: 'Ultrasound confirmed multiple gallstones; no current acute cholecystitis',
    reason_for_referral: 'Elective laparoscopic cholecystectomy evaluation',
    required_specialty: 'General Surgery'
  }, {
    headers: { Authorization: `Bearer ${hcToken}` }
  });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.data.referral.status, 'PENDING_ASSIGNMENT');
  const referralId = createRes.body.data.referral.id;

  await t.test('1. Transport coordinator cannot assign receiving hospital (403 Forbidden)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/assign`, {
      destination_facility_id: 'fac-hosp-tikur-01'
    }, {
      headers: { Authorization: `Bearer ${coordToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Transport coordinators cannot assign'));
  });

  await t.test('2. Missing destination_facility_id is rejected with 400 Bad Request', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/assign`, {}, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('3. Assigning destination hospital transitions PENDING_ASSIGNMENT -> ASSIGNED', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/assign`, {
      destination_facility_id: 'fac-hosp-tikur-01'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.referral.status, 'ASSIGNED');
    assert.equal(res.body.data.referral.destination_facility_id, 'fac-hosp-tikur-01');
  });

  await t.test('4. Reassigning receiving hospital retains active status and updates destination', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/assign`, {
      destination_facility_id: 'fac-hosp-stpaul-01'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.referral.status, 'ASSIGNED');
    assert.equal(res.body.data.referral.destination_facility_id, 'fac-hosp-stpaul-01');
  });

  await t.test('5. Transport coordinator cannot alter clinical triage priority (403 Forbidden)', async () => {
    const res = await request(app).patch(`/api/v1/referrals/${referralId}/priority`, {
      priority: 'EMERGENCY',
      reason: 'Attempted coordinator override'
    }, {
      headers: { Authorization: `Bearer ${coordToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Transport coordinators are not authorized'));
  });

  await t.test('6. Priority adjustment requires clinical reason (400 Bad Request if missing)', async () => {
    const res = await request(app).patch(`/api/v1/referrals/${referralId}/priority`, {
      priority: 'EMERGENCY'
      // reason missing
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(JSON.stringify(res.body.error).includes('Clinical reason'));
  });

  await t.test('7. Authorized clinician escalates priority with recorded justification', async () => {
    const res = await request(app).patch(`/api/v1/referrals/${referralId}/priority`, {
      priority: 'EMERGENCY',
      reason: 'Patient developed fever, leukocytosis, and acute right upper quadrant peritonitis'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.referral.priority, 'EMERGENCY');

    // Verify correction audit entry was stored
    const corrections = await referralRepository.getCorrections(referralId);
    assert.ok(corrections.length > 0);
    const priorityCorrection = corrections.find((c) => c.field_name === 'priority');
    assert.ok(priorityCorrection);
    assert.equal(priorityCorrection.old_value, 'ROUTINE');
    assert.equal(priorityCorrection.new_value, 'EMERGENCY');
    assert.ok(priorityCorrection.reason.includes('peritonitis'));
  });
});
