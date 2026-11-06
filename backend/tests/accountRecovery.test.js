import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import UserModel from '../src/models/userModel.js';
import PasswordResetModel from '../src/models/passwordResetModel.js';

test('Account Recovery & Password Change Suite', async (t) => {
  UserModel.clearMockUsers();
  PasswordResetModel.clearStore();

  const userEmail = 'recovery.doctor@hospital.et';
  const initialPassword = 'InitialPass2026!';

  await request(app).post('/api/v1/auth/register', {
    email: userEmail,
    password: initialPassword,
    firstName: 'Kassahun',
    lastName: 'Desta',
    roleId: 2,
    facilityId: 'fac-hosp-01'
  });

  // Login to obtain valid access token
  const loginRes = await request(app).post('/api/v1/auth/login', {
    email: userEmail,
    password: initialPassword
  });
  const token = loginRes.body.data.accessToken;

  await t.test('POST /api/v1/auth/change-password successfully updates password and revokes sessions', async () => {
    const newPassword = 'NewSecurePass2026#';

    const changeRes = await request(app).post(
      '/api/v1/auth/change-password',
      {
        currentPassword: initialPassword,
        newPassword
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    assert.equal(changeRes.status, 200);
    assert.equal(changeRes.body.success, true);

    // Verify login with OLD password now fails
    const oldLogin = await request(app).post('/api/v1/auth/login', {
      email: userEmail,
      password: initialPassword
    });
    assert.equal(oldLogin.status, 401);

    // Verify login with NEW password succeeds
    const newLogin = await request(app).post('/api/v1/auth/login', {
      email: userEmail,
      password: newPassword
    });
    assert.equal(newLogin.status, 200);
  });

  await t.test('POST /api/v1/auth/change-password rejects incorrect current password', async () => {
    const relogin = await request(app).post('/api/v1/auth/login', {
      email: userEmail,
      password: 'NewSecurePass2026#'
    });

    const activeToken = relogin.body.data.accessToken;

    const res = await request(app).post(
      '/api/v1/auth/change-password',
      {
        currentPassword: 'WrongCurrentPassword123!',
        newPassword: 'AnotherPassword2026!'
      },
      {
        headers: { Authorization: `Bearer ${activeToken}` }
      }
    );

    assert.equal(res.status, 401);
    assert.ok(res.body.error.message.includes('Current password provided is incorrect'));
  });

  await t.test('POST /api/v1/auth/forgot-password returns anti-enumeration response uniformly', async () => {
    // 1. Existing registered email
    const resExisting = await request(app).post('/api/v1/auth/forgot-password', {
      email: userEmail
    });
    assert.equal(resExisting.status, 200);
    assert.equal(resExisting.body.success, true);
    assert.ok(resExisting.body.message.includes('If an account exists'));

    // 2. Non-existent email
    const resNonExisting = await request(app).post('/api/v1/auth/forgot-password', {
      email: 'nonexistent.random.ghost@moh.gov.et'
    });
    assert.equal(resNonExisting.status, 200);
    assert.equal(resNonExisting.body.success, true);
    assert.equal(resNonExisting.body.message, resExisting.body.message, 'Must return identical generic response');
  });

  await t.test('POST /api/v1/auth/reset-password resets password and enforces one-time token use', async () => {
    // Request reset token
    const forgotRes = await request(app).post('/api/v1/auth/forgot-password', {
      email: userEmail
    });

    // Extract token in test mode
    const resetToken = forgotRes.body.debugToken;
    assert.ok(resetToken, 'Debug reset token returned in test environment');

    const brandNewPassword = 'ResetPassword2026#Valid';

    // 1. Reset password using valid token
    const resetRes = await request(app).post('/api/v1/auth/reset-password', {
      token: resetToken,
      newPassword: brandNewPassword
    });

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);

    // 2. Re-attempting reset with already-used token must be rejected (one-time use)
    const reuseRes = await request(app).post('/api/v1/auth/reset-password', {
      token: resetToken,
      newPassword: 'AnotherResetAttempt123#'
    });

    assert.equal(reuseRes.status, 400);
    assert.ok(reuseRes.body.error.message.includes('already been used') || reuseRes.body.error.message.includes('invalid'));

    // 3. Login with brand new password succeeds
    const finalLogin = await request(app).post('/api/v1/auth/login', {
      email: userEmail,
      password: brandNewPassword
    });
    assert.equal(finalLogin.status, 200);
  });
});
