import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { requirePermission, requireRole, requirePortal, getPermissionsForRole } from '../src/middleware/rbac.js';
import { enforceFacilityAccess } from '../src/middleware/facilityTenancy.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { app } from '../src/app.js';
import { generateAccessToken } from '../src/utils/token.js';
import UserModel from '../src/models/userModel.js';
import { request } from './testHelper.js';

test('Granular Authorization & RBAC Permissions Suite', async (t) => {
  UserModel.clearMockUsers();

  const testApp = express();
  testApp.use(express.json());

  // Test permission-guarded routes
  testApp.post(
    '/test-referral-create',
    (req, res, next) => {
      req.user = req.headers['x-mock-role'] ? { roleId: Number(req.headers['x-mock-role']) } : null;
      next();
    },
    requirePermission('referral:create'),
    (req, res) => res.json({ success: true, message: 'Referral draft created' })
  );

  testApp.post(
    '/test-user-management',
    (req, res, next) => {
      req.user = req.headers['x-mock-role'] ? { roleId: Number(req.headers['x-mock-role']) } : null;
      next();
    },
    requirePermission('user:manage'),
    (req, res) => res.json({ success: true, message: 'User created' })
  );

  testApp.get(
    '/facilities/:facilityId/patients',
    (req, res, next) => {
      req.user = {
        roleId: Number(req.headers['x-user-role'] || 1),
        facilityId: req.headers['x-user-facility'] || 'fac-bole-01'
      };
      next();
    },
    enforceFacilityAccess(),
    (req, res) => res.json({ success: true, facilityId: req.facilityId })
  );

  testApp.use(errorHandler);

  await t.test('requirePermission permits action when role possesses granular permission', async () => {
    // Role 1 (HEALTH_CENTRE_STAFF) has 'referral:create'
    const res = await request(testApp).post('/test-referral-create', {}, {
      headers: { 'x-mock-role': '1' }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  await t.test('requirePermission rejects action with 403 when role lacks permission', async () => {
    // Role 5 (AMBULANCE_DRIVER) lacks 'referral:create'
    const res = await request(testApp).post('/test-referral-create', {}, {
      headers: { 'x-mock-role': '5' }
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes("Action requires 'referral:create' permission"));
  });

  await t.test('System Administrator possesses broad permission authority', async () => {
    const res = await request(testApp).post('/test-user-management', {}, {
      headers: { 'x-mock-role': '6' } // SYSTEM_ADMINISTRATOR
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  await t.test('Facility boundary restricts access to user assigned facility', async () => {
    // Accessing own facility
    const okRes = await request(testApp).get('/facilities/fac-bole-01/patients', {
      headers: {
        'x-user-role': '1',
        'x-user-facility': 'fac-bole-01'
      }
    });
    assert.equal(okRes.status, 200);

    // Attempting horizontal privilege escalation into another facility
    const forbiddenRes = await request(testApp).get('/facilities/fac-foreign-99/patients', {
      headers: {
        'x-user-role': '1',
        'x-user-facility': 'fac-bole-01'
      }
    });
    assert.equal(forbiddenRes.status, 403);
    assert.ok(forbiddenRes.body.error.message.includes('Facility tenancy violation'));
  });

  await t.test('GET /api/v1/auth/permissions returns resolved permissions list for caller', async () => {
    const user = await UserModel.create({
      email: 'triage.doc@tikur.et',
      passwordHash: 'hash',
      firstName: 'Selam',
      lastName: 'Kebede',
      roleId: 3 // HOSPITAL_TRIAGE
    });

    const token = generateAccessToken({
      id: user.id,
      email: user.email,
      roleId: 3,
      roleName: 'HOSPITAL_TRIAGE',
      portal: 'HOSPITAL'
    });

    const res = await request(app).get('/api/v1/auth/permissions', {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.roleId, 3);
    assert.equal(res.body.data.portal, 'HOSPITAL');
    assert.ok(Array.isArray(res.body.data.permissions));
    assert.ok(res.body.data.permissions.includes('referral:accept'));
    assert.ok(res.body.data.permissions.includes('referral:reject'));
  });
});
