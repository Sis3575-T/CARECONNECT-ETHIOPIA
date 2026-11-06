import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRateLimiter } from '../src/middleware/rateLimit.js';
import { request } from './testHelper.js';

test('Rate Limiting & Abuse Prevention Suite', async (t) => {
  await t.test('Enforces request quota and returns 429 when max exceeded', async () => {
    const testApp = express();
    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 3,
      skip: () => false // Force enforcement
    });

    testApp.use(limiter);
    testApp.get('/test-limit', (req, res) => res.json({ status: 'ok' }));

    // 1st request: remaining = 2
    const res1 = await request(testApp).get('/test-limit');
    assert.equal(res1.status, 200);
    assert.equal(res1.headers['x-ratelimit-limit'], '3');
    assert.equal(res1.headers['x-ratelimit-remaining'], '2');

    // 2nd request: remaining = 1
    const res2 = await request(testApp).get('/test-limit');
    assert.equal(res2.status, 200);
    assert.equal(res2.headers['x-ratelimit-remaining'], '1');

    // 3rd request: remaining = 0
    const res3 = await request(testApp).get('/test-limit');
    assert.equal(res3.status, 200);
    assert.equal(res3.headers['x-ratelimit-remaining'], '0');

    // 4th request: rate limit exceeded -> 429
    const res4 = await request(testApp).get('/test-limit');
    assert.equal(res4.status, 429);
    assert.equal(res4.body.success, false);
    assert.equal(res4.body.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(res4.headers['retry-after']);
    assert.ok(res4.body.error.retryAfter > 0);
  });

  await t.test('Resets quota when reset() is called', async () => {
    const testApp = express();
    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 1,
      skip: () => false
    });

    testApp.use(limiter);
    testApp.get('/test-reset', (req, res) => res.json({ status: 'ok' }));

    const res1 = await request(testApp).get('/test-reset');
    assert.equal(res1.status, 200);

    const res2 = await request(testApp).get('/test-reset');
    assert.equal(res2.status, 429);

    limiter.reset();

    const res3 = await request(testApp).get('/test-reset');
    assert.equal(res3.status, 200);
  });

  await t.test('Tracks separate quotas for different IP addresses', async () => {
    const testApp = express();
    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 1,
      skip: () => false
    });

    testApp.use(limiter);
    testApp.get('/test-ip', (req, res) => res.json({ status: 'ok' }));

    // Request from Client A
    const resA1 = await request(testApp).get('/test-ip', {
      headers: { 'X-Forwarded-For': '192.168.1.10' }
    });
    assert.equal(resA1.status, 200);

    const resA2 = await request(testApp).get('/test-ip', {
      headers: { 'X-Forwarded-For': '192.168.1.10' }
    });
    assert.equal(resA2.status, 429);

    // Request from Client B should still succeed
    const resB1 = await request(testApp).get('/test-ip', {
      headers: { 'X-Forwarded-For': '10.0.0.5' }
    });
    assert.equal(resB1.status, 200);
  });
});
