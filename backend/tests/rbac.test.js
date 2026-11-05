import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { requireRole, requirePortal, ROLE_MAP } from '../src/middleware/rbac.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { request } from './testHelper.js';

test('Role-Based Access Control (RBAC) Suite', async (t) => {
  const testApp = express();
  testApp.use(express.json());

  // Test routes
  testApp.get('/clinic-only', (req, res, next) => {
    // Mock user attached by auth middleware
    req.user = req.headers['x-mock-role'] ? { roleId: Number(req.headers['x-mock-role']) } : null;
    next();
  }, requireRole('HEALTH_CENTRE_STAFF'), (req, res) => {
    res.json({ success: true, message: 'Welcome Clinic Staff' });
  });

  testApp.get('/hospital-portal', (req, res, next) => {
    req.user = req.headers['x-mock-role'] ? { roleId: Number(req.headers['x-mock-role']) } : null;
    next();
  }, requirePortal('HOSPITAL'), (req, res) => {
    res.json({ success: true, message: 'Welcome Hospital Portal' });
  });

  testApp.use(errorHandler);

  await t.test('Allows authorized role access', async () => {
    const res = await request(testApp).get('/clinic-only', {
      headers: { 'x-mock-role': '1' } // HEALTH_CENTRE_STAFF
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  await t.test('Rejects unauthorized role access with 403 Forbidden', async () => {
    const res = await request(testApp).get('/clinic-only', {
      headers: { 'x-mock-role': '4' } // TRANSPORT_COORDINATOR
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('Enforces cross-portal boundary separation', async () => {
    // Clinic staff trying to access Hospital portal route
    const crossRes = await request(testApp).get('/hospital-portal', {
      headers: { 'x-mock-role': '1' }
    });
    assert.equal(crossRes.status, 403);

    // Hospital staff accessing hospital portal
    const okRes = await request(testApp).get('/hospital-portal', {
      headers: { 'x-mock-role': '2' }
    });
    assert.equal(okRes.status, 200);
  });

  await t.test('System Administrator bypasses role restrictions', async () => {
    const adminRes = await request(testApp).get('/clinic-only', {
      headers: { 'x-mock-role': '6' } // SYSTEM_ADMINISTRATOR
    });
    assert.equal(adminRes.status, 200);
  });
});
