import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';

test('Security Headers & CORS Middleware Suite', async (t) => {
  await t.test('Root endpoint returns expected security headers from Helmet', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);

    // Verify Helmet security headers
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
    assert.equal(res.headers['x-dns-prefetch-control'], 'off');
  });

  await t.test('Handles authorized origin in CORS headers', async () => {
    const res = await request(app).get('/', {
      headers: { Origin: 'http://localhost:5173' }
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });
});
