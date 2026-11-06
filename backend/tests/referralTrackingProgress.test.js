import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Referral Tracking & Operational Progress Suite — Commit 054', async (t) => {
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const hcStaff = await UserModel.create({
    email: 'hc.tracking@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Genet',
    lastName: 'Wolde',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const hospClinician = await UserModel.create({
    email: 'dr.tracking@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Biniyam',
    lastName: 'Desta',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-tikur-01'
  });

  const hcToken = generateAccessToken(hcStaff);
  const hospToken = generateAccessToken(hospClinician);

  const patient = await patientRepository.create({
    first_name: 'Tariku',
    father_name: 'Girma',
    gender: 'MALE',
    age_years: 61,
    phone_number: '+251911445566',
    national_id: 'ETH-NID-883311',
    region: 'Addis Ababa',
    woreda: 'Bole 01',
    registered_facility_id: 'fac-hc-bole-01'
  });

  const submitRes = await request(app).post('/api/v1/referrals', {
    patient_id: patient.id,
    priority: 'URGENT',
    status: 'SUBMITTED',
    destination_facility_id: 'fac-hosp-tikur-01',
    primary_diagnosis: 'Severe Bilateral Knee Osteoarthritis with Joint Effusion',
    clinical_summary: '61yo male refractory to intra-articular steroid injections with severe mobility impairment',
    reason_for_referral: 'Orthopedic specialist consultation for total knee arthroplasty',
    required_specialty: 'Orthopedics',
    vitals_blood_pressure: '130/85',
    vitals_pulse_rate: 74
  }, {
    headers: { Authorization: `Bearer ${hcToken}` }
  });

  assert.equal(submitRes.status, 201);
  const referral = submitRes.body.data.referral;
  const referralId = referral.id;
  const referenceNumber = referral.reference_number;
  assert.ok(referenceNumber.startsWith('ETH-REF-'));

  await t.test('1. Public tracking GET /api/v1/referrals/track/:reference works unauthenticated and is strictly sanitized', async () => {
    // Unauthenticated request without Bearer token
    const res = await request(app).get(`/api/v1/referrals/track/${referenceNumber}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const tracking = res.body.data.tracking;

    // Verify operational milestone timestamps and status are provided
    assert.equal(tracking.reference_number, referenceNumber);
    assert.equal(tracking.status, 'SUBMITTED');
    assert.equal(tracking.priority, 'URGENT');
    assert.ok(tracking.submitted_at);
    assert.ok(tracking.created_at);

    // Verify strict privacy boundary: zero demographic or clinical fields exposed
    assert.equal(tracking.patient_name, undefined);
    assert.equal(tracking.patient_phone_number, undefined);
    assert.equal(tracking.patient_national_id, undefined);
    assert.equal(tracking.patient_id, undefined);
    assert.equal(tracking.primary_diagnosis, undefined);
    assert.equal(tracking.clinical_summary, undefined);
    assert.equal(tracking.reason_for_referral, undefined);
    assert.equal(tracking.vitals_blood_pressure, undefined);
  });

  await t.test('2. Public tracking returns 404 for non-existent reference', async () => {
    const res = await request(app).get('/api/v1/referrals/track/ETH-REF-9999-NOTFOUND');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  await t.test('3. Authenticated clinician advances status to ACKNOWLEDGED then ACCEPTED', async () => {
    const ackRes = await request(app).post(`/api/v1/referrals/${referralId}/acknowledge`, {
      notes: 'Reviewed referral. Scheduling orthopedic pre-op clinic.'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });
    assert.equal(ackRes.status, 200);

    const acceptRes = await request(app).post(`/api/v1/referrals/${referralId}/accept`, {
      decision_notes: 'Accepted for elective orthopedic arthroplasty admissions',
      assigned_bed_type: 'SURGICAL_WARD',
      allocated_ward_department: 'Orthopedic Ward 4B'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.referral.status, 'ACCEPTED');
  });

  await t.test('4. POST /api/v1/referrals/:referralId/arrival confirms physical arrival', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/arrival`, {
      arrival_notes: 'Patient checked in at orthopedic admissions desk'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'PATIENT_ARRIVED');
    assert.ok(res.body.data.referral.arrived_at);
  });

  await t.test('5. POST /api/v1/referrals/:referralId/progress updates clinical progress notes', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/progress`, {
      progress_notes: 'Right total knee replacement completed. Mobilizing with crutches.'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'IN_PROGRESS');
    assert.ok(res.body.data.referral.current_progress_notes.includes('total knee replacement completed'));
  });

  await t.test('6. POST /api/v1/referrals/:referralId/complete records clinical treatment completion', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/complete`, {
      outcome_notes: 'Wound healing intact, discharged with physical therapy referral protocol'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'COMPLETED');
    assert.ok(res.body.data.referral.completed_at);
  });

  await t.test('7. POST /api/v1/referrals/:referralId/close performs administrative closure', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/close`, {
      closure_reason: 'Discharge records transmitted and follow-up appointment booked'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'CLOSED');
  });

  await t.test('8. Public tracking displays completed lifecycle milestones with zero privacy breach', async () => {
    const res = await request(app).get(`/api/v1/referrals/track/${referenceNumber}`);

    assert.equal(res.status, 200);
    const tracking = res.body.data.tracking;
    assert.equal(tracking.status, 'CLOSED');
    assert.ok(tracking.submitted_at);
    assert.ok(tracking.acknowledged_at);
    assert.ok(tracking.decision_at);
    assert.ok(tracking.arrived_at);
    assert.ok(tracking.completed_at);

    // Re-verify no private data leak
    assert.equal(tracking.patient_name, undefined);
    assert.equal(tracking.primary_diagnosis, undefined);
  });
});
