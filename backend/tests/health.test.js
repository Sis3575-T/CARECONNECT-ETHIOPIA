import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';

test('Health & Readiness Check Endpoints Suite', async (t) => {
  await t.test('GET /api/v1/health/liveness returns 200 ALIVE', async () => {
    const res = await request(app).get('/api/v1/health/liveness');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ALIVE');
    assert.ok(res.body.timestamp);
  });

  await t.test('GET /api/v1/health returns diagnostics payload with memory and service uptime', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.ok([200, 503].includes(res.status)); // 200 if DB up, 503 if DB down (graceful degradation)
    assert.ok(['HEALTHY', 'DEGRADED'].includes(res.body.status));
    assert.equal(res.body.service, 'careconnect-backend-api');
    assert.ok(res.body.checks.memory);
    assert.ok(typeof res.body.checks.memory.heapUsedMb === 'number');
    assert.ok(res.body.checks.database);
  });
});
