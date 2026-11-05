import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import UserModel from '../src/models/userModel.js';
import TokenModel from '../src/models/tokenModel.js';

test('Logout & Token Revocation Suite', async (t) => {
  UserModel.clearMockUsers();
  TokenModel.clearStore();

  const testEmail = 'doctor.logout@tikur.et';
  const testPassword = 'LogoutPassword123!';

  await request(app).post('/api/v1/auth/register', {
    email: testEmail,
    password: testPassword,
    firstName: 'Yosef',
    lastName: 'Tulu',
    roleId: 2,
    facilityId: 'FAC-HOSP-TIKUR'
  });

  const loginRes = await request(app).post('/api/v1/auth/login', {
    email: testEmail,
    password: testPassword
  });
  const { accessToken, refreshToken } = loginRes.body.data;

  await t.test('POST /api/v1/auth/logout revokes refresh token and terminates session', async () => {
    const logoutRes = await request(app).post('/api/v1/auth/logout', {
      refreshToken
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);
    assert.ok(logoutRes.body.message.includes('revoked'));

    // Verify refresh token is no longer accepted
    const reuseRes = await request(app).post('/api/v1/auth/refresh', {
      refreshToken
    });
    assert.equal(reuseRes.status, 401);
  });
});
