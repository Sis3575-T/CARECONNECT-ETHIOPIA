import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import UserModel from '../src/models/userModel.js';
import SessionModel from '../src/models/sessionModel.js';

test('Refresh Token Rotation & Session Management Suite', async (t) => {
  UserModel.clearMockUsers();
  SessionModel.clearStore();

  const testEmail = 'coordinator.ethan@transport.et';
  const testPassword = 'FleetCoord2026!';

  await request(app).post('/api/v1/auth/register', {
    email: testEmail,
    password: testPassword,
    firstName: 'Ethan',
    lastName: 'Girma',
    roleId: 4
  });

  // 1. Initial login
  const loginRes = await request(app).post('/api/v1/auth/login', {
    email: testEmail,
    password: testPassword
  });

  assert.equal(loginRes.status, 200);
  const initialAccessToken = loginRes.body.data.accessToken;
  const initialRefreshToken = loginRes.body.data.refreshToken;
  assert.ok(initialAccessToken);
  assert.ok(initialRefreshToken);

  await t.test('POST /api/v1/auth/refresh rotates the token and issues fresh pair', async () => {
    const refreshRes = await request(app).post('/api/v1/auth/refresh', {
      refreshToken: initialRefreshToken
    });

    assert.equal(refreshRes.status, 200);
    assert.equal(refreshRes.body.success, true);
    assert.ok(refreshRes.body.data.accessToken);
    assert.ok(refreshRes.body.data.refreshToken);

    // Rotated token must differ from initial token
    assert.notEqual(refreshRes.body.data.refreshToken, initialRefreshToken);
  });

  await t.test('Detects refresh-token reuse and revokes entire session family', async () => {
    // Attempting to reuse initialRefreshToken (which was already rotated above!)
    const reuseRes = await request(app).post('/api/v1/auth/refresh', {
      refreshToken: initialRefreshToken
    });

    assert.equal(reuseRes.status, 401);
    assert.equal(reuseRes.body.success, false);
    assert.ok(
      reuseRes.body.error.message.includes('reuse detected') ||
      reuseRes.body.error.code === 'TOKEN_REVOKED'
    );
  });

  await t.test('GET /api/v1/auth/sessions lists active user sessions', async () => {
    // Log in again to create a fresh active session
    const reloginRes = await request(app).post('/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });

    const token = reloginRes.body.data.accessToken;

    const sessionsRes = await request(app).get('/api/v1/auth/sessions', {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(sessionsRes.status, 200);
    assert.equal(sessionsRes.body.success, true);
    assert.ok(Array.isArray(sessionsRes.body.data.sessions));
    assert.ok(sessionsRes.body.data.sessions.length >= 1);

    // Verify token hash is NOT exposed in sessions listing
    assert.equal(sessionsRes.body.data.sessions[0].refresh_token_hash, undefined);
  });

  await t.test('DELETE /api/v1/auth/sessions/:sessionId revokes targeted session', async () => {
    const relogin = await request(app).post('/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });

    const token = relogin.body.data.accessToken;

    const sessionsBefore = await request(app).get('/api/v1/auth/sessions', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const targetSessionId = sessionsBefore.body.data.sessions[0].id;

    const deleteRes = await request(app).delete(`/api/v1/auth/sessions/${targetSessionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.success, true);
  });

  await t.test('POST /api/v1/auth/logout-all terminates all sessions', async () => {
    const relogin = await request(app).post('/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });

    const token = relogin.body.data.accessToken;

    const logoutAllRes = await request(app).post('/api/v1/auth/logout-all', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(logoutAllRes.status, 200);
    assert.equal(logoutAllRes.body.success, true);

    const sessionsAfter = await request(app).get('/api/v1/auth/sessions', {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(sessionsAfter.body.data.sessions.length, 0);
  });
});
