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

test('Delay Monitoring & Exception Management Suite — Commit 061', async (t) => {
  coordinationRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const admin = await UserModel.create({
    email: 'admin.delays@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tewodros',
    lastName: 'Kassa',
    roleId: 6, // SYSTEM_ADMIN
    facilityId: null
  });

  const hcStaff = await UserModel.create({
    email: 'hc.delays@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Hanna',
    lastName: 'Mulugeta',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const adminToken = generateAccessToken(admin);
  const hcToken = generateAccessToken(hcStaff);

  const patient = await patientRepository.create({
    first_name: 'Desta',
    father_name: 'Worku',
    gender: 'MALE',
    age_years: 64,
    region: 'Addis Ababa',
    woreda: 'Bole 04',
    registered_facility_id: 'fac-hc-bole-01'
  });

  // Base timestamps
  const t0 = new Date(Date.now() - 36000000); // 10h ago
  const t1 = new Date(t0.getTime() + 30 * 60000); // +30m (ack)
  const t2 = new Date(t1.getTime() + 60 * 60000); // +60m (decision)
  const t3 = new Date(t2.getTime() + 120 * 60000); // +120m (arrival)
  const t4 = new Date(t3.getTime() + 180 * 60000); // +180m (completed)

  const refRes = await request(app).post('/api/v1/referrals', {
    patient_id: patient.id,
    priority: 'ROUTINE',
    status: 'SUBMITTED',
    destination_facility_id: 'fac-hosp-tikur-01',
    primary_diagnosis: 'Cataract right eye with severe visual acuity loss',
    clinical_summary: '64yo male with mature nuclear cataract refractory to corrective lenses',
    reason_for_referral: 'Elective phacoemulsification and intraocular lens implantation',
    required_specialty: 'Ophthalmology'
  }, {
    headers: { Authorization: `Bearer ${hcToken}` }
  });

  assert.equal(refRes.status, 201);
  const referralId = refRes.body.data.referral.id;

  await t.test('1. Incomplete referral reports unreached milestones as null, not zero', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referralId}/delays`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const metrics = res.body.data.delays.metrics;

    assert.equal(metrics.submission_to_ack_minutes, null);
    assert.equal(metrics.ack_to_decision_minutes, null);
    assert.equal(metrics.decision_to_arrival_minutes, null);
    assert.equal(metrics.arrival_to_completion_minutes, null);
    assert.equal(metrics.total_cycle_minutes, null);
  });

  await t.test('2. Completed lifecycle accurately measures elapsed operational durations', async () => {
    // Populate known timestamps
    await referralRepository.update(referralId, {
      submitted_at: t0.toISOString(),
      acknowledged_at: t1.toISOString(),
      decision_at: t2.toISOString(),
      arrived_at: t3.toISOString(),
      completed_at: t4.toISOString()
    });

    const res = await request(app).get(`/api/v1/referrals/${referralId}/delays`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    const metrics = res.body.data.delays.metrics;

    assert.equal(metrics.submission_to_ack_minutes, 30);
    assert.equal(metrics.ack_to_decision_minutes, 60);
    assert.equal(metrics.decision_to_arrival_minutes, 120);
    assert.equal(metrics.arrival_to_completion_minutes, 180);
    assert.equal(metrics.total_cycle_minutes, 390); // 30 + 60 + 120 + 180 = 390
  });

  let exceptionId = null;

  await t.test('3. Detects overdue acknowledgement exception when past deadline', async () => {
    // Referral with overdue acknowledgement deadline
    const overdueRes = await request(app).post('/api/v1/referrals', {
      patient_id: patient.id,
      priority: 'URGENT',
      status: 'SUBMITTED',
      destination_facility_id: 'fac-hosp-tikur-01',
      primary_diagnosis: 'Acute Appendicitis without Perforation',
      clinical_summary: 'Right lower quadrant pain, migratory to McBurney point, rebound tenderness',
      reason_for_referral: 'Emergency appendectomy',
      required_specialty: 'General Surgery'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    const overdueId = overdueRes.body.data.referral.id;

    // Set acknowledgement deadline to 90 minutes in the past
    const pastAckDeadline = new Date(Date.now() - 90 * 60000).toISOString();
    await referralRepository.update(overdueId, {
      acknowledgement_deadline: pastAckDeadline,
      acknowledged_at: null
    });

    const delayRes = await request(app).get(`/api/v1/referrals/${overdueId}/delays`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(delayRes.status, 200);
    const exceptions = delayRes.body.data.delays.exceptions;
    assert.equal(exceptions.is_ack_overdue, true);
    assert.ok(exceptions.ack_overdue_minutes >= 89);

    // Record operational exception in repository
    const exRecord = await coordinationRepository.recordException({
      referral_id: overdueId,
      exception_type: 'ACKNOWLEDGEMENT_OVERDUE',
      severity: 'WARNING',
      target_deadline: pastAckDeadline,
      elapsed_minutes: exceptions.ack_overdue_minutes
    });

    exceptionId = exRecord.id;
    assert.ok(exceptionId);
  });

  await t.test('4. GET /api/v1/referral-exceptions lists unresolved exceptions', async () => {
    const res = await request(app).get('/api/v1/referral-exceptions?isResolved=false', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.exceptions));
    const found = res.body.data.exceptions.find((e) => e.id === exceptionId);
    assert.ok(found);
    assert.equal(found.exception_type, 'ACKNOWLEDGEMENT_OVERDUE');
    assert.equal(found.is_resolved, false);
  });

  await t.test('5. POST /api/v1/referral-exceptions/:id/resolve resolves operational exception with audit', async () => {
    const res = await request(app).post(`/api/v1/referral-exceptions/${exceptionId}/resolve`, {
      resolution_notes: 'Phone confirmation made with Tikur Anbessa surgical admissions; surgeon alerted'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.exception.is_resolved, true);
    assert.ok(res.body.data.exception.resolved_at);

    // Verify unresolved filter no longer returns it
    const listRes = await request(app).get('/api/v1/referral-exceptions?isResolved=false', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const found = listRes.body.data.exceptions.find((e) => e.id === exceptionId);
    assert.equal(found, undefined);
  });
});
