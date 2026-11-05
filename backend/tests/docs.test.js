import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';

test('API Documentation Foundation Suite', async (t) => {
  await t.test('GET /api/v1/docs returns OpenAPI specification metadata and cataloged paths', async () => {
    const res = await request(app).get('/api/v1/docs');
    assert.equal(res.status, 200);
    assert.equal(res.body.openapi, '3.0.3');
    assert.equal(res.body.info.title, 'CareConnect Ethiopia REST API');
    assert.ok(res.body.paths['/health']);
    assert.ok(res.body.paths['/auth/login']);
    assert.ok(res.body.paths['/referrals']);
    assert.ok(res.body.paths['/ai/recommend']);
  });
});
