import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Referral Security, Privacy Boundaries, Corrections & Audit Suite — Commit 055', async (t) => {
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const hcStaffA = await UserModel.create({
    email: 'hc.staffa@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Hiwot',
    lastName: 'Tefera',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const hcStaffB = await UserModel.create({
    email: 'hc.staffb@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Abel',
    lastName: 'Teshome',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-arada-01' // Different facility
  });

  const transportCoord = await UserModel.create({
    email: 'coord.audit@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Mulugeta',
    lastName: 'Serbessa',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: 'fac-transport-central'
  });

  const hcTokenA = generateAccessToken(hcStaffA);
  const hcTokenB = generateAccessToken(hcStaffB);
  const coordToken = generateAccessToken(transportCoord);

  const patient = await patientRepository.create({
    first_name: 'Worknesh',
    father_name: 'Desta',
    gender: 'FEMALE',
    age_years: 29,
    region: 'Addis Ababa',
    woreda: 'Bole 03',
    registered_facility_id: 'fac-hc-bole-01'
  });

  const refRes = await request(app).post('/api/v1/referrals', {
    patient_id: patient.id,
    priority: 'URGENT',
    status: 'SUBMITTED',
    destination_facility_id: 'fac-hosp-tikur-01',
    primary_diagnosis: 'Post-Partum Hemorrhage refractory to oxytocin',
    clinical_summary: '29yo P2G2 with persistent uterine atony after spontaneous vaginal delivery',
    reason_for_referral: 'Emergency uterine balloon tamponade and surgical intervention',
    required_specialty: 'Obstetrics & Gynecology',
    vitals_blood_pressure: '85/50',
    vitals_pulse_rate: 122,
    transport_required: true
  }, {
    headers: { Authorization: `Bearer ${hcTokenA}` }
  });

  assert.equal(refRes.status, 201);
  const referralId = refRes.body.data.referral.id;

  await t.test('1. Transport Coordinator sees operational transit details with clinical data redacted', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referralId}`, {
      headers: { Authorization: `Bearer ${coordToken}` }
    });

    assert.equal(res.status, 200);
    const data = res.body.data.referral;

    // Operational transit details are accessible
    assert.equal(data.id, referralId);
    assert.equal(data.origin_facility_id, 'fac-hc-bole-01');
    assert.equal(data.destination_facility_id, 'fac-hosp-tikur-01');
    assert.equal(data.priority, 'URGENT');
    assert.equal(data.transport_required, true);

    // Strict Privacy Boundary: sensitive clinical fields are REDACTED for transport coordinators
    assert.equal(data.primary_diagnosis, undefined);
    assert.equal(data.clinical_summary, undefined);
    assert.equal(data.reason_for_referral, undefined);
    assert.equal(data.vitals_blood_pressure, undefined);
    assert.equal(data.vitals_pulse_rate, undefined);
  });

  await t.test('2. Health Centre clinician at different facility cannot access referral (403 Forbidden)', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referralId}`, {
      headers: { Authorization: `Bearer ${hcTokenB}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Access denied'));
  });

  await t.test('3. POST /api/v1/referrals/:referralId/corrections logs audit trail of field corrections', async () => {
    // Missing reason fails 400
    const failRes = await request(app).post(`/api/v1/referrals/${referralId}/corrections`, {
      field_name: 'required_specialty',
      new_value: 'Maternal-Fetal Medicine'
    }, {
      headers: { Authorization: `Bearer ${hcTokenA}` }
    });
    assert.equal(failRes.status, 400);

    // Valid clinical correction
    const res = await request(app).post(`/api/v1/referrals/${referralId}/corrections`, {
      field_name: 'required_specialty',
      new_value: 'Maternal-Fetal Medicine',
      reason: 'Senior obstetric consultant upgraded referral to specialized MFM unit'
    }, {
      headers: { Authorization: `Bearer ${hcTokenA}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.correction.field_name, 'required_specialty');
    assert.equal(res.body.data.correction.new_value, 'Maternal-Fetal Medicine');

    // Verify referral record reflected the updated specialty
    const refreshed = await referralRepository.findById(referralId);
    assert.equal(refreshed.required_specialty, 'Maternal-Fetal Medicine');

    // Verify corrections history query
    const corrections = await referralRepository.getCorrections(referralId);
    assert.ok(corrections.some((c) => c.field_name === 'required_specialty'));
  });

  await t.test('4. POST /api/v1/referrals/:referralId/cancel requires cancellation reason', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/cancel`, {}, {
      headers: { Authorization: `Bearer ${hcTokenA}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(JSON.stringify(res.body.error).includes('Cancellation reason'));
  });

  await t.test('5. Valid cancellation transitions referral to terminal CANCELLED status', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/cancel`, {
      reason: 'Patient stabilized locally with bimanual compression and tranexamic acid; transfer cancelled'
    }, {
      headers: { Authorization: `Bearer ${hcTokenA}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.referral.status, 'CANCELLED');
    assert.ok(res.body.data.referral.cancelled_at);

    // Attempting to re-submit cancelled referral is blocked (terminal state)
    const reSubmit = await request(app).post(`/api/v1/referrals/${referralId}/submit`, {}, {
      headers: { Authorization: `Bearer ${hcTokenA}` }
    });
    assert.equal(reSubmit.status, 400);
    assert.ok(reSubmit.body.error.message.includes('Terminal state'));
  });
});
