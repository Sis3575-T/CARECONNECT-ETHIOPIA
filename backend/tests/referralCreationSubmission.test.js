import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Secure Referral Creation & Submission Suite — Commit 050', async (t) => {
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const hcStaff = await UserModel.create({
    email: 'tigist.creation@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tigist',
    lastName: 'Alemu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const unaffiliatedUser = await UserModel.create({
    email: 'unaffiliated.ref@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Abebe',
    lastName: 'Bikila',
    roleId: 1, // HEALTH_CENTRE_STAFF with NO facility
    facilityId: null
  });

  const hcToken = generateAccessToken(hcStaff);
  const unaffiliatedToken = generateAccessToken(unaffiliatedUser);

  // Seed patient
  const patient = await patientRepository.create({
    first_name: 'Solomon',
    father_name: 'Kebede',
    gender: 'MALE',
    age_years: 45,
    region: 'Addis Ababa',
    woreda: 'Bole 03',
    registered_facility_id: 'fac-hc-bole-01'
  });

  let draftReferralId = null;

  await t.test('POST /api/v1/referrals creates a referral draft with non-guessable reference', async () => {
    const res = await request(app).post('/api/v1/referrals', {
      patient_id: patient.id,
      priority: 'ROUTINE',
      status: 'DRAFT',
      required_specialty: 'Cardiology',
      primary_diagnosis: 'Suspected Angina Pectoris'
      // Clinical summary and reason can remain empty in draft mode
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.referral.id.startsWith('ETH-REF-'));
    assert.ok(res.body.data.referral.reference_number.startsWith('ETH-REF-'));
    assert.equal(res.body.data.referral.status, 'DRAFT');
    assert.equal(res.body.data.referral.origin_facility_id, 'fac-hc-bole-01');

    draftReferralId = res.body.data.referral.id;
  });

  await t.test('POST /api/v1/referrals/:referralId/submit rejects incomplete draft submission with 400', async () => {
    // Attempting to submit without completing clinical_summary or reason_for_referral
    const res = await request(app).post(`/api/v1/referrals/${draftReferralId}/submit`, {}, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('clinical_summary'));
  });

  await t.test('PATCH /api/v1/referrals/:referralId updates clinical details in draft mode', async () => {
    const res = await request(app).patch(`/api/v1/referrals/${draftReferralId}`, {
      clinical_summary: '45yo male presenting with exertional chest heaviness lasting 15 minutes',
      reason_for_referral: 'Elective coronary angiography and stress testing',
      destination_facility_id: 'fac-hosp-tikur-01',
      vitals_blood_pressure: '145/95',
      vitals_pulse_rate: 88
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.referral.destination_facility_id, 'fac-hosp-tikur-01');
    assert.equal(res.body.data.referral.vitals_pulse_rate, 88);
  });

  await t.test('POST /api/v1/referrals/:referralId/submit successfully submits completed draft', async () => {
    const res = await request(app).post(`/api/v1/referrals/${draftReferralId}/submit`, {}, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.referral.status, 'SUBMITTED');
    assert.ok(res.body.data.referral.submitted_at);

    // Verify status history recorded the submission
    const refreshed = await referralRepository.findById(draftReferralId);
    assert.ok(refreshed.status_history.some((h) => h.to_status === 'SUBMITTED'));
  });

  await t.test('POST /api/v1/referrals creates and immediately submits referral without receiving hospital as PENDING_ASSIGNMENT', async () => {
    const res = await request(app).post('/api/v1/referrals', {
      patient_id: patient.id,
      priority: 'URGENT',
      status: 'SUBMITTED',
      primary_diagnosis: 'Uncontrolled Type 1 Diabetes with early ketoacidosis',
      clinical_summary: 'Severe polyuria and ketonuria with blood glucose 380 mg/dL',
      reason_for_referral: 'Requires urgent pediatric endocrinology stabilization',
      required_specialty: 'Endocrinology'
      // destination_facility_id is omitted: unknown receiving hospital
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.referral.status, 'PENDING_ASSIGNMENT');
    assert.equal(res.body.data.referral.destination_facility_id, null);
  });

  await t.test('POST /api/v1/referrals rejects creation when user has no assigned facility', async () => {
    const res = await request(app).post('/api/v1/referrals', {
      patient_id: patient.id,
      priority: 'ROUTINE',
      primary_diagnosis: 'Hypertension'
    }, {
      headers: { Authorization: `Bearer ${unaffiliatedToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('facility'));
  });

  await t.test('POST /api/v1/referrals rejects non-existent patient reference with 404', async () => {
    const res = await request(app).post('/api/v1/referrals', {
      patient_id: 'ETH-PAT-DOESNOTEXIST-999',
      priority: 'ROUTINE',
      primary_diagnosis: 'Hypertension'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Patient record'));
  });
});
