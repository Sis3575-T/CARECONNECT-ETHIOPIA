import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import { generateAccessToken, verifyAccessToken } from '../src/utils/token.js';
import UserModel from '../src/models/userModel.js';

test('Access Token Management Suite', async (t) => {
  UserModel.clearMockUsers();

  const testEmail = 'triage.officer@stpaul.et';
  const testPassword = 'HospitalTokenTest2026!';

  // Register user
  await request(app).post('/api/v1/auth/register', {
    email: testEmail,
    password: testPassword,
    firstName: 'Tsedey',
    lastName: 'Kebede',
    roleId: 2,
    facilityId: 'FAC-HOSP-STPAUL'
  });

  await t.test('Login returns valid JWT accessToken', async () => {
    const res = await request(app).post('/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.accessToken, 'Must return accessToken');

    // Verify token structure
    const decoded = verifyAccessToken(res.body.data.accessToken);
    assert.equal(decoded.email, testEmail);
    assert.equal(decoded.facilityId, 'FAC-HOSP-STPAUL');
  });

  await t.test('GET /api/v1/auth/me succeeds with valid Bearer token', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });
    const token = loginRes.body.data.accessToken;

    const meRes = await request(app).get('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.data.user.email, testEmail);
    assert.equal(meRes.body.data.user.firstName, 'Tsedey');
  });

  await t.test('GET /api/v1/auth/me rejects missing or invalid token with 401 Unauthorized', async () => {
    const noTokenRes = await request(app).get('/api/v1/auth/me');
    assert.equal(noTokenRes.status, 401);
    assert.equal(noTokenRes.body.error.code, 'UNAUTHORIZED');

    const badTokenRes = await request(app).get('/api/v1/auth/me', {
      headers: { Authorization: 'Bearer invalid.tampered.token' }
    });
    assert.equal(badTokenRes.status, 401);
  });
});
