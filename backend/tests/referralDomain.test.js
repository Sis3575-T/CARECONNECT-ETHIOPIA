import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import referralRepository from '../src/repositories/referralRepository.js';
import referralService from '../src/services/referralService.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Referral Domain & Architecture Suite — Commit 049', async (t) => {
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const hcStaff = await UserModel.create({
    email: 'hc.domain@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tigist',
    lastName: 'Alemu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const transportStaff = await UserModel.create({
    email: 'trans.domain@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Kassahun',
    lastName: 'Bekele',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: null
  });

  const hcToken = generateAccessToken(hcStaff);
  const transToken = generateAccessToken(transportStaff);

  // Seed patient
  const patient = await patientRepository.create({
    first_name: 'Hiwot',
    father_name: 'Desta',
    gender: 'FEMALE',
    age_years: 28,
    phone_number: '+251911445566',
    region: 'Addis Ababa',
    woreda: 'Bole Woreda 03',
    registered_facility_id: 'fac-hc-bole-01'
  });

  await t.test('GET /api/v1/referrals rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/referrals');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('ReferralRepository generates non-guessable, unique reference numbers', () => {
    const ref1 = referralRepository.generateReferenceNumber();
    const ref2 = referralRepository.generateReferenceNumber();

    assert.ok(ref1.startsWith('ETH-REF-'));
    assert.ok(ref2.startsWith('ETH-REF-'));
    assert.notEqual(ref1, ref2);
  });

  await t.test('ReferralService enforces explicit state machine transition guards', () => {
    // Valid transitions
    assert.doesNotThrow(() => referralService.assertValidTransition('DRAFT', 'SUBMITTED'));
    assert.doesNotThrow(() => referralService.assertValidTransition('SUBMITTED', 'ACKNOWLEDGED'));
    assert.doesNotThrow(() => referralService.assertValidTransition('ACKNOWLEDGED', 'ACCEPTED'));
    assert.doesNotThrow(() => referralService.assertValidTransition('ACCEPTED', 'PATIENT_ARRIVED'));

    // Prohibited transitions
    assert.throws(
      () => referralService.assertValidTransition('DRAFT', 'ACCEPTED'),
      /Invalid referral status transition/
    );
    assert.throws(
      () => referralService.assertValidTransition('REJECTED', 'ACCEPTED'),
      /Invalid referral status transition/
    );
    assert.throws(
      () => referralService.assertValidTransition('CLOSED', 'SUBMITTED'),
      /Invalid referral status transition/
    );
  });

  await t.test('Public reference tracking redacts sensitive clinical and patient text', async () => {
    const created = await referralRepository.create({
      patient_id: patient.id,
      origin_facility_id: 'fac-hc-bole-01',
      destination_facility_id: 'fac-hosp-tikur-01',
      primary_diagnosis: 'Acute Severe Preeclampsia with Visual Disturbance',
      clinical_summary: '28yo G1P0 at 34 weeks gestation presenting with headache and BP 170/110 mmHg',
      reason_for_referral: 'Emergency obstetric ICU admission',
      status: 'SUBMITTED',
      priority: 'EMERGENCY'
    });

    const res = await request(app).get(`/api/v1/referrals/track/${created.reference_number}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const tracking = res.body.data.tracking;

    // Check safe milestone fields are present
    assert.equal(tracking.reference_number, created.reference_number);
    assert.equal(tracking.status, 'SUBMITTED');
    assert.equal(tracking.priority, 'EMERGENCY');

    // Check sensitive fields are strictly omitted
    assert.equal(tracking.primary_diagnosis, undefined);
    assert.equal(tracking.clinical_summary, undefined);
    assert.equal(tracking.reason_for_referral, undefined);
    assert.equal(tracking.patient_name, undefined);
    assert.equal(tracking.patient_phone_number, undefined);
  });

  await t.test('Transport Coordinator receives only transit-essential parameters', async () => {
    const created = await referralRepository.create({
      patient_id: patient.id,
      origin_facility_id: 'fac-hc-bole-01',
      destination_facility_id: 'fac-hosp-tikur-01',
      primary_diagnosis: 'Tibia fracture',
      clinical_summary: 'Closed compound fracture requiring orthopedic casting',
      reason_for_referral: 'Orthopedic surgical consultation',
      status: 'ACCEPTED',
      priority: 'URGENT'
    });

    const res = await request(app).get(`/api/v1/referrals/${created.id}`, {
      headers: { Authorization: `Bearer ${transToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data.referral;

    assert.equal(data.id, created.id);
    assert.equal(data.status, 'ACCEPTED');
    assert.equal(data.priority, 'URGENT');
    // Clinical diagnoses are redacted for transport dispatchers
    assert.equal(data.primary_diagnosis, undefined);
    assert.equal(data.clinical_summary, undefined);
    assert.equal(data.reason_for_referral, undefined);
  });
});
