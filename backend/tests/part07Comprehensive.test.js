import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import facilityRepository from '../src/repositories/facilityRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Part 07 Comprehensive End-to-End Referral Coordination Suite — Commit 056', async (t) => {
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  // Health Centre Staff (Role 1)
  const hcStaff = await UserModel.create({
    email: 'hc.e2e@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tsehay',
    lastName: 'Kassahun',
    roleId: 1,
    facilityId: 'fac-hc-bole-01'
  });

  // Receiving Hospital Staff (Role 2)
  const hospStaff = await UserModel.create({
    email: 'hosp.e2e@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Fikru',
    lastName: 'Maru',
    roleId: 2,
    facilityId: 'fac-hosp-tikur-01'
  });

  // Transport Coordinator (Role 4)
  const transportCoord = await UserModel.create({
    email: 'coord.e2e@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Yohannes',
    lastName: 'Gedamu',
    roleId: 4,
    facilityId: 'fac-transport-central'
  });

  // System Administrator (Role 6)
  const sysAdmin = await UserModel.create({
    email: 'admin.e2e@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Admin',
    lastName: 'CareConnect',
    roleId: 6,
    facilityId: null
  });

  const hcToken = generateAccessToken(hcStaff);
  const hospToken = generateAccessToken(hospStaff);
  const coordToken = generateAccessToken(transportCoord);
  const adminToken = generateAccessToken(sysAdmin);

  // Seed patient
  const patient = await patientRepository.create({
    first_name: 'Solomon',
    father_name: 'Bogale',
    gender: 'MALE',
    age_years: 42,
    phone_number: '+251911223344',
    national_id: 'ETH-NID-992211',
    region: 'Addis Ababa',
    woreda: 'Bole 06',
    registered_facility_id: 'fac-hc-bole-01'
  });

  let referralId = null;
  let referenceNumber = null;

  await t.test('Step 1: Health Centre creates draft referral with CSPRNG reference number', async () => {
    const res = await request(app).post('/api/v1/referrals', {
      patient_id: patient.id,
      priority: 'ROUTINE',
      status: 'DRAFT',
      primary_diagnosis: 'Uncontrolled Essential Hypertension',
      clinical_summary: '42yo male with persistent BP > 170/110 despite triple therapy',
      reason_for_referral: 'Evaluation for secondary causes of resistant hypertension',
      required_specialty: 'Cardiology'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    referralId = res.body.data.referral.id;
    referenceNumber = res.body.data.referral.reference_number;
    assert.ok(referenceNumber.startsWith('ETH-REF-'));
    assert.equal(res.body.data.referral.status, 'DRAFT');
    assert.equal(res.body.data.referral.origin_facility_id, 'fac-hc-bole-01');
  });

  await t.test('Step 2: Health Centre updates draft with destination hospital and vitals', async () => {
    const res = await request(app).patch(`/api/v1/referrals/${referralId}`, {
      destination_facility_id: 'fac-hosp-tikur-01',
      vitals_blood_pressure: '175/112',
      vitals_pulse_rate: 82,
      transport_required: true
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.destination_facility_id, 'fac-hosp-tikur-01');
    assert.equal(res.body.data.referral.transport_required, true);
  });

  await t.test('Step 3: Health Centre clinician submits referral for hospital review', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/submit`, {}, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'SUBMITTED');
    assert.ok(res.body.data.referral.submitted_at);
  });

  await t.test('Step 4: Receiving Hospital clinician acknowledges referral receipt', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/acknowledge`, {
      notes: 'Referral noted by hypertension clinic consultant. Arranging admission slot.'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'ACKNOWLEDGED');
    assert.ok(res.body.data.referral.acknowledged_at);
  });

  await t.test('Step 5: Receiving Hospital clinician accepts referral with ward allocation', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/accept`, {
      decision_notes: 'Admit to inpatient cardiology ward for renal artery Doppler and endocrine workup',
      assigned_bed_type: 'CARDIOLOGY_WARD',
      allocated_ward_department: 'Cardiology 3A'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'ACCEPTED');
    assert.ok(res.body.data.referral.decision_at);
  });

  await t.test('Step 6: Transport Coordinator queries referral and receives transit details with medical privacy', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referralId}`, {
      headers: { Authorization: `Bearer ${coordToken}` }
    });

    assert.equal(res.status, 200);
    const ref = res.body.data.referral;
    assert.equal(ref.transport_required, true);
    assert.equal(ref.origin_facility_id, 'fac-hc-bole-01');
    assert.equal(ref.destination_facility_id, 'fac-hosp-tikur-01');

    // Medical details are redacted
    assert.equal(ref.primary_diagnosis, undefined);
    assert.equal(ref.clinical_summary, undefined);
    assert.equal(ref.vitals_blood_pressure, undefined);
  });

  await t.test('Step 7: Receiving Hospital confirms patient physical arrival', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/arrival`, {
      arrival_notes: 'Patient arrived via ambulance transport; vitals re-checked'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'PATIENT_ARRIVED');
    assert.ok(res.body.data.referral.arrived_at);
  });

  await t.test('Step 8: Clinical progress recorded and completed', async () => {
    const progRes = await request(app).post(`/api/v1/referrals/${referralId}/progress`, {
      progress_notes: 'Renal artery stenosis identified and stented. BP stabilized at 128/82.'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });
    assert.equal(progRes.status, 200);
    assert.equal(progRes.body.data.referral.status, 'IN_PROGRESS');

    const compRes = await request(app).post(`/api/v1/referrals/${referralId}/complete`, {
      outcome_notes: 'Discharged on minimal antihypertensive regimen; return to local health centre for routine monitoring'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });
    assert.equal(compRes.status, 200);
    assert.equal(compRes.body.data.referral.status, 'COMPLETED');
    assert.ok(compRes.body.data.referral.completed_at);
  });

  await t.test('Step 9: Administrator closes referral dossier', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/close`, {
      closure_reason: 'Discharge summary signed and transmitted'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.referral.status, 'CLOSED');
    assert.ok(res.body.data.referral.closed_at);
  });

  await t.test('Step 10: Public tracking verifies complete operational trajectory without confidential leak', async () => {
    const res = await request(app).get(`/api/v1/referrals/track/${referenceNumber}`);

    assert.equal(res.status, 200);
    const tracking = res.body.data.tracking;
    assert.equal(tracking.reference_number, referenceNumber);
    assert.equal(tracking.status, 'CLOSED');
    assert.ok(tracking.submitted_at);
    assert.ok(tracking.acknowledged_at);
    assert.ok(tracking.decision_at);
    assert.ok(tracking.arrived_at);
    assert.ok(tracking.completed_at);

    // Ensure zero confidential data
    assert.equal(tracking.patient_name, undefined);
    assert.equal(tracking.primary_diagnosis, undefined);
  });
});
