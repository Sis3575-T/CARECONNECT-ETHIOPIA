import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';

test('API Versioning & Directory Router Suite', async (t) => {
  await t.test('GET /api/v1 returns version v1 metadata and service directory', async () => {
    const res = await request(app).get('/api/v1');
    assert.equal(res.status, 200);
    assert.equal(res.body.version, 'v1');
    assert.equal(res.body.name, 'CareConnect Ethiopia REST API v1');
    assert.ok(res.body.endpoints, 'Should export endpoints map');
    assert.equal(res.body.endpoints.health, '/api/v1/health');
    assert.equal(res.body.endpoints.referrals, '/api/v1/referrals');
    assert.equal(res.body.endpoints.patients, '/api/v1/patients');
    assert.equal(res.body.endpoints.transport, '/api/v1/transport');
  });
});
