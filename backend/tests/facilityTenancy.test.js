import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { enforceFacilityAccess } from '../src/middleware/facilityTenancy.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { request } from './testHelper.js';

test('Facility Tenancy Authorization Suite', async (t) => {
  const testApp = express();
  testApp.use(express.json());

  testApp.get('/facility-data/:facilityId', (req, res, next) => {
    // Inject mock user
    req.user = (req.headers['x-user-facility'] !== undefined || req.headers['x-user-role'] !== undefined) ? {
      roleId: Number(req.headers['x-user-role'] || 1),
      facilityId: req.headers['x-user-facility'] || null
    } : null;
    next();
  }, enforceFacilityAccess({ paramKey: 'facilityId' }), (req, res) => {
    res.json({ success: true, facilityId: req.facilityId });
  });

  testApp.use(errorHandler);

  await t.test('Permits access when requested facility matches user assigned facility', async () => {
    const res = await request(testApp).get('/facility-data/FAC-HC-KAZANCHIS', {
      headers: {
        'x-user-role': '1',
        'x-user-facility': 'FAC-HC-KAZANCHIS'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.facilityId, 'FAC-HC-KAZANCHIS');
  });

  await t.test('Rejects cross-facility access with 403 Forbidden', async () => {
    const res = await request(testApp).get('/facility-data/FAC-HOSP-TIKUR', {
      headers: {
        'x-user-role': '1',
        'x-user-facility': 'FAC-HC-KAZANCHIS' // Kazanchis staff attempting Tikur Anbessa records
      }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
    assert.ok(res.body.error.message.includes('Facility tenancy violation'));
  });

  await t.test('Regional and System Administrators can inspect any facility', async () => {
    const adminRes = await request(testApp).get('/facility-data/FAC-HOSP-TIKUR', {
      headers: {
        'x-user-role': '6', // Admin
        'x-user-facility': 'FAC-HC-KAZANCHIS'
      }
    });

    assert.equal(adminRes.status, 200);
  });

  await t.test('Rejects request without authentication with 401 Unauthorized', async () => {
    const res = await request(testApp).get('/facility-data/FAC-HC-KAZANCHIS');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('Rejects user without assigned facility with 403 Forbidden', async () => {
    const res = await request(testApp).get('/facility-data/FAC-HC-KAZANCHIS', {
      headers: {
        'x-user-role': '1',
        'x-user-facility': ''
      }
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });
});
