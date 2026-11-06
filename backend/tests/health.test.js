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

  await t.test('Cloud orchestrator root probes GET /health/live and GET /health/ready', async () => {
    const liveRes = await request(app).get('/health/live');
    assert.equal(liveRes.status, 200);
    assert.equal(liveRes.body.status, 'ALIVE');

    const readyRes = await request(app).get('/health/ready');
    assert.ok([200, 503].includes(readyRes.status));
    assert.ok(['READY', 'NOT_READY'].includes(readyRes.body.status));
  });

  await t.test('Cloud orchestrator root probe GET /health returns full diagnostics', async () => {
    const res = await request(app).get('/health');
    assert.ok([200, 503].includes(res.status));
    assert.ok(['HEALTHY', 'DEGRADED'].includes(res.body.status));
    assert.equal(res.body.service, 'careconnect-backend-api');
  });
});
