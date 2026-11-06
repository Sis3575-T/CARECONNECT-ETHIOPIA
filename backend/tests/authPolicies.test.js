/**
 * CareConnect Ethiopia - Authentication Policy & Constants Verification
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_CONFIG, SECURITY_EVENTS, ROLES, ERROR_CODES } from '../src/constants/index.js';

test('Authentication Policy & Architecture Configuration Suite', async (t) => {
  await t.test('Enforces strict token lifetimes and session boundaries', () => {
    assert.equal(AUTH_CONFIG.ACCESS_TOKEN_EXPIRES_IN, '15m');
    assert.equal(AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS, 900);
    assert.equal(AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN, '7d');
    assert.equal(AUTH_CONFIG.REFRESH_TOKEN_TTL_MS, 7 * 24 * 60 * 60 * 1000);
    assert.equal(AUTH_CONFIG.PASSWORD_RESET_TTL_MS, 60 * 60 * 1000);
  });

  await t.test('Defines brute-force defense and lockout parameters', () => {
    assert.equal(AUTH_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS, 5);
    assert.equal(AUTH_CONFIG.LOCKOUT_DURATION_MS, 15 * 60 * 1000);
  });

  await t.test('Defines secure cookie and CSRF token constants', () => {
    assert.equal(AUTH_CONFIG.ACCESS_COOKIE_NAME, 'careconnect_access');
    assert.equal(AUTH_CONFIG.REFRESH_COOKIE_NAME, 'careconnect_refresh');
    assert.equal(AUTH_CONFIG.CSRF_HEADER_NAME, 'x-csrf-token');
  });

  await t.test('Defines essential security audit event types', () => {
    assert.ok(SECURITY_EVENTS.USER_LOGIN_SUCCESS);
    assert.ok(SECURITY_EVENTS.USER_LOGIN_FAILED);
    assert.ok(SECURITY_EVENTS.ACCOUNT_LOCKED);
    assert.ok(SECURITY_EVENTS.PASSWORD_CHANGED);
    assert.ok(SECURITY_EVENTS.REFRESH_TOKEN_ROTATED);
    assert.ok(SECURITY_EVENTS.REFRESH_TOKEN_REUSED);
    assert.ok(SECURITY_EVENTS.SESSION_REVOKED);
    assert.ok(SECURITY_EVENTS.SESSION_FAMILY_REVOKED);
  });

  await t.test('Defines all foundational system roles', () => {
    assert.equal(ROLES.HEALTH_CENTRE_STAFF, 'HEALTH_CENTRE_STAFF');
    assert.equal(ROLES.HOSPITAL_STAFF, 'HOSPITAL_STAFF');
    assert.equal(ROLES.HOSPITAL_TRIAGE, 'HOSPITAL_TRIAGE');
    assert.equal(ROLES.TRANSPORT_COORDINATOR, 'TRANSPORT_COORDINATOR');
    assert.equal(ROLES.SYSTEM_ADMINISTRATOR, 'SYSTEM_ADMINISTRATOR');
  });

  await t.test('Defines security error codes', () => {
    assert.equal(ERROR_CODES.ACCOUNT_LOCKED, 'ACCOUNT_LOCKED');
    assert.equal(ERROR_CODES.TOKEN_EXPIRED, 'TOKEN_EXPIRED');
    assert.equal(ERROR_CODES.TOKEN_REVOKED, 'TOKEN_REVOKED');
  });
});
