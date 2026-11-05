import test from 'node:test';
import assert from 'node:assert/strict';
import { DbService } from '../src/services/dbService.js';

test('Backend Database Client & Service', async (t) => {
  await t.test('DbService exposes static query and transaction methods', () => {
    assert.equal(typeof DbService.query, 'function');
    assert.equal(typeof DbService.queryOne, 'function');
    assert.equal(typeof DbService.queryMany, 'function');
    assert.equal(typeof DbService.transaction, 'function');
    assert.equal(typeof DbService.healthCheck, 'function');
  });

  await t.test('DbService.healthCheck returns connection status object', async () => {
    const health = await DbService.healthCheck();
    assert.equal(typeof health.connected, 'boolean');
    if (health.connected) {
      assert.ok(health.timestamp);
      assert.ok(health.database);
    } else {
      assert.equal(typeof health.error, 'string');
      assert.ok(health.config);
    }
  });
});
