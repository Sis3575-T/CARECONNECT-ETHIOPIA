import test from 'node:test';
import assert from 'node:assert/strict';
import { config, validateProductionSettings } from '../src/config/env.js';

test('Backend Environment & Settings Configuration', async (t) => {
  await t.test('Config loads standard service ports and defaults', () => {
    assert.equal(typeof config.server.port, 'number');
    assert.ok(config.server.port > 0, 'Port must be positive');
    assert.equal(config.server.apiVersion, 'v1');
    assert.ok(Array.isArray(config.cors.allowedOrigins), 'CORS origins should be an array');
    assert.ok(config.cors.allowedOrigins.includes('http://localhost:5173'));
    assert.ok(config.cors.allowedOrigins.includes('http://localhost:5174'));
  });

  await t.test('JWT settings and expiration windows are populated safely', () => {
    assert.ok(config.jwt.secret.length >= 16, 'JWT secret must be sufficiently long');
    assert.equal(config.jwt.expiresIn, '15m');
    assert.equal(config.jwt.refreshExpiresIn, '7d');
  });

  await t.test('Upload directory and size bounds are calculated', () => {
    assert.ok(config.uploads.dir, 'Upload directory must be defined');
    assert.equal(config.uploads.maxFileSizeBytes, 10 * 1024 * 1024);
  });

  await t.test('Production validation helper audits security parameters', () => {
    const audit = validateProductionSettings();
    assert.equal(typeof audit.valid, 'boolean');
    assert.ok(Array.isArray(audit.issues));
  });
});
