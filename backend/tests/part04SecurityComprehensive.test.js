import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import express from 'express';
import { app } from '../src/app.js';
import UserModel from '../src/models/userModel.js';
import SessionModel from '../src/models/sessionModel.js';
import PasswordResetModel from '../src/models/passwordResetModel.js';
import SessionService from '../src/services/sessionService.js';
import { generateAccessToken, generateRefreshToken } from '../src/utils/token.js';
import { hashPassword, generateResetToken, hashResetToken } from '../src/utils/password.js';
import { authenticate } from '../src/middleware/auth.js';
import { requireRole, requirePermission, requirePortal } from '../src/middleware/rbac.js';
import { enforceFacilityAccess } from '../src/middleware/facilityTenancy.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { request } from './testHelper.js';

test('Comprehensive Security Verification Suite — Part 04 (12 Core Invariants)', async (t) => {
  UserModel.clearMockUsers();
  SessionModel.clearStore();
  PasswordResetModel.clearStore();

  const secret = process.env.JWT_SECRET || 'careconnect-super-secret-jwt-key-minimum-32-chars';
  const hashedPassword = await hashPassword('StrongPassword123!');

  // Seed test users
  const activeUser = await UserModel.create({
    email: 'hc.staff@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Almaz',
    lastName: 'Kebede',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const suspendedUser = await UserModel.create({
    email: 'suspended.user@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Bekele',
    lastName: 'Tadesse',
    roleId: 1,
    facilityId: 'fac-hc-bole-01'
  });
  await UserModel.setAccountStatus(suspendedUser.id, false);

  const transportUser = await UserModel.create({
    email: 'transport.driver@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dawit',
    lastName: 'Girma',
    roleId: 5, // AMBULANCE_DRIVER
    facilityId: null
  });

  const hospitalUser = await UserModel.create({
    email: 'hospital.doctor@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Hiwot',
    lastName: 'Alemu',
    roleId: 3, // HOSPITAL_SPECIALIST
    facilityId: 'fac-hosp-tikur-01'
  });

  // 1. Anonymous requests cannot access protected endpoints
  await t.test('1. Anonymous requests cannot access protected endpoints', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  // 2. Invalid access tokens are rejected
  await t.test('2. Invalid access tokens are rejected (bad signature or malformed)', async () => {
    const invalidSignatureToken = jwt.sign(
      { sub: activeUser.id, role: 'health_centre_staff' },
      'completely-wrong-secret-key-12345678',
      { expiresIn: '15m' }
    );

    const res = await request(app).get('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${invalidSignatureToken}` }
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  // 3. Expired access tokens are rejected
  await t.test('3. Expired access tokens are rejected', async () => {
    const expiredToken = jwt.sign(
      {
        sub: activeUser.id,
        roleId: activeUser.role_id,
        facilityId: activeUser.facility_id,
        email: activeUser.email
      },
      secret,
      {
        issuer: 'careconnect-backend',
        audience: 'careconnect-portals',
        expiresIn: '-10s' // already expired
      }
    );

    const res = await request(app).get('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  // 4. Users cannot change their own role through client input
  await t.test('4. Users cannot escalate their own role through client input during registration or profile updates', async () => {
    // Attempting to register with administrative role 6 (System Administrator)
    const regRes = await request(app).post('/api/v1/auth/register', {
      email: 'attacker@careconnect.et',
      password: 'StrongPassword123!',
      firstName: 'Attacker',
      lastName: 'User',
      roleId: 6,
      role: 'system_administrator',
      facilityId: 'fac-hc-bole-01'
    });

    assert.equal(regRes.status, 403);
    assert.equal(regRes.body.success, false);
    assert.equal(regRes.body.error.code, 'FORBIDDEN');
  });

  // 5. Users cannot impersonate another user by changing an ID
  await t.test('5. Users cannot impersonate another user by providing another ID in headers or query', async () => {
    const token = generateAccessToken(activeUser);

    // Endpoint retrieves identity strictly from verified token sub, not client query or body
    const res = await request(app).get(`/api/v1/auth/me?userId=${hospitalUser.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-User-Id': hospitalUser.id
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.id, activeUser.id);
    assert.notEqual(res.body.data.user.id, hospitalUser.id);
    assert.equal(res.body.data.user.email, activeUser.email);
  });

  // 6. Health-centre users cannot access another facility's records
  await t.test('6. Health-centre users cannot access another facility records (tenancy violation)', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use((req, res, next) => {
      req.user = {
        id: activeUser.id,
        roleId: 1, // HEALTH_CENTRE_STAFF
        facilityId: 'fac-hc-bole-01'
      };
      next();
    });
    testApp.get('/api/v1/facilities/:facilityId/referrals', enforceFacilityAccess(), (req, res) => {
      res.json({ success: true, records: [] });
    });
    testApp.use(errorHandler);

    // Attempting to access foreign facility fac-hc-foreign-99
    const forbiddenRes = await request(testApp).get('/api/v1/facilities/fac-hc-foreign-99/referrals');
    assert.equal(forbiddenRes.status, 403);
    assert.equal(forbiddenRes.body.success, false);
    assert.ok(forbiddenRes.body.error.message.includes('Facility tenancy violation'));

    // Accessing assigned facility succeeds
    const okRes = await request(testApp).get('/api/v1/facilities/fac-hc-bole-01/referrals');
    assert.equal(okRes.status, 200);
    assert.equal(okRes.body.success, true);
  });

  // 7. Hospital users cannot access unassigned referrals / cross-facility clinical records
  await t.test('7. Hospital users cannot access foreign unassigned facility records', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use((req, res, next) => {
      req.user = {
        id: hospitalUser.id,
        roleId: 3, // HOSPITAL_SPECIALIST
        facilityId: 'fac-hosp-tikur-01'
      };
      next();
    });
    testApp.get('/api/v1/facilities/:facilityId/inbox', enforceFacilityAccess(), (req, res) => {
      res.json({ success: true, referrals: [] });
    });
    testApp.use(errorHandler);

    // Hospital user cannot inspect records from another hospital
    const res = await request(testApp).get('/api/v1/facilities/fac-hosp-stpaul-02/inbox');
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Facility tenancy violation'));
  });

  // 8. Transport coordinators cannot access administrator functions
  await t.test('8. Transport coordinators cannot access administrator functions', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use((req, res, next) => {
      req.user = {
        id: transportUser.id,
        roleId: 5, // AMBULANCE_DRIVER
        portal: 'transport'
      };
      next();
    });
    testApp.get('/api/v1/admin/audit-logs', requireRole([6]), (req, res) => {
      res.json({ success: true, logs: [] });
    });
    testApp.post('/api/v1/admin/users', requirePermission('user:manage'), (req, res) => {
      res.json({ success: true, created: true });
    });
    testApp.use(errorHandler);

    const roleRes = await request(testApp).get('/api/v1/admin/audit-logs');
    assert.equal(roleRes.status, 403);
    assert.equal(roleRes.body.success, false);

    const permRes = await request(testApp).post('/api/v1/admin/users', {});
    assert.equal(permRes.status, 403);
    assert.equal(permRes.body.success, false);
  });

  // 9. Suspended accounts cannot continue authenticated activity
  await t.test('9. Suspended accounts cannot continue authenticated activity', async () => {
    const tokenForSuspended = generateAccessToken(suspendedUser);

    const res = await request(app).get('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${tokenForSuspended}` }
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('deactivated'));
  });

  // 10. Revoked refresh tokens cannot be reused successfully
  await t.test('10. Revoked refresh tokens cannot be reused successfully and trigger reuse detection', async () => {
    const { refreshToken } = await SessionService.createSession(activeUser.id, {
      headers: { 'user-agent': 'Security-Audit-Agent' }
    });

    // 1st rotation: valid
    const rotated = await SessionService.rotateSession(refreshToken, {
      headers: { 'user-agent': 'Security-Audit-Agent' }
    });
    assert.ok(rotated.accessToken);
    assert.ok(rotated.refreshToken);

    // Reuse old revoked token: must be rejected
    await assert.rejects(
      async () => {
        await SessionService.rotateSession(refreshToken, {
          headers: { 'user-agent': 'Adversary-Replay' }
        });
      },
      (err) => {
        assert.ok(err.statusCode === 401 || err.code === 'TOKEN_REVOKED');
        return true;
      }
    );
  });

  // 11. Password-reset tokens cannot be reused
  await t.test('11. Password-reset tokens cannot be reused', async () => {
    const rawToken = generateResetToken();
    const hashedToken = hashResetToken(rawToken);
    await PasswordResetModel.createToken({
      userId: activeUser.id,
      tokenHash: hashedToken,
      ttlMs: 3600000
    });

    // 1st reset: success
    const firstUseRes = await request(app).post('/api/v1/auth/reset-password', {
      token: rawToken,
      newPassword: 'BrandNewSecurePass123!'
    });
    assert.equal(firstUseRes.status, 200);
    assert.equal(firstUseRes.body.success, true);

    // 2nd reset: token already marked is_used -> must fail
    const replayRes = await request(app).post('/api/v1/auth/reset-password', {
      token: rawToken,
      newPassword: 'AnotherPassword456!'
    });
    assert.equal(replayRes.status, 400);
    assert.equal(replayRes.body.success, false);
    assert.ok(['VALIDATION_ERROR', 'TOKEN_EXPIRED_OR_INVALID'].includes(replayRes.body.error.code));
    assert.ok(replayRes.body.error.message.includes('used') || replayRes.body.error.message.includes('invalid'));
  });

  // 12. Error messages do not reveal passwords, token contents, or account existence
  await t.test('12. Error messages do not reveal passwords, token contents, or account existence', async () => {
    // Non-existent email login
    const nonExistentLogin = await request(app).post('/api/v1/auth/login', {
      email: 'nonexistent.actor@careconnect.et',
      password: 'SomeRandomPassword123!'
    });
    assert.equal(nonExistentLogin.status, 401);
    assert.equal(nonExistentLogin.body.error.code, 'UNAUTHORIZED');
    assert.equal(nonExistentLogin.body.error.message, 'Invalid email or password credentials');

    // Wrong password login
    const wrongPassLogin = await request(app).post('/api/v1/auth/login', {
      email: activeUser.email,
      password: 'IncorrectPassword999!'
    });
    assert.equal(wrongPassLogin.status, 401);
    assert.equal(wrongPassLogin.body.error.code, 'UNAUTHORIZED');
    // Must be identical message to prevent user enumeration
    assert.equal(wrongPassLogin.body.error.message, nonExistentLogin.body.error.message);

    // Forgot password with non-existent email
    const forgotNonExistent = await request(app).post('/api/v1/auth/forgot-password', {
      email: 'ghost.user.999@careconnect.et'
    });
    assert.equal(forgotNonExistent.status, 200);

    // Forgot password with existent email
    const forgotExistent = await request(app).post('/api/v1/auth/forgot-password', {
      email: activeUser.email
    });
    assert.equal(forgotExistent.status, 200);

    // Both messages must be completely indistinguishable
    assert.equal(forgotNonExistent.body.message, forgotExistent.body.message);
    assert.ok(!JSON.stringify(forgotExistent.body).includes('token'));
  });
});
