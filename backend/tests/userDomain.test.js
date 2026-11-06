import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('User Management Domain Suite — Commit 033', async (t) => {
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  // Seed test users
  const adminUser = await UserModel.create({
    email: 'admin.domain@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'System',
    lastName: 'Admin',
    roleId: 6, // SYSTEM_ADMINISTRATOR
    facilityId: null
  });

  const staffUser = await UserModel.create({
    email: 'staff.domain@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tigist',
    lastName: 'Mengistu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const otherUser = await UserModel.create({
    email: 'doctor.domain@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Dawit',
    lastName: 'Tadesse',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-tikur-01'
  });

  const adminToken = generateAccessToken(adminUser);
  const staffToken = generateAccessToken(staffUser);

  await t.test('GET /api/v1/users rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/users');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('GET /api/v1/users rejects unauthorized non-admin staff with 403', async () => {
    const res = await request(app).get('/api/v1/users', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
    assert.ok(res.body.error.message.includes('user:manage'));
  });

  await t.test('GET /api/v1/users succeeds for administrator with paginated, sanitized results', async () => {
    const res = await request(app).get('/api/v1/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.meta.pagination);
    assert.equal(res.body.meta.pagination.page, 1);

    // Verify sanitization: no password hash or secrets returned
    for (const u of res.body.data) {
      assert.equal(u.password_hash, undefined);
      assert.equal(u.passwordHash, undefined);
      assert.equal(u.refresh_token_hash, undefined);
      assert.ok(u.id);
      assert.ok(u.email);
    }
  });

  await t.test('GET /api/v1/users/:userId allows user to view their own profile', async () => {
    const res = await request(app).get(`/api/v1/users/${staffUser.id}`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.id, staffUser.id);
    assert.equal(res.body.data.user.email, staffUser.email);
    assert.equal(res.body.data.user.password_hash, undefined);
  });

  await t.test('GET /api/v1/users/:userId allows administrator to view any user profile', async () => {
    const res = await request(app).get(`/api/v1/users/${otherUser.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.id, otherUser.id);
    assert.equal(res.body.data.user.email, otherUser.email);
  });

  await t.test('GET /api/v1/users/:userId rejects regular staff viewing another user profile with 403', async () => {
    const res = await request(app).get(`/api/v1/users/${otherUser.id}`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('GET /api/v1/users/:userId rejects invalid numeric ID with 400', async () => {
    const res = await request(app).get('/api/v1/users/not-an-integer', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('GET /api/v1/users/:userId returns 404 for non-existent user ID', async () => {
    const res = await request(app).get('/api/v1/users/999999', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});
