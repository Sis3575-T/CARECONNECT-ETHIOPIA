/**
 * CareConnect Ethiopia - Standardized API Response Contracts Test Suite
 * Tests success, created, no-content, paginated, and error response envelopes,
 * automatic request ID propagation, and backward compatibility.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSuccess,
  formatPaginated,
  formatError,
  successResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
  errorResponse
} from '../src/utils/response.js';

describe('Standardized API Response Contracts Suite — Commit 083', () => {
  it('formatSuccess produces expected standard envelope with meta.requestId', () => {
    const data = { referralId: 'ETH-REF-2026-001' };
    const payload = formatSuccess(data, 'Referral found', { customFlag: true }, 'req-test-123');

    assert.equal(payload.success, true);
    assert.equal(payload.message, 'Referral found');
    assert.deepEqual(payload.data, data);
    assert.equal(payload.meta.requestId, 'req-test-123');
    assert.equal(payload.meta.customFlag, true);
    assert.ok(payload.meta.timestamp, 'Must include ISO timestamp');
  });

  it('formatPaginated produces standard pagination metadata calculations', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const payload = formatPaginated(items, 2, 10, 45, 'Page retrieved', {}, 'req-page-999');

    assert.equal(payload.success, true);
    assert.equal(payload.meta.requestId, 'req-page-999');
    assert.equal(payload.meta.pagination.page, 2);
    assert.equal(payload.meta.pagination.limit, 10);
    assert.equal(payload.meta.pagination.total, 45);
    assert.equal(payload.meta.pagination.totalPages, 5);
    assert.equal(payload.meta.pagination.hasNext, true);
    assert.equal(payload.meta.pagination.hasPrev, true);
  });

  it('formatError produces standard error contract with dual-level requestId compatibility', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const payload = formatError('Validation failed', 'VALIDATION_ERROR', details, 'req-err-456');

    assert.equal(payload.success, false);
    assert.equal(payload.message, 'Validation failed');
    assert.equal(payload.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(payload.error.details, details);
    assert.equal(payload.meta.requestId, 'req-err-456');
    assert.equal(payload.requestId, 'req-err-456', 'Top-level requestId preserved for client backward compatibility');
  });

  it('successResponse automatically extracts requestId from res.req and sets HTTP 200', () => {
    let capturedStatus = 0;
    let capturedBody = null;

    const mockRes = {
      req: { requestId: 'req-auto-extracted-777' },
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      }
    };

    successResponse(mockRes, { status: 'OK' });

    assert.equal(capturedStatus, 200);
    assert.equal(capturedBody.success, true);
    assert.equal(capturedBody.meta.requestId, 'req-auto-extracted-777');
  });

  it('createdResponse sets HTTP 201 status', () => {
    let capturedStatus = 0;
    const mockRes = {
      req: { requestId: 'req-created-1' },
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(body) {
        return body;
      }
    };

    createdResponse(mockRes, { id: 101 });
    assert.equal(capturedStatus, 201);
  });

  it('noContentResponse sends HTTP 204 with no body', () => {
    let capturedStatus = 0;
    let sendCalled = false;
    const mockRes = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      send() {
        sendCalled = true;
      }
    };

    noContentResponse(mockRes);
    assert.equal(capturedStatus, 204);
    assert.equal(sendCalled, true);
  });
});
