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

test('Referral Reassignment & Operational Escalation Suite — Commit 060', async (t) => {
  coordinationRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const hcStaff = await UserModel.create({
    email: 'hc.reassign@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tigist',
    lastName: 'Alemu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const coordinator = await UserModel.create({
    email: 'coord.unauth@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Amare',
    lastName: 'Girma',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: 'fac-transport-central'
  });

  const regionalOfficer = await UserModel.create({
    email: 'regional.officer@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Yonas',
    lastName: 'Tadesse',
    roleId: 5, // REGIONAL_OFFICER
    facilityId: null
  });

  const hcToken = generateAccessToken(hcStaff);
  const coordToken = generateAccessToken(coordinator);
  const regionalToken = generateAccessToken(regionalOfficer);

  const patient = await patientRepository.create({
    first_name: 'Almaz',
    father_name: 'Kebede',
    gender: 'FEMALE',
    age_years: 58,
    region: 'Addis Ababa',
    woreda: 'Bole 01',
    registered_facility_id: 'fac-hc-bole-01'
  });

  const refRes = await request(app).post('/api/v1/referrals', {
    patient_id: patient.id,
    priority: 'URGENT',
    status: 'SUBMITTED',
    destination_facility_id: 'fac-hosp-tikur-01',
    primary_diagnosis: 'Large Bowel Obstruction suspected neoplastic etiology',
    clinical_summary: '58yo female with 5 days absolute constipation, obstipation and abdominal distension',
    reason_for_referral: 'Emergency CT abdomen and emergent surgical decompression / diversion',
    required_specialty: 'Colorectal Surgery'
  }, {
    headers: { Authorization: `Bearer ${hcToken}` }
  });

  assert.equal(refRes.status, 201);
  const referralId = refRes.body.data.referral.id;

  let escalationId = null;

  await t.test('1. Transport Coordinator cannot reassign referrals (403 Forbidden)', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/reassignments`, {
      new_facility_id: 'fac-hosp-stpaul-01',
      reassignment_reason: 'INSUFFICIENT_CAPACITY',
      reassignment_notes: 'Attempted coordinator reassignment'
    }, {
      headers: { Authorization: `Bearer ${coordToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('not authorized'));
  });

  await t.test('2. Reassignment to the exact same hospital is rejected with 400 Bad Request', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/reassignments`, {
      new_facility_id: 'fac-hosp-tikur-01',
      reassignment_reason: 'INSUFFICIENT_CAPACITY',
      reassignment_notes: 'Hospital is currently overwhelmed'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('already assigned'));
  });

  await t.test('3. Authorized clinician executes human-managed reassignment to new hospital', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/reassignments`, {
      new_facility_id: 'fac-hosp-stpaul-01',
      reassignment_reason: 'INSUFFICIENT_CAPACITY',
      reassignment_notes: 'Tikur Anbessa emergency surgical suites at full capacity; diverts to St. Paul surgical team'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.referral.destination_facility_id, 'fac-hosp-stpaul-01');
    assert.equal(res.body.data.referral.status, 'ASSIGNED');

    // Verify reassignment history
    const historyRes = await request(app).get(`/api/v1/referrals/${referralId}/reassignments`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(historyRes.status, 200);
    assert.equal(historyRes.body.data.reassignments.length, 1);
    assert.equal(historyRes.body.data.reassignments[0].new_facility_id, 'fac-hosp-stpaul-01');
    assert.equal(historyRes.body.data.reassignments[0].reassignment_reason, 'INSUFFICIENT_CAPACITY');
  });

  await t.test('4. Creates Level 2 operational escalation for acknowledgement deadline exceeded', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/escalations`, {
      escalation_level: 2,
      escalation_condition: 'ACKNOWLEDGEMENT_DEADLINE_EXCEEDED',
      escalation_reason: 'St. Paul triage desk has not acknowledged receipt after 75 minutes of reassignment'
    }, {
      headers: { Authorization: `Bearer ${regionalToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.escalation.escalation_level, 2);
    assert.equal(res.body.data.escalation.escalation_status, 'OPEN');
    escalationId = res.body.data.escalation.id;

    // Verify referral escalation level updated
    const refreshed = await referralRepository.findById(referralId);
    assert.equal(refreshed.escalation_level, 2);
  });

  await t.test('5. Duplicate open escalation for same condition is blocked with 409 Conflict', async () => {
    const res = await request(app).post(`/api/v1/referrals/${referralId}/escalations`, {
      escalation_level: 2,
      escalation_condition: 'ACKNOWLEDGEMENT_DEADLINE_EXCEEDED',
      escalation_reason: 'Duplicate alert attempt'
    }, {
      headers: { Authorization: `Bearer ${regionalToken}` }
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('already exists'));
  });

  await t.test('6. Resolving operational escalation with documented explanation resets escalation level', async () => {
    const res = await request(app).post(`/api/v1/escalations/${escalationId}/resolve`, {
      resolution_explanation: 'Contacted Dr. Fikru directly; case reviewed and triage physician assigned'
    }, {
      headers: { Authorization: `Bearer ${regionalToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.escalation.escalation_status, 'RESOLVED');
    assert.ok(res.body.data.escalation.resolved_at);

    // Verify referral escalation level reset to 0
    const refreshed = await referralRepository.findById(referralId);
    assert.equal(refreshed.escalation_level, 0);
  });

  await t.test('7. Resolving an already resolved escalation fails with 400 Bad Request', async () => {
    const res = await request(app).post(`/api/v1/escalations/${escalationId}/resolve`, {
      resolution_explanation: 'Attempting re-resolution'
    }, {
      headers: { Authorization: `Bearer ${regionalToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('already resolved'));
  });
});
