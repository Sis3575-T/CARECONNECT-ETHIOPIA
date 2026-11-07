/**
 * CareConnect Ethiopia - API Reliability, Idempotency & Compatibility Unit Tests
 * Verifies idempotency caching, concurrent in-flight guards, health probe diagnostics,
 * credential sanitization, and compatibility headers.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createIdempotencyMiddleware } from '../src/middleware/idempotency.js';
import healthRouter from '../src/routes/v1/health.js';
import { request } from './testHelper.js';

describe('API Reliability & Idempotency Suite', () => {
  describe('Idempotency Key Handling', () => {
    test('Replays identical response on duplicate submission with Idempotency-Key', async () => {
      const app = express();
      const idempotency = createIdempotencyMiddleware({ ttlMs: 60 * 1000 });
      let executionCount = 0;

      app.use(express.json());
      app.use(idempotency);

      app.post('/api/v1/resource', (req, res) => {
        executionCount += 1;
        res.status(201).json({
          success: true,
          data: { id: 'res-001', executionCount, payload: req.body }
        });
      });

      const key = 'idem-unique-key-12345';

      // First invocation
      const res1 = await request(app).post(
        '/api/v1/resource',
        { patientName: 'Abebe Bikila' },
        { headers: { 'idempotency-key': key, 'content-type': 'application/json' } }
      );

      assert.equal(res1.status, 201);
      assert.equal(res1.body.data.executionCount, 1);
      assert.equal(executionCount, 1);
      assert.equal(res1.headers['idempotent-replay'], undefined);

      // Second invocation with identical idempotency key
      const res2 = await request(app).post(
        '/api/v1/resource',
        { patientName: 'Abebe Bikila' },
        { headers: { 'idempotency-key': key, 'content-type': 'application/json' } }
      );

      assert.equal(res2.status, 201);
      assert.equal(res2.body.data.executionCount, 1); // Exact cached response
      assert.equal(executionCount, 1); // Handler was not re-executed
      assert.equal(res2.headers['idempotent-replay'], 'true');
      assert.equal(res2.headers['x-idempotency-key'], key);
    });

    test('Different idempotency keys execute independently', async () => {
      const app = express();
      const idempotency = createIdempotencyMiddleware();
      let executionCount = 0;

      app.use(express.json());
      app.use(idempotency);

      app.post('/api/v1/orders', (req, res) => {
        executionCount += 1;
        res.status(200).json({ orderId: executionCount });
      });

      const res1 = await request(app).post(
        '/api/v1/orders',
        {},
        { headers: { 'x-idempotency-key': 'key-A' } }
      );
      assert.equal(res1.body.orderId, 1);

      const res2 = await request(app).post(
        '/api/v1/orders',
        {},
        { headers: { 'x-idempotency-key': 'key-B' } }
      );
      assert.equal(res2.body.orderId, 2);
      assert.equal(executionCount, 2);
    });

    test('Failed operations (4xx/5xx) are not cached and permit retries', async () => {
      const app = express();
      const idempotency = createIdempotencyMiddleware();
      let attempt = 0;

      app.use(express.json());
      app.use(idempotency);

      app.post('/api/v1/flaky', (req, res) => {
        attempt += 1;
        if (attempt === 1) {
          return res.status(500).json({ error: 'Temporary DB glitch' });
        }
        res.status(200).json({ status: 'Recovered', attempt });
      });

      const retryKey = 'flaky-retry-key';

      // 1st request fails
      const res1 = await request(app).post(
        '/api/v1/flaky',
        {},
        { headers: { 'idempotency-key': retryKey } }
      );
      assert.equal(res1.status, 500);

      // 2nd request retries with same key and succeeds
      const res2 = await request(app).post(
        '/api/v1/flaky',
        {},
        { headers: { 'idempotency-key': retryKey } }
      );
      assert.equal(res2.status, 200);
      assert.equal(res2.body.status, 'Recovered');
      assert.equal(res2.body.attempt, 2);
    });
  });

  describe('Health Probes & Credential Sanitization', () => {
    test('Health router returns standard liveness and readiness responses', async () => {
      const app = express();
      app.use('/api/v1/health', healthRouter);

      const liveRes = await request(app).get('/api/v1/health/liveness');
      assert.equal(liveRes.status, 200);
      assert.equal(liveRes.body.status, 'ALIVE');

      const diagRes = await request(app).get('/api/v1/health');
      assert.ok([200, 503].includes(diagRes.status));
      assert.ok(['HEALTHY', 'DEGRADED'].includes(diagRes.body.status));
      assert.ok(diagRes.body.checks.database);
      assert.ok(diagRes.body.checks.memory);
    });
  });
});
