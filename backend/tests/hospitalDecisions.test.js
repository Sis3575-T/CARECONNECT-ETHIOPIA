import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Hospital Referral Acknowledgement and Decisions Suite — Commit 052', async (t) => {
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const hcStaff = await UserModel.create({
    email: 'hc.decisions@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tsedey',
    lastName: 'Girma',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const hospAClinician = await UserModel.create({
    email: 'dr.tikur@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Yared',
    lastName: 'Assefa',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-tikur-01'
  });

  const hospBClinician = await UserModel.create({
    email: 'dr.stpaul@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Selam',
    lastName: 'Mengistu',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-stpaul-01'
  });

  const hcToken = generateAccessToken(hcStaff);
  const hospAToken = generateAccessToken(hospAClinician);
  const hospBToken = generateAccessToken(hospBClinician);

  const patient = await patientRepository.create({
    first_name: 'Haile',
    father_name: 'Gebrselassie',
    gender: 'MALE',
    age_years: 48,
    region: 'Addis Ababa',
    woreda: 'Bole 02',
    registered_facility_id: 'fac-hc-bole-01'
  });

  // Create two referrals: one destined for Hospital A, one for Hospital B
  const refResA = await request(app).post('/api/v1/referrals', {
    patient_id: patient.id,
    priority: 'EMERGENCY',
    status: 'SUBMITTED',
    destination_facility_id: 'fac-hosp-tikur-01',
    primary_diagnosis: 'Acute Subarachnoid Hemorrhage',
    clinical_summary: 'Severe sudden-onset thunderclap headache with meningismus',
    reason_for_referral: 'Urgent neurosurgical consultation and CT angiography',
    required_specialty: 'Neurosurgery'
  }, {
    headers: { Authorization: `Bearer ${hcToken}` }
  });
  assert.equal(refResA.status, 201);
  const referralAId = refResA.body.data.referral.id;

  const refResB = await request(app).post('/api/v1/referrals', {
    patient_id: patient.id,
    priority: 'ROUTINE',
    status: 'SUBMITTED',
    destination_facility_id: 'fac-hosp-stpaul-01',
    primary_diagnosis: 'Complicated Chronic Kidney Disease',
    clinical_summary: 'Stage 4 CKD needing arteriovenous fistula evaluation',
    reason_for_referral: 'Nephrology vascular access planning',
    required_specialty: 'Nephrology'
  }, {
    headers: { Authorization: `Bearer ${hcToken}` }
  });
  assert.equal(refResB.status, 201);
  const referralBId = refResB.body.data.referral.id;

  await t.test('1. GET /api/v1/referrals/incoming isolates incoming referrals by hospital tenancy', async () => {
    // Hospital A queue
    const queueA = await request(app).get('/api/v1/referrals/incoming', {
      headers: { Authorization: `Bearer ${hospAToken}` }
    });
    assert.equal(queueA.status, 200);
    assert.equal(queueA.body.data.length, 1);
    assert.equal(queueA.body.data[0].id, referralAId);

    // Hospital B queue
    const queueB = await request(app).get('/api/v1/referrals/incoming', {
      headers: { Authorization: `Bearer ${hospBToken}` }
    });
    assert.equal(queueB.status, 200);
    assert.equal(queueB.body.data.length, 1);
    assert.equal(queueB.body.data[0].id, referralBId);
  });

  await t.test('2. Hospital B clinician cannot acknowledge, accept, or reject Hospital A referral (403 Forbidden)', async () => {
    const ackCross = await request(app).post(`/api/v1/referrals/${referralAId}/acknowledge`, {
      notes: 'Unauthorized acknowledgement attempt'
    }, {
      headers: { Authorization: `Bearer ${hospBToken}` }
    });
    assert.equal(ackCross.status, 403);

    const acceptCross = await request(app).post(`/api/v1/referrals/${referralAId}/accept`, {
      assigned_bed_type: 'ICU'
    }, {
      headers: { Authorization: `Bearer ${hospBToken}` }
    });
    assert.equal(acceptCross.status, 403);

    const rejectCross = await request(app).post(`/api/v1/referrals/${referralAId}/reject`, {
      reason: 'Unauthorized rejection attempt',
      rejection_reason_code: 'OTHER'
    }, {
      headers: { Authorization: `Bearer ${hospBToken}` }
    });
    assert.equal(rejectCross.status, 403);
  });

  await t.test('3. Hospital A clinician acknowledges receipt of assigned referral', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralAId}/acknowledge`, {
      notes: 'Neurosurgery registrar paged. Preparing emergency CT scanner.'
    }, {
      headers: { Authorization: `Bearer ${hospAToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'ACKNOWLEDGED');
    assert.ok(res.body.data.referral.acknowledged_at);
  });

  await t.test('4. Hospital A clinician requests additional diagnostic information (ACKNOWLEDGED -> INFO_REQUESTED)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralAId}/request-information`, {
      notes: 'Please attach initial non-contrast head CT report and current GCS score'
    }, {
      headers: { Authorization: `Bearer ${hospAToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'INFO_REQUESTED');
  });

  await t.test('5. Health centre resubmits referral with clarified information (INFO_REQUESTED -> SUBMITTED)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralAId}/submit`, {}, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'SUBMITTED');
  });

  await t.test('6. Hospital A clinician accepts referral with bed allocation (SUBMITTED -> ACCEPTED)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralAId}/accept`, {
      decision_notes: 'Urgent neurosurgical craniotomy slot reserved in OT 3',
      assigned_bed_type: 'NEURO_ICU',
      allocated_ward_department: 'Neurosurgical ICU'
    }, {
      headers: { Authorization: `Bearer ${hospAToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'ACCEPTED');
    assert.ok(res.body.data.referral.decision_at);
  });

  await t.test('7. Hospital B clinician rejects referral with mandatory reason and rejection code', async () => {
    // Attempting rejection without reason fails 400
    const failRes = await request(app).post(`/api/v1/referrals/${referralBId}/reject`, {
      rejection_reason_code: 'NO_BEDS_AVAILABLE'
    }, {
      headers: { Authorization: `Bearer ${hospBToken}` }
    });
    assert.equal(failRes.status, 400);

    // Valid rejection with code and mandatory clinical reason
    const res = await request(app).post(`/api/v1/referrals/${referralBId}/reject`, {
      reason: 'No open dialysis slots or vascular surgery beds available for the next 14 days',
      rejection_reason_code: 'CAPACITY_EXCEEDED',
      recommended_alternative_facility_id: 'fac-hosp-tikur-01'
    }, {
      headers: { Authorization: `Bearer ${hospBToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'REJECTED');
  });
});
