import test from 'node:test';
import assert from 'node:assert/strict';
import coordinationRepository from '../src/repositories/coordinationRepository.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { app } from '../src/app.js';
import { request } from './testHelper.js';

test('Referral Coordination & Escalation Domain Suite — Commit 057', async (t) => {
  coordinationRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const admin = await UserModel.create({
    email: 'admin.coordination@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Sara',
    lastName: 'Girma',
    roleId: 6, // SYSTEM_ADMIN
    facilityId: null
  });

  const adminToken = generateAccessToken(admin);

  await t.test('1. Repository creates and retrieves SLA response policy', async () => {
    const policy = await coordinationRepository.createPolicy({
      name: 'National Tertiary Urgent Referral Policy',
      priority: 'URGENT',
      acknowledgement_deadline_minutes: 45,
      decision_deadline_minutes: 90,
      follow_up_interval_minutes: 120,
      escalation_threshold_minutes: 180,
      created_by_user_id: admin.id
    });

    assert.ok(policy.id);
    assert.ok(policy.uuid);
    assert.equal(policy.name, 'National Tertiary Urgent Referral Policy');
    assert.equal(policy.priority, 'URGENT');
    assert.equal(policy.acknowledgement_deadline_minutes, 45);

    const found = await coordinationRepository.findPolicyById(policy.id);
    assert.equal(found.id, policy.id);
  });

  await t.test('2. Repository finds applicable policy by priority and facility precedence', async () => {
    // General default
    await coordinationRepository.createPolicy({
      name: 'Default Policy',
      priority: null,
      acknowledgement_deadline_minutes: 120,
      decision_deadline_minutes: 240
    });

    const matchUrgent = await coordinationRepository.findApplicablePolicy({ priority: 'URGENT' });
    assert.equal(matchUrgent.name, 'National Tertiary Urgent Referral Policy');

    const matchRoutine = await coordinationRepository.findApplicablePolicy({ priority: 'ROUTINE' });
    assert.equal(matchRoutine.name, 'Default Policy');
  });

  await t.test('3. API routes are mounted and accessible under /api/v1/referral-policies', async () => {
    const res = await request(app).get('/api/v1/referral-policies', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.policies));
    assert.ok(res.body.data.policies.length >= 2);
  });

  await t.test('4. API routes are accessible under /api/v1/coordination/policies', async () => {
    const res = await request(app).get('/api/v1/coordination/policies', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.policies));
  });

  await t.test('5. Non-existent policy ID returns null from repository', async () => {
    const missing = await coordinationRepository.findPolicyById(99999);
    assert.equal(missing, null);
  });
});
