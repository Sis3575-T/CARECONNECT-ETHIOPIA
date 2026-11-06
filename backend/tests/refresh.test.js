import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import UserModel from '../src/models/userModel.js';
import TokenModel from '../src/models/tokenModel.js';

test('Refresh Token Management Suite', async (t) => {
  UserModel.clearMockUsers();
  TokenModel.clearStore();

  const testEmail = 'fleet.coordinator@careconnect.et';
  const testPassword = 'FleetPassword2026!';

  await request(app).post('/api/v1/auth/register', {
    email: testEmail,
    password: testPassword,
    firstName: 'Yared',
    lastName: 'Tefera',
    roleId: 4,
    facilityId: 'FAC-HOSP-TIKUR'
  });

  await t.test('Login returns both accessToken and refreshToken', async () => {
    const res = await request(app).post('/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.accessToken);
    assert.ok(res.body.data.refreshToken);
  });

  await t.test('POST /api/v1/auth/refresh issues fresh accessToken when given valid refreshToken', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });
    const { refreshToken } = loginRes.body.data;

    const refreshRes = await request(app).post('/api/v1/auth/refresh', {
      refreshToken
    });

    assert.equal(refreshRes.status, 200);
    assert.equal(refreshRes.body.success, true);
    assert.ok(refreshRes.body.data.accessToken);
  });

  await t.test('POST /api/v1/auth/refresh rejects revoked or invalid token with 401 Unauthorized', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });
    const { refreshToken } = loginRes.body.data;

    // Revoke token
    await TokenModel.revokeToken(refreshToken);

    const refreshRes = await request(app).post('/api/v1/auth/refresh', {
      refreshToken
    });

    assert.equal(refreshRes.status, 401);
    assert.ok(['UNAUTHORIZED', 'TOKEN_REVOKED'].includes(refreshRes.body.error.code));
  });
});
