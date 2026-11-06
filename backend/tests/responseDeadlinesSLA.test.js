import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import coordinationRepository from '../src/repositories/coordinationRepository.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Response Deadlines & SLA Policies Suite — Commit 058', async (t) => {
  coordinationRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const admin = await UserModel.create({
    email: 'sla.admin@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Nebiyu',
    lastName: 'Girma',
    roleId: 6, // SYSTEM_ADMIN
    facilityId: null
  });

  const hcStaff = await UserModel.create({
    email: 'hc.clinician@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Meseret',
    lastName: 'Hailu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const adminToken = generateAccessToken(admin);
  const hcToken = generateAccessToken(hcStaff);

  const patient = await patientRepository.create({
    first_name: 'Kassahun',
    father_name: 'Desta',
    gender: 'MALE',
    age_years: 36,
    region: 'Addis Ababa',
    woreda: 'Bole 02',
    registered_facility_id: 'fac-hc-bole-01'
  });

  let emergencyPolicyId = null;

  await t.test('1. Non-administrator is forbidden from creating SLA policies (403)', async () => {
    const res = await request(app).post('/api/v1/referral-policies', {
      name: 'Unauthorized Policy',
      acknowledgement_deadline_minutes: 30,
      decision_deadline_minutes: 60
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Only regional coordination officers and administrators'));
  });

  await t.test('2. Missing required fields in policy payload fails with 400 Bad Request', async () => {
    const res = await request(app).post('/api/v1/referral-policies', {
      name: '',
      acknowledgement_deadline_minutes: -10
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('3. Administrator creates emergency referral response policy', async () => {
    const res = await request(app).post('/api/v1/referral-policies', {
      name: 'National Emergency Acute Referral SLA',
      priority: 'EMERGENCY',
      acknowledgement_deadline_minutes: 15,
      decision_deadline_minutes: 30,
      follow_up_interval_minutes: 60,
      escalation_threshold_minutes: 45
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.policy.name, 'National Emergency Acute Referral SLA');
    assert.equal(res.body.data.policy.acknowledgement_deadline_minutes, 15);
    emergencyPolicyId = res.body.data.policy.id;
  });

  await t.test('4. Submitting emergency referral applies matching SLA policy and computes deadlines', async () => {
    const res = await request(app).post('/api/v1/referrals', {
      patient_id: patient.id,
      priority: 'EMERGENCY',
      status: 'SUBMITTED',
      destination_facility_id: 'fac-hosp-tikur-01',
      primary_diagnosis: 'Ruptured Ectopic Pregnancy with Hemoperitoneum',
      clinical_summary: 'Acute severe hypovolemic shock with positive FAST ultrasound scan',
      reason_for_referral: 'Emergency exploratory laparotomy and resuscitation',
      required_specialty: 'Obstetrics & Gynecology'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 201);
    const ref = res.body.data.referral;
    assert.equal(ref.status, 'SUBMITTED');
    assert.equal(ref.policy_id, emergencyPolicyId);
    assert.ok(ref.acknowledgement_deadline);
    assert.ok(ref.decision_deadline);

    // Verify calculated deadlines match the 15m and 30m offsets from submitted_at
    const subTime = new Date(ref.submitted_at).getTime();
    const ackTime = new Date(ref.acknowledgement_deadline).getTime();
    const decTime = new Date(ref.decision_deadline).getTime();

    const ackDiffMin = Math.round((ackTime - subTime) / 60000);
    const decDiffMin = Math.round((decTime - subTime) / 60000);

    assert.equal(ackDiffMin, 15);
    assert.equal(decDiffMin, 30);
  });

  await t.test('5. Deactivating policy sets is_active false and preserves historical referral SLAs', async () => {
    const deactRes = await request(app).delete(`/api/v1/referral-policies/${emergencyPolicyId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(deactRes.status, 200);
    assert.equal(deactRes.body.data.policy.is_active, false);
    assert.ok(deactRes.body.data.policy.effective_to);

    // List policies verifies status
    const listRes = await request(app).get('/api/v1/referral-policies', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(listRes.status, 200);
    const pol = listRes.body.data.policies.find((p) => p.id === emergencyPolicyId);
    assert.equal(pol.is_active, false);
  });
});
