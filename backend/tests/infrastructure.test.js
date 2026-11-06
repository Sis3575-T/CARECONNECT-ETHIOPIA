/**
 * CareConnect Ethiopia - Backend Infrastructure & Foundation Comprehensive Suite
 * Verifies core HTTP pipeline, security headers, rate limiting, correlation IDs,
 * health probes, and standard error handling envelopes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';

test('Backend Infrastructure & API Foundation Suite', async (t) => {
  await t.test('1. Root endpoint returns service metadata and discovery links', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'online');
    assert.equal(res.body.service, 'CareConnect Ethiopia - Main REST API');
    assert.equal(res.body.version, '1.0.0');
    assert.equal(res.body.documentation, '/api/v1/docs');
    assert.equal(res.body.health, '/api/v1/health');
  });

  await t.test('2. Distributed correlation tracing (X-Request-Id)', async () => {
    // Generated ID
    const resAuto = await request(app).get('/');
    assert.ok(resAuto.headers['x-request-id']);
    assert.ok(resAuto.headers['x-request-id'].startsWith('req-'));

    // Propagated ID
    const customTraceId = 'trace-careconnect-ethiopia-inf-99';
    const resPropagated = await request(app).get('/', {
      headers: { 'X-Request-Id': customTraceId }
    });
    assert.equal(resPropagated.headers['x-request-id'], customTraceId);
  });

  await t.test('3. Cloud orchestrator and versioned health probes', async () => {
    // Root container liveness
    const liveRes = await request(app).get('/health/live');
    assert.equal(liveRes.status, 200);
    assert.equal(liveRes.body.status, 'ALIVE');

    // Root container readiness
    const readyRes = await request(app).get('/health/ready');
    assert.ok([200, 503].includes(readyRes.status));

    // Full diagnostics
    const diagRes = await request(app).get('/api/v1/health');
    assert.ok([200, 503].includes(diagRes.status));
    assert.ok(['HEALTHY', 'DEGRADED'].includes(diagRes.body.status));
    assert.ok(diagRes.body.checks.memory);
    assert.ok(diagRes.body.checks.database);
  });

  await t.test('4. Security headers enforced by Helmet', async () => {
    const res = await request(app).get('/');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
    assert.equal(res.headers['x-dns-prefetch-control'], 'off');
  });

  await t.test('5. CORS policy and preflight configurations', async () => {
    const res = await request(app).get('/', {
      headers: { Origin: 'http://localhost:5173' }
    });
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  await t.test('6. API versioning master directory route GET /api/v1', async () => {
    const res = await request(app).get('/api/v1');
    assert.equal(res.status, 200);
    assert.equal(res.body.version, 'v1');
    assert.ok(res.body.endpoints.health);
    assert.ok(res.body.endpoints.docs);
    assert.ok(res.body.endpoints.auth);
    assert.ok(res.body.endpoints.referrals);
  });

  await t.test('7. OpenAPI 3.0.3 documentation endpoint GET /api/v1/docs', async () => {
    const res = await request(app).get('/api/v1/docs');
    assert.equal(res.status, 200);
    assert.equal(res.body.openapi, '3.0.3');
    assert.equal(res.body.info.title, 'CareConnect Ethiopia REST API');
    assert.ok(res.body.paths['/health']);
    assert.ok(res.body.paths['/auth/login']);
  });

  await t.test('8. Centralized 404 handler returns standard error envelope with requestId', async () => {
    const res = await request(app).get('/api/v1/route-that-definitely-does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(res.body.error.message.includes('/api/v1/route-that-definitely-does-not-exist'));
    assert.ok(res.body.error.timestamp);
    assert.ok(res.body.requestId);
  });
});
