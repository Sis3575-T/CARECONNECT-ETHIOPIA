import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { generateAccessToken } from '../src/utils/token.js';
import UserModel from '../src/models/userModel.js';
import config from '../src/config/env.js';
import { request } from './testHelper.js';

test('Authentication Middleware & User Context Suite', async (t) => {
  UserModel.clearMockUsers();

  const user = await UserModel.create({
    email: 'mid.nurse@ethiopia.et',
    passwordHash: 'hashedPass',
    firstName: 'Sara',
    lastName: 'Bekele',
    roleId: 1,
    facilityId: 'hc-sarabole-01',
    department: 'Outpatient Triage',
    jobTitle: 'Nurse Coordinator'
  });

  const validToken = generateAccessToken({
    id: user.id,
    email: user.email,
    roleId: 1,
    roleName: 'HEALTH_CENTRE_STAFF',
    portal: 'HEALTH_CENTRE',
    facilityId: 'hc-sarabole-01'
  });

  // Construct test Express app with centralized error handler
  const testApp = express();
  testApp.get('/protected-test', authenticate, (req, res) => {
    res.json({
      success: true,
      userContext: req.user
    });
  });
  testApp.use(errorHandler);

  await t.test('Rejects request without Authorization header with 401', async () => {
    const res = await request(testApp).get('/protected-test');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Missing Bearer'));
  });

  await t.test('Rejects malformed Authorization header with 401', async () => {
    const res = await request(testApp).get('/protected-test', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' }
    });
    assert.equal(res.status, 401);
  });

  await t.test('Populates complete authenticated user context on valid token', async () => {
    const res = await request(testApp).get('/protected-test', {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.userContext.userId, user.id);
    assert.equal(res.body.userContext.email, 'mid.nurse@ethiopia.et');
    assert.equal(res.body.userContext.facilityId, 'hc-sarabole-01');
    assert.equal(res.body.userContext.roleName, 'HEALTH_CENTRE_STAFF');
    assert.equal(res.body.userContext.portal, 'HEALTH_CENTRE');

    // Sensitive properties must NOT be present
    assert.equal(res.body.userContext.password_hash, undefined);
  });

  await t.test('Rejects expired access token with TOKEN_EXPIRED error code', async () => {
    const expiredToken = jwt.sign(
      { userId: user.id, email: user.email, roleId: 1 },
      config.jwt.secret,
      {
        algorithm: 'HS256',
        expiresIn: '-10s', // Expired 10 seconds ago
        issuer: 'careconnect-backend',
        audience: 'careconnect-portals'
      }
    );

    const res = await request(testApp).get('/protected-test', {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'TOKEN_EXPIRED');
    assert.ok(res.body.error.message.includes('expired'));
  });

  await t.test('Rejects token signed with forged secret or tampered payload', async () => {
    const forgedToken = jwt.sign(
      { userId: user.id, email: user.email },
      'forged-attacker-secret-999',
      {
        algorithm: 'HS256',
        expiresIn: '15m',
        issuer: 'careconnect-backend',
        audience: 'careconnect-portals'
      }
    );

    const res = await request(testApp).get('/protected-test', {
      headers: { Authorization: `Bearer ${forgedToken}` }
    });

    assert.equal(res.status, 401);
  });

  await t.test('Rejects deactivated account even when presenting unexpired token', async () => {
    await UserModel.setAccountStatus(user.id, false);

    const res = await request(testApp).get('/protected-test', {
      headers: { Authorization: `Bearer ${validToken}` }
    });

    assert.equal(res.status, 401);
    assert.ok(res.body.error.message.includes('deactivated'));

    // Re-activate for subsequent tests
    await UserModel.setAccountStatus(user.id, true);
  });
});
