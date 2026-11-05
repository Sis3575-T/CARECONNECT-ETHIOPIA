import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';

test('Request Logger & Correlation ID Suite', async (t) => {
  await t.test('Assigns automatic X-Request-Id header when not supplied', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.ok(res.headers['x-request-id'], 'Must attach X-Request-Id header');
    assert.ok(res.headers['x-request-id'].startsWith('req-'));
  });

  await t.test('Preserves incoming X-Request-Id header for distributed tracing', async () => {
    const customTraceId = 'trace-ethiopia-referral-7788';
    const res = await request(app).get('/', {
      headers: { 'X-Request-Id': customTraceId }
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-request-id'], customTraceId);
  });
});
