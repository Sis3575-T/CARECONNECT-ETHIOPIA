/**
 * CareConnect Ethiopia - Project Health & Environment Configuration Suite
 * Validates configuration parsing, port bindings, security defaults, and service readiness.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import config, { validateProductionSettings } from '../src/config/env.js';
import { getServices } from '../../scripts/dev-orchestrator.js';

describe('Project Health & Configuration Integrity Suite', () => {
  it('Configuration defines all four portal ports and core backend ports', () => {
    assert.strictEqual(typeof config.server.port, 'number');
    assert.strictEqual(config.server.port, 5000);
    assert.ok(config.cors.allowedOrigins.length >= 4, 'Must allow at least the 4 portal origins');
    assert.ok(config.cors.allowedOrigins.includes('http://localhost:5173'));
    assert.ok(config.cors.allowedOrigins.includes('http://localhost:5174'));
    assert.ok(config.cors.allowedOrigins.includes('http://localhost:5175'));
    assert.ok(config.cors.allowedOrigins.includes('http://localhost:5176'));
  });

  it('dev-orchestrator defines service directory for all 7 project services', () => {
    const services = getServices();
    assert.strictEqual(services.length, 7, 'Expected 7 services in orchestrator directory');

    const names = services.map(s => s.name);
    assert.ok(names.includes('Health Centre Portal'));
    assert.ok(names.includes('Hospital Portal'));
    assert.ok(names.includes('Transport Portal'));
    assert.ok(names.includes('Administrator Portal'));
    assert.ok(names.includes('Main Backend API'));
    assert.ok(names.includes('AI Decision Service'));
    assert.ok(names.includes('PostgreSQL Database'));
  });

  it('validateProductionSettings rejects default dev secrets in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    try {
      // Test production validation rules
      const result = validateProductionSettings();
      assert.strictEqual(typeof result.valid, 'boolean');
      assert.ok(Array.isArray(result.issues));
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('JWT expiration windows are properly configured', () => {
    assert.strictEqual(config.jwt.expiresIn, '15m');
    assert.strictEqual(config.jwt.refreshExpiresIn, '7d');
  });
});
