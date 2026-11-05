import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import UserModel from '../src/models/userModel.js';

test('User Registration Suite', async (t) => {
  UserModel.clearMockUsers();

  await t.test('POST /api/v1/auth/register registers a valid new user with 201 Created', async () => {
    const res = await request(app).post('/api/v1/auth/register', {
      email: 'nurse.marta@healthcentre.et',
      password: 'SecurePassword123!',
      firstName: 'Marta',
      lastName: 'Girma',
      phoneNumber: '+251-91-999-8877',
      roleId: 1,
      facilityId: 'FAC-HC-KAZANCHIS',
      department: 'Outpatient Triage',
      jobTitle: 'Senior Referral Nurse'
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, 'nurse.marta@healthcentre.et');
    assert.equal(res.body.data.user.first_name, 'Marta');
    assert.equal(res.body.data.user.password_hash, undefined, 'Must not expose password hash');
  });

  await t.test('POST /api/v1/auth/register prevents duplicate email registration with 409 Conflict', async () => {
    const res = await request(app).post('/api/v1/auth/register', {
      email: 'nurse.marta@healthcentre.et',
      password: 'AnotherPassword456!',
      firstName: 'Marta',
      lastName: 'Girma'
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CONFLICT');
  });
});
