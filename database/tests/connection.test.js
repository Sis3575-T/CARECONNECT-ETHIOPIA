/**
 * CareConnect Ethiopia - Database Connection & Security Health Suite
 * Tests connection pooling, Neon SSL detection, and password sanitization.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { testConnection, sanitizeConnectionString } from '../connection.js';

describe('Database Connection & Credential Security Suite', () => {
  it('sanitizeConnectionString masks password in full PostgreSQL connection string', () => {
    const raw = 'postgresql://careconnect_user:superSecretPassword123@ep-cool-fog-12345.us-east-2.aws.neon.tech/careconnect_db?sslmode=require';
    const sanitized = sanitizeConnectionString(raw);

    assert.ok(!sanitized.includes('superSecretPassword123'), 'Raw password must be stripped');
    assert.ok(sanitized.includes('careconnect_user:********@'), 'Password must be masked with asterisks');
    assert.ok(sanitized.includes('neon.tech'), 'Host and database details should be preserved');
  });

  it('sanitizeConnectionString handles non-matching strings or empty input safely', () => {
    assert.strictEqual(sanitizeConnectionString(''), '');
    assert.strictEqual(sanitizeConnectionString(null), '');
    assert.strictEqual(sanitizeConnectionString(undefined), '');
    assert.strictEqual(sanitizeConnectionString('plain text error'), 'plain text error');
  });

  it('testConnection returns a standardized health status object without crashing', async () => {
    const status = await testConnection();

    assert.ok(typeof status === 'object' && status !== null, 'Status must be an object');
    assert.ok('connected' in status, 'Status must report connected boolean');
    assert.ok('ssl' in status, 'Status must report SSL configuration boolean');

    if (status.connected) {
      assert.ok(status.database, 'Connected status should include database name');
      assert.ok(status.timestamp, 'Connected status should include server timestamp');
    } else {
      assert.ok(typeof status.error === 'string', 'Offline status should provide error summary');
      assert.ok(!status.error.includes('superSecretPassword'), 'Offline error must never leak secrets');
    }
  });
});
