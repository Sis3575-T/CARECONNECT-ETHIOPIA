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

test('Referral Follow-Up & Additional Information Workflow Suite — Commit 059', async (t) => {
  coordinationRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const hcStaff = await UserModel.create({
    email: 'hc.followup@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tsedale',
    lastName: 'Bekele',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const hospStaff = await UserModel.create({
    email: 'hosp.followup@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Getachew',
    lastName: 'Assefa',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-tikur-01'
  });

  const unauthorizedHospStaff = await UserModel.create({
    email: 'other.hosp@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Selam',
    lastName: 'Desta',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-stpaul-01' // Different hospital
  });

  const hcToken = generateAccessToken(hcStaff);
  const hospToken = generateAccessToken(hospStaff);
  const unauthHospToken = generateAccessToken(unauthorizedHospStaff);

  const patient = await patientRepository.create({
    first_name: 'Tesfaye',
    father_name: 'Regassa',
    gender: 'MALE',
    age_years: 49,
    region: 'Addis Ababa',
    woreda: 'Bole 03',
    registered_facility_id: 'fac-hc-bole-01'
  });

  const submitRes = await request(app).post('/api/v1/referrals', {
    patient_id: patient.id,
    priority: 'URGENT',
    status: 'SUBMITTED',
    destination_facility_id: 'fac-hosp-tikur-01',
    primary_diagnosis: 'Complicated Pleural Effusion',
    clinical_summary: '49yo male with 3-week progressive dyspnea and dull percussion on left hemithorax',
    reason_for_referral: 'Diagnostic and therapeutic thoracentesis and pleural fluid cytology',
    required_specialty: 'Pulmonology'
  }, {
    headers: { Authorization: `Bearer ${hcToken}` }
  });

  assert.equal(submitRes.status, 201);
  const referralId = submitRes.body.data.referral.id;

  let requestId = null;

  await t.test('1. POST /api/v1/referrals/:referralId/follow-ups records phone follow-up as manual record', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/follow-ups`, {
      communication_channel: 'PHONE_CALL',
      outcome: 'CONTACTED_STAFF',
      reason_or_notes: 'Spoke with triage desk nurse Sr. Almaz; case is pending specialist review',
      scheduled_next_follow_up: new Date(Date.now() + 3600000).toISOString()
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.follow_up.communication_channel, 'PHONE_CALL');
    assert.equal(res.body.data.follow_up.channel_delivery_status, 'MANUAL_RECORD');
    assert.equal(res.body.data.follow_up.outcome, 'CONTACTED_STAFF');

    // Verify referral follow-up counter incremented
    const refreshed = await referralRepository.findById(referralId);
    assert.equal(refreshed.followup_count, 1);
    assert.ok(refreshed.last_followup_at);
  });

  await t.test('2. GET /api/v1/referrals/:referralId/follow-ups returns recorded follow-up history', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referralId}/follow-ups`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.follow_ups.length, 1);
    assert.ok(res.body.data.follow_ups[0].reason_or_notes.includes('Sr. Almaz'));
  });

  await t.test('3. Unauthorized hospital clinician cannot request additional information (403 Forbidden)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/information-requests`, {
      requested_information: 'Recent Chest X-Ray and CBC count',
      clinical_reason: 'Needed for pleural tap evaluation'
    }, {
      headers: { Authorization: `Bearer ${unauthHospToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('assigned to your hospital'));
  });

  await t.test('4. Receiving hospital clinician requests additional diagnostic information (transitions to INFO_REQUESTED)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/information-requests`, {
      requested_information: 'Recent posterior-anterior chest radiograph and coagulation profile (INR/PTT)',
      clinical_reason: 'Safe pleural tap requires assessment of effusion size and bleeding parameters'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.request.request_status, 'PENDING');
    requestId = res.body.data.request.id;

    // Verify referral status transitioned to INFO_REQUESTED
    const refreshed = await referralRepository.findById(referralId);
    assert.equal(refreshed.status, 'INFO_REQUESTED');
  });

  await t.test('5. Referring health centre clinician responds with requested diagnostic data (transitions to SUBMITTED)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/information-requests/${requestId}/respond`, {
      response_notes: 'Chest X-ray shows moderate left blunting; INR is 1.1 (normal); platelet count 240,000/uL',
      supporting_document_ids: ['doc-cxr-2026-001', 'doc-lab-inr-002']
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.request.request_status, 'RESPONDED');
    assert.ok(res.body.data.request.responded_at);

    // Verify referral transitioned back to SUBMITTED
    const refreshed = await referralRepository.findById(referralId);
    assert.equal(refreshed.status, 'SUBMITTED');
  });

  await t.test('6. GET /api/v1/referrals/:referralId/information-requests returns request and response history', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referralId}/information-requests`, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.requests.length, 1);
    assert.equal(res.body.data.requests[0].request_status, 'RESPONDED');
    assert.ok(res.body.data.requests[0].response_notes.includes('INR is 1.1'));
  });
});
