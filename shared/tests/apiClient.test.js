import test from 'node:test';
import assert from 'node:assert/strict';

import {
  apiClient,
  API_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  generateRequestId,
  normalizeApiError,
  createAbortController
} from '../services/apiClient.js';

test('API Client Architecture & Error Normalization Suite — Commit 118', async (t) => {
  await t.test('1. apiClient defaults to /api/v1 base URL and 15s timeout', () => {
    assert.ok(API_BASE_URL.includes('/v1'));
    assert.equal(DEFAULT_TIMEOUT_MS, 15000);
    assert.equal(apiClient.defaults.timeout, 15000);
  });

  await t.test('2. generateRequestId creates valid tracing IDs with req- prefix', () => {
    const reqId1 = generateRequestId();
    const reqId2 = generateRequestId();
    assert.match(reqId1, /^req-[a-z0-9]+-[a-z0-9]+$/);
    assert.notEqual(reqId1, reqId2);
  });

  await t.test('3. normalizeApiError normalizes 400 validation error envelope', () => {
    const rawError = {
      response: {
        status: 400,
        headers: { 'x-request-id': 'req-test-123' },
        data: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Referral clinical priority is required',
            details: [{ field: 'priority', message: 'Required' }]
          }
        }
      }
    };

    const normalized = normalizeApiError(rawError);
    assert.equal(normalized.status, 400);
    assert.equal(normalized.code, 'VALIDATION_ERROR');
    assert.equal(normalized.message, 'Referral clinical priority is required');
    assert.equal(normalized.requestId, 'req-test-123');
    assert.equal(normalized.isValidationError, true);
    assert.equal(normalized.isAuthError, false);
    assert.equal(normalized.isNetworkError, false);
  });

  await t.test('4. normalizeApiError normalizes 401 and 403 authorization errors', () => {
    const raw401 = {
      response: {
        status: 401,
        data: {
          error: { code: 'TOKEN_EXPIRED', message: 'JWT access token expired' }
        }
      }
    };
    const norm401 = normalizeApiError(raw401);
    assert.equal(norm401.status, 401);
    assert.equal(norm401.isAuthError, true);

    const raw403 = {
      response: {
        status: 403,
        data: {
          error: { code: 'FORBIDDEN', message: 'User does not belong to facility' }
        }
      }
    };
    const norm403 = normalizeApiError(raw403);
    assert.equal(norm403.status, 403);
    assert.equal(norm403.isAuthError, true);
  });

  await t.test('5. normalizeApiError normalizes network failure and timeouts', () => {
    const networkErr = {
      request: {},
      message: 'Network Error'
    };
    const normNet = normalizeApiError(networkErr);
    assert.equal(normNet.status, 0);
    assert.equal(normNet.code, 'NETWORK_ERROR');
    assert.equal(normNet.isNetworkError, true);

    const timeoutErr = {
      request: {},
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded'
    };
    const normTime = normalizeApiError(timeoutErr);
    assert.equal(normTime.code, 'TIMEOUT_ERROR');
    assert.equal(normTime.isNetworkError, true);
  });

  await t.test('6. createAbortController returns functional AbortController instance', () => {
    const controller = createAbortController();
    assert.ok(controller.signal);
    assert.equal(controller.signal.aborted, false);
    controller.abort();
    assert.equal(controller.signal.aborted, true);
  });
});
