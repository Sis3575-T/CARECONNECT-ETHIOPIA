import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import UserModel from '../src/models/userModel.js';
import SessionModel from '../src/models/sessionModel.js';
import SessionService from '../src/services/sessionService.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('User Account Administration Suite — Commit 034', async (t) => {
  UserModel.clearMockUsers();
  SessionModel.clearStore();

  const hashedPassword = await hashPassword('AdminPass123!');

  // Seed Admin user
  const adminUser = await UserModel.create({
    email: 'superadmin@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Super',
    lastName: 'Admin',
    roleId: 6, // SYSTEM_ADMINISTRATOR
    facilityId: null
  });

  // Seed Health Centre staff
  const staffUser = await UserModel.create({
    email: 'hc.operator@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Sara',
    lastName: 'Kebede',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-01'
  });

  const adminToken = generateAccessToken(adminUser);
  const staffToken = generateAccessToken(staffUser);

  let createdUserId = null;

  await t.test('POST /api/v1/users creates user with role, sanitized response, and password setup requirement', async () => {
    const res = await request(app).post('/api/v1/users', {
      email: 'new.specialist@careconnect.et',
      firstName: 'Abebe',
      lastName: 'Bikila',
      phoneNumber: '+251911223344',
      roleId: 3, // HOSPITAL_TRIAGE
      facilityId: 'fac-hosp-01',
      department: 'Emergency & Triage',
      jobTitle: 'Senior Specialist'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.user);
    assert.equal(res.body.data.user.email, 'new.specialist@careconnect.et');
    assert.equal(res.body.data.user.roleId, 3);
    assert.equal(res.body.data.user.password_hash, undefined);
    assert.equal(res.body.data.user.passwordHash, undefined);
    assert.equal(res.body.data.passwordSetupRequired, true);

    createdUserId = res.body.data.user.id;
  });

  await t.test('POST /api/v1/users rejects duplicate email with 409 CONFLICT', async () => {
    const res = await request(app).post('/api/v1/users', {
      email: 'new.specialist@careconnect.et', // duplicate
      firstName: 'Duplicate',
      lastName: 'User',
      roleId: 1,
      facilityId: 'fac-hc-01'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.ok(res.body.error.message.includes('already exists'));
  });

  await t.test('POST /api/v1/users rejects unauthorized staff from creating accounts with 403', async () => {
    const res = await request(app).post('/api/v1/users', {
      email: 'hacker@careconnect.et',
      firstName: 'Hacker',
      lastName: 'Attempt',
      roleId: 6
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('POST /api/v1/users enforces facilityId for facility-scoped roles', async () => {
    const res = await request(app).post('/api/v1/users', {
      email: 'nofacility@careconnect.et',
      firstName: 'No',
      lastName: 'Facility',
      roleId: 1 // HEALTH_CENTRE_STAFF requires facility
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('facilityId'));
  });

  await t.test('PATCH /api/v1/users/:userId updates profile fields', async () => {
    const res = await request(app).patch(`/api/v1/users/${createdUserId}`, {
      firstName: 'Abebe-Updated',
      lastName: 'Bikila-Updated',
      jobTitle: 'Chief of Triage'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.firstName, 'Abebe-Updated');
    assert.equal(res.body.data.user.lastName, 'Bikila-Updated');
    assert.equal(res.body.data.user.jobTitle, 'Chief of Triage');
  });

  await t.test('PATCH /api/v1/users/:userId prevents user from changing their own role', async () => {
    const res = await request(app).patch(`/api/v1/users/${staffUser.id}`, {
      roleId: 6 // Trying to elevate self to SYSTEM_ADMINISTRATOR
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('PATCH /api/v1/users/:userId/status deactivates account and terminates active sessions', async () => {
    // Create an active session for the created user
    await SessionService.createSession(createdUserId, {
      headers: { 'user-agent': 'Target-User-Browser' }
    });

    const activeSessionsBefore = await SessionService.listSessions(createdUserId);
    assert.ok(activeSessionsBefore.length > 0);

    // Deactivate user
    const res = await request(app).patch(`/api/v1/users/${createdUserId}/status`, {
      isActive: false
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.isActive, false);

    // Verify all sessions were revoked immediately upon deactivation
    const activeSessionsAfter = await SessionService.listSessions(createdUserId);
    assert.equal(activeSessionsAfter.length, 0);
  });

  await t.test('PATCH /api/v1/users/:userId/status prevents admin from deactivating their own account', async () => {
    const res = await request(app).patch(`/api/v1/users/${adminUser.id}/status`, {
      isActive: false
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
    assert.ok(res.body.error.message.includes('own user account'));
  });
});
