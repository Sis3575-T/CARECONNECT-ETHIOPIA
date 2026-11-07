import test from 'node:test';
import assert from 'node:assert/strict';

import {
  authService,
  isRoleAllowedForPortal,
  getPortalForRole,
  getPortalUrl,
  STORAGE_KEYS,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  setSessionStorage,
  clearSessionStorage
} from '../services/authService.js';
import { ROLES, ROLE_LABELS, PERMISSIONS } from '../constants/roles.js';
import { PORTALS, PORTAL_LIST } from '../constants/portals.js';
import { normalizeApiError, generateRequestId } from '../services/apiClient.js';

test('CareConnect Ethiopia — Portal Authentication & Session Lifecycle Suite (Part 16)', async (t) => {
  // Mock browser localStorage for Node.js test environment
  const mockStorage = new Map();
  globalThis.localStorage = {
    getItem: (key) => (mockStorage.has(key) ? mockStorage.get(key) : null),
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear()
  };

  await t.test('1. authService exposes all required authentication API methods', () => {
    assert.equal(typeof authService.login, 'function');
    assert.equal(typeof authService.refreshToken, 'function');
    assert.equal(typeof authService.logout, 'function');
    assert.equal(typeof authService.logoutAll, 'function');
    assert.equal(typeof authService.getCurrentUser, 'function');
    assert.equal(typeof authService.getUserPermissions, 'function');
    assert.equal(typeof authService.changePassword, 'function');
    assert.equal(typeof authService.requestPasswordReset, 'function');
    assert.equal(typeof authService.resetPassword, 'function');
    assert.equal(typeof authService.getSessions, 'function');
    assert.equal(typeof authService.revokeSession, 'function');
  });

  await t.test('2. Storage helpers safely persist, retrieve, and clear tokens & user session', () => {
    mockStorage.clear();

    const sampleUser = {
      id: 10,
      email: 'dr.alemayehu@careconnect.gov.et',
      role: ROLES.HEALTH_CENTRE_REFERRAL_CLINICIAN,
      facilityId: 101
    };

    setSessionStorage({
      accessToken: 'sample-jwt-access-token-12345',
      refreshToken: 'sample-refresh-session-token-67890',
      user: sampleUser
    });

    assert.equal(getStoredAccessToken(), 'sample-jwt-access-token-12345');
    assert.equal(getStoredRefreshToken(), 'sample-refresh-session-token-67890');
    assert.deepEqual(getStoredUser(), sampleUser);

    clearSessionStorage();

    assert.equal(getStoredAccessToken(), null);
    assert.equal(getStoredRefreshToken(), null);
    assert.equal(getStoredUser(), null);
  });

  await t.test('3. Server-authoritative role verification: Health Centre Portal access matrix', () => {
    // Authorized roles
    assert.equal(isRoleAllowedForPortal(ROLES.HEALTH_CENTRE_REFERRAL_CLINICIAN, 'health-centre'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.PRIMARY_CARE_PHYSICIAN, 'health-centre'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.CLINICAL_NURSE, 'health-centre'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.SYSTEM_ADMINISTRATOR, 'health-centre'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.REGIONAL_OFFICER, 'health-centre'), true);

    // Unauthorized roles (no client-side privilege escalation!)
    assert.equal(isRoleAllowedForPortal(ROLES.HOSPITAL_TRIAGE_CLINICIAN, 'health-centre'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.EMERGENCY_PHYSICIAN, 'health-centre'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.TRANSPORT_COORDINATOR, 'health-centre'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.AMBULANCE_DRIVER, 'health-centre'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.MOH_DATA_ANALYST, 'health-centre'), false);
  });

  await t.test('4. Server-authoritative role verification: Hospital Specialist Portal access matrix', () => {
    // Authorized roles
    assert.equal(isRoleAllowedForPortal(ROLES.HOSPITAL_TRIAGE_CLINICIAN, 'hospital'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.EMERGENCY_PHYSICIAN, 'hospital'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.CHIEF_CLINICAL_OFFICER, 'hospital'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.SYSTEM_ADMINISTRATOR, 'hospital'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.REGIONAL_OFFICER, 'hospital'), true);

    // Unauthorized roles
    assert.equal(isRoleAllowedForPortal(ROLES.HEALTH_CENTRE_REFERRAL_CLINICIAN, 'hospital'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.CLINICAL_NURSE, 'hospital'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.AMBULANCE_DISPATCHER, 'hospital'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.MOH_DATA_ANALYST, 'hospital'), false);
  });

  await t.test('5. Server-authoritative role verification: Transport Coordinator Portal access matrix', () => {
    // Authorized roles
    assert.equal(isRoleAllowedForPortal(ROLES.TRANSPORT_COORDINATOR, 'transport'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.AMBULANCE_DISPATCHER, 'transport'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.AMBULANCE_DRIVER, 'transport'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.SYSTEM_ADMINISTRATOR, 'transport'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.REGIONAL_OFFICER, 'transport'), true);

    // Unauthorized roles
    assert.equal(isRoleAllowedForPortal(ROLES.HEALTH_CENTRE_REFERRAL_CLINICIAN, 'transport'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.HOSPITAL_TRIAGE_CLINICIAN, 'transport'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.MOH_DATA_ANALYST, 'transport'), false);
  });

  await t.test('6. Server-authoritative role verification: Administrator Portal strict governance', () => {
    // Authorized roles
    assert.equal(isRoleAllowedForPortal(ROLES.SYSTEM_ADMINISTRATOR, 'administrator'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.REGIONAL_OFFICER, 'administrator'), true);
    assert.equal(isRoleAllowedForPortal(ROLES.MOH_DATA_ANALYST, 'administrator'), true);

    // Strictly forbidden clinical roles
    assert.equal(isRoleAllowedForPortal(ROLES.HEALTH_CENTRE_REFERRAL_CLINICIAN, 'administrator'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.HOSPITAL_TRIAGE_CLINICIAN, 'administrator'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.TRANSPORT_COORDINATOR, 'administrator'), false);
    assert.equal(isRoleAllowedForPortal(ROLES.AMBULANCE_DRIVER, 'administrator'), false);
  });

  await t.test('7. getPortalForRole correctly routes users to their primary authorized portal', () => {
    assert.equal(getPortalForRole(ROLES.HEALTH_CENTRE_REFERRAL_CLINICIAN).id, 'health-centre');
    assert.equal(getPortalForRole(ROLES.PRIMARY_CARE_PHYSICIAN).id, 'health-centre');
    assert.equal(getPortalForRole(ROLES.CLINICAL_NURSE).id, 'health-centre');

    assert.equal(getPortalForRole(ROLES.HOSPITAL_TRIAGE_CLINICIAN).id, 'hospital');
    assert.equal(getPortalForRole(ROLES.EMERGENCY_PHYSICIAN).id, 'hospital');
    assert.equal(getPortalForRole(ROLES.CHIEF_CLINICAL_OFFICER).id, 'hospital');

    assert.equal(getPortalForRole(ROLES.TRANSPORT_COORDINATOR).id, 'transport');
    assert.equal(getPortalForRole(ROLES.AMBULANCE_DISPATCHER).id, 'transport');
    assert.equal(getPortalForRole(ROLES.AMBULANCE_DRIVER).id, 'transport');

    assert.equal(getPortalForRole(ROLES.SYSTEM_ADMINISTRATOR).id, 'administrator');
    assert.equal(getPortalForRole(ROLES.REGIONAL_OFFICER).id, 'administrator');
    assert.equal(getPortalForRole(ROLES.MOH_DATA_ANALYST).id, 'administrator');
  });

  await t.test('8. getPortalUrl resolves correct local development ports for each portal', () => {
    assert.equal(getPortalUrl('health-centre'), 'http://localhost:5173');
    assert.equal(getPortalUrl('hospital'), 'http://localhost:5174');
    assert.equal(getPortalUrl('transport'), 'http://localhost:5175');
    assert.equal(getPortalUrl('administrator'), 'http://localhost:5176');
  });

  await t.test('9. normalizeApiError normalizes 401 token expiration and 429 rate limit envelopes', () => {
    const expiredError = {
      response: {
        status: 401,
        headers: { 'x-request-id': 'req-expired-99' },
        data: {
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Your healthcare session has expired.'
          }
        }
      }
    };

    const normExpired = normalizeApiError(expiredError);
    assert.equal(normExpired.status, 401);
    assert.equal(normExpired.isAuthError, true);
    assert.equal(normExpired.message, 'Your healthcare session has expired.');
    assert.equal(normExpired.requestId, 'req-expired-99');

    const rateLimitError = {
      response: {
        status: 429,
        data: {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please try again in 15 minutes.'
          }
        }
      }
    };

    const normRateLimit = normalizeApiError(rateLimitError);
    assert.equal(normRateLimit.status, 429);
    assert.equal(normRateLimit.isRateLimited, true);
    assert.equal(normRateLimit.message, 'Too many authentication attempts. Please try again in 15 minutes.');
  });
});
