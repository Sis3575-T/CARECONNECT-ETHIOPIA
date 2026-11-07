/**
 * CareConnect Ethiopia - API Security & Middleware Policy Unit Tests
 * Verifies Helmet headers, CORS policies, Content-Type enforcement,
 * and rate limiting header contracts.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { configureSecurity, enforceContentType } from '../src/middleware/security.js';
import { corsOptions, allowedOrigins } from '../src/config/cors.js';
import { createRateLimiter } from '../src/middleware/rateLimit.js';
import { request } from './testHelper.js';

describe('API Security & Middleware Policies', () => {
  describe('CORS Policy Configuration', () => {
    test('Allowed origins include all four portal production and development ports', () => {
      const expectedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176'
      ];

      for (const origin of expectedOrigins) {
        assert.ok(
          allowedOrigins.includes(origin),
          `Expected ${origin} to be included in allowedOrigins`
        );
      }
    });

    test('corsOptions origin callback permits known origins and non-browser clients', (t, done) => {
      // 1. Non-browser client (no origin header)
      corsOptions.origin(undefined, (err, allow) => {
        assert.equal(err, null);
        assert.equal(allow, true);

        // 2. Allowed origin
        corsOptions.origin('http://localhost:3000', (err2, allow2) => {
          assert.equal(err2, null);
          assert.equal(allow2, true);
          done();
        });
      });
    });

    test('corsOptions allows required headers including idempotency keys and request IDs', () => {
      assert.ok(corsOptions.allowedHeaders.includes('Authorization'));
      assert.ok(corsOptions.allowedHeaders.includes('Content-Type'));
      assert.ok(corsOptions.allowedHeaders.includes('X-Request-Id'));
      assert.ok(corsOptions.allowedHeaders.includes('Idempotency-Key'));
      assert.ok(corsOptions.allowedHeaders.includes('X-Idempotency-Key'));
      assert.equal(corsOptions.credentials, true);
    });
  });

  describe('Helmet Security Headers', () => {
    test('Configures secure headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)', async () => {
      const app = express();
      configureSecurity(app);
      app.get('/test-sec', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test-sec');

      assert.equal(res.status, 200);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
      assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    });
  });

  describe('Content-Type Enforcement (enforceContentType)', () => {
    test('Allows GET, DELETE, and bodyless requests without error', async () => {
      const app = express();
      app.use(enforceContentType);
      app.get('/test-get', (req, res) => res.json({ ok: true }));
      app.delete('/test-del', (req, res) => res.json({ ok: true }));

      const resGet = await request(app).get('/test-get');
      assert.equal(resGet.status, 200);

      const resDel = await request(app).delete('/test-del');
      assert.equal(resDel.status, 200);
    });

    test('Allows POST with application/json Content-Type', async () => {
      const app = express();
      app.use(enforceContentType);
      app.use(express.json());
      app.post('/test-post', (req, res) => res.json({ received: req.body }));

      const res = await request(app).post(
        '/test-post',
        { title: 'Clinical Referral' },
        { headers: { 'content-type': 'application/json' } }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.received.title, 'Clinical Referral');
    });

    test('Rejects POST with payload but unsupported Content-Type (415)', async () => {
      const app = express();
      app.use(enforceContentType);
      app.post('/test-post', (req, res) => res.json({ ok: true }));

      const res = await request(app).post(
        '/test-post',
        'some plain text body',
        { headers: { 'content-type': 'text/plain', 'content-length': '20' } }
      );

      assert.equal(res.status, 415);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
      assert.match(res.body.error.message, /Unsupported Media Type/i);
    });

    test('Rejects POST with payload but missing Content-Type (415)', async () => {
      const app = express();
      app.use(enforceContentType);
      app.post('/test-post', (req, res) => res.json({ ok: true }));

      const res = await request(app).post(
        '/test-post',
        null,
        { headers: { 'content-length': '15', 'content-type': '' } }
      );

      assert.equal(res.status, 415);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
      assert.match(res.body.error.message, /Content-Type header is required/i);
    });
  });

  describe('Rate Limiter Response & RFC Headers', () => {
    test('Emits both X-RateLimit-* and standard RateLimit-* headers', async () => {
      const app = express();
      const limiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 5,
        skip: () => false
      });
      app.use(limiter);
      app.get('/test-rl', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test-rl');

      assert.equal(res.status, 200);
      assert.equal(res.headers['x-ratelimit-limit'], '5');
      assert.equal(res.headers['x-ratelimit-remaining'], '4');
      assert.equal(res.headers['ratelimit-limit'], '5');
      assert.equal(res.headers['ratelimit-remaining'], '4');
      assert.ok(res.headers['ratelimit-reset']);
    });
  });
});
