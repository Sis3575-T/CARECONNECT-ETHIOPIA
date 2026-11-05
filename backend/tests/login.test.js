import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import UserModel from '../src/models/userModel.js';

test('User Login Authentication Suite', async (t) => {
  UserModel.clearMockUsers();

  const testEmail = 'doctor.dawit@tikuranbessa.et';
  const testPassword = 'HospitalPassword2026!';

  // First register user
  await request(app).post('/api/v1/auth/register', {
    email: testEmail,
    password: testPassword,
    firstName: 'Dawit',
    lastName: 'Kiros',
    roleId: 3,
    facilityId: 'FAC-HOSP-TIKUR'
  });

  await t.test('POST /api/v1/auth/login authenticates valid credentials with 200 OK', async () => {
    const res = await request(app).post('/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, testEmail);
    assert.equal(res.body.data.user.firstName, 'Dawit');
    assert.equal(res.body.data.user.facilityId, 'FAC-HOSP-TIKUR');
  });

  await t.test('POST /api/v1/auth/login rejects incorrect password with 401 Unauthorized', async () => {
    const res = await request(app).post('/api/v1/auth/login', {
      email: testEmail,
      password: 'WrongPassword999!'
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('POST /api/v1/auth/login rejects non-existent email with 401 Unauthorized', async () => {
    const res = await request(app).post('/api/v1/auth/login', {
      email: 'nonexistent.user@careconnect.et',
      password: 'SomePassword123!'
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });
});
