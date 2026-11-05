import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';

test('Backend Express Application Initialization', async (t) => {
  await t.test('Express application instantiates and defines core methods', () => {
    assert.ok(app, 'app must be defined');
    assert.equal(typeof app.use, 'function', 'app.use should be a function');
    assert.equal(typeof app.listen, 'function', 'app.listen should be a function');
  });

  await t.test('GET / returns 200 with service welcome metadata', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'online');
    assert.equal(res.body.service, 'CareConnect Ethiopia - Main REST API');
    assert.equal(res.body.version, '1.0.0');
    assert.equal(res.body.health, '/api/v1/health');
  });
});
