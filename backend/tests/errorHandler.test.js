import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import { AppError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '../src/utils/errors.js';

test('Centralized Error Handling Architecture', async (t) => {
  await t.test('Custom error classes instantiate with correct status codes and codes', () => {
    const vErr = new ValidationError('Invalid patient ID', [{ field: 'patientId', message: 'Required' }]);
    assert.equal(vErr.statusCode, 400);
    assert.equal(vErr.code, 'VALIDATION_ERROR');
    assert.equal(vErr.details.length, 1);

    const uErr = new UnauthorizedError();
    assert.equal(uErr.statusCode, 401);
    assert.equal(uErr.code, 'UNAUTHORIZED');

    const fErr = new ForbiddenError();
    assert.equal(fErr.statusCode, 403);
    assert.equal(fErr.code, 'FORBIDDEN');

    const nErr = new NotFoundError('Referral not found');
    assert.equal(nErr.statusCode, 404);
    assert.equal(nErr.code, 'NOT_FOUND');
  });

  await t.test('Unmatched route returns standardized 404 JSON response', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-999');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(res.body.error.message.includes('/api/v1/non-existent-route-999'));
    assert.ok(res.body.error.timestamp);
  });
});
