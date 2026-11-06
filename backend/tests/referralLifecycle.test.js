import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Referral Lifecycle & State Machine Transitions Suite — Commit 051', async (t) => {
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const hcStaff = await UserModel.create({
    email: 'hc.lifecycle@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Almaz',
    lastName: 'Tadesse',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const hospitalStaff = await UserModel.create({
    email: 'dr.dawit@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dawit',
    lastName: 'Kebede',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-tikur-01'
  });

  const hcToken = generateAccessToken(hcStaff);
  const hospToken = generateAccessToken(hospitalStaff);

  const patient = await patientRepository.create({
    first_name: 'Bekele',
    father_name: 'Mekonnen',
    gender: 'MALE',
    age_years: 52,
    region: 'Addis Ababa',
    woreda: 'Bole 04',
    registered_facility_id: 'fac-hc-bole-01'
  });

  let referralId = null;

  await t.test('1. Creates draft referral', async () => {
    const res = await request(app).post('/api/v1/referrals', {
      patient_id: patient.id,
      priority: 'URGENT',
      status: 'DRAFT',
      destination_facility_id: 'fac-hosp-tikur-01',
      primary_diagnosis: 'Acute Coronary Syndrome',
      clinical_summary: '52yo male with retrosternal chest pain radiating to left arm',
      reason_for_referral: 'Emergency percutaneous coronary intervention (PCI)',
      required_specialty: 'Cardiology'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.referral.status, 'DRAFT');
    referralId = res.body.data.referral.id;
  });

  await t.test('2. Fails illegal jump directly from DRAFT to ACCEPTED (400 Bad Request)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/accept`, {
      assigned_bed_type: 'ICU',
      allocated_ward_department: 'Cardiology ICU'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Invalid referral status transition'));
  });

  await t.test('3. Submits draft referral (DRAFT -> SUBMITTED)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/submit`, {}, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'SUBMITTED');
    assert.ok(res.body.data.referral.submitted_at);
  });

  await t.test('4. Hospital acknowledges referral (SUBMITTED -> ACKNOWLEDGED)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/acknowledge`, {
      notes: 'Reviewed ECG and vitals. Alerting cath lab team.'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'ACKNOWLEDGED');
    assert.ok(res.body.data.referral.acknowledged_at);
  });

  await t.test('5. Hospital accepts referral (ACKNOWLEDGED -> ACCEPTED)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/accept`, {
      assigned_bed_type: 'CARDIOLOGY_ICU',
      allocated_ward_department: 'Cardiology Unit'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'ACCEPTED');
    assert.ok(res.body.data.referral.decision_at);
  });

  await t.test('6. Confirms physical arrival at hospital (ACCEPTED -> PATIENT_ARRIVED)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/arrival`, {
      arrival_notes: 'Patient received by triage nurse in ER Bay 2'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'PATIENT_ARRIVED');
    assert.ok(res.body.data.referral.arrived_at);
  });

  await t.test('7. Records ongoing clinical progress (PATIENT_ARRIVED -> IN_PROGRESS)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/progress`, {
      progress_notes: 'Coronary stent placed successfully; patient stable in post-op monitoring'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'IN_PROGRESS');
    assert.ok(res.body.data.referral.current_progress_notes.includes('stent placed'));
  });

  await t.test('8. Completes clinical treatment (IN_PROGRESS -> COMPLETED)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/complete`, {
      outcome_notes: 'Patient recovered uneventfully; ready for discharge and local follow-up'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'COMPLETED');
    assert.ok(res.body.data.referral.completed_at);
  });

  await t.test('9. Closes referral dossier (COMPLETED -> CLOSED)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/close`, {
      closure_reason: 'Discharge summary transmitted back to origin health centre'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'CLOSED');
    assert.ok(res.body.data.referral.closed_at);
  });

  await t.test('10. Fails reopening or transitioning CLOSED referral (terminal state)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/submit`, {}, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Terminal state'));
  });

  await t.test('11. GET /api/v1/referrals/:referralId/history returns complete ordered audit trail', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referralId}/history`, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.referral_id, referralId);
    assert.ok(Array.isArray(res.body.data.history));
    assert.ok(res.body.data.history.length >= 7);

    // Verify key transitions exist in history
    const statuses = res.body.data.history.map((h) => h.to_status);
    assert.ok(statuses.includes('DRAFT'));
    assert.ok(statuses.includes('SUBMITTED'));
    assert.ok(statuses.includes('ACKNOWLEDGED'));
    assert.ok(statuses.includes('ACCEPTED'));
    assert.ok(statuses.includes('PATIENT_ARRIVED'));
    assert.ok(statuses.includes('IN_PROGRESS'));
    assert.ok(statuses.includes('COMPLETED'));
    assert.ok(statuses.includes('CLOSED'));
  });

  await t.test('12. GET /api/v1/referrals/:referralId/status returns milestone timings', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referralId}/status`, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'CLOSED');
    assert.ok(res.body.data.submitted_at);
    assert.ok(res.body.data.acknowledged_at);
    assert.ok(res.body.data.decision_at);
    assert.ok(res.body.data.arrived_at);
  });
});
