/**
 * CareConnect Ethiopia - Centralized Request Validation Test Suite
 * Tests body, query, and route parameter validation, multi-source aggregation,
 * type coercion, defaults, and common schemas.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateRequest,
  commonSchemas
} from '../src/middleware/validate.js';
import { ValidationError } from '../src/utils/errors.js';

describe('Centralized Request Validation Suite — Commit 082', () => {
  it('Validates body payload with valid types and allows valid input to pass', (t, done) => {
    const schema = {
      name: { required: true, type: 'string', minLength: 2 },
      age: { required: true, type: 'integer', min: 0, max: 120 },
      email: { required: true, type: 'email' },
      isActive: { type: 'boolean', default: true }
    };

    const req = {
      body: {
        name: '  Tewodros Kassahun  ',
        age: 35,
        email: 'teddy@careconnect.et'
      }
    };
    const res = {};

    validateBody(schema)(req, res, (err) => {
      assert.ifError(err);
      assert.equal(req.body.name, 'Tewodros Kassahun', 'Must trim string');
      assert.equal(req.body.age, 35);
      assert.equal(req.body.isActive, true, 'Must apply default value');
      done();
    });
  });

  it('Rejects missing required fields and returns structured field errors', (t, done) => {
    const schema = {
      nationalId: { required: true, type: 'string', requiredMessage: 'Fayda ID is mandatory' },
      priority: { required: true, enum: ['ROUTINE', 'URGENT', 'EMERGENCY'] }
    };

    const req = { body: {} };
    const res = {};

    validateBody(schema)(req, res, (err) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(err.details));
      assert.equal(err.details.length, 2);

      const idErr = err.details.find(d => d.field === 'nationalId');
      assert.equal(idErr.message, 'Fayda ID is mandatory');
      assert.equal(idErr.code, 'REQUIRED_FIELD');
      done();
    });
  });

  it('Validates and coerces query parameters for pagination and sorting', (t, done) => {
    const req = {
      query: {
        page: '2',
        limit: '50',
        sortOrder: 'asc'
      }
    };
    const res = {};

    validateQuery(commonSchemas.pagination)(req, res, (err) => {
      assert.ifError(err);
      assert.equal(req.query.page, 2, 'Must coerce string page to integer');
      assert.equal(req.query.limit, 50, 'Must coerce string limit to integer');
      assert.equal(req.query.sortOrder, 'asc');
      done();
    });
  });

  it('Applies default pagination values when query parameters are omitted', (t, done) => {
    const req = { query: {} };
    const res = {};

    validateQuery(commonSchemas.pagination)(req, res, (err) => {
      assert.ifError(err);
      assert.equal(req.query.page, 1, 'Default page must be 1');
      assert.equal(req.query.limit, 20, 'Default limit must be 20');
      assert.equal(req.query.sortOrder, 'DESC', 'Default sortOrder must be DESC');
      done();
    });
  });

  it('Rejects invalid pagination limits exceeding maximum bounds', (t, done) => {
    const req = {
      query: {
        page: '0', // min is 1
        limit: '500' // max is 100
      }
    };
    const res = {};

    validateQuery(commonSchemas.pagination)(req, res, (err) => {
      assert.ok(err instanceof ValidationError);
      assert.ok(err.details.some(d => d.field === 'page'));
      assert.ok(err.details.some(d => d.field === 'limit'));
      done();
    });
  });

  it('Validates route parameters including UUID format checking', (t, done) => {
    const validUuid = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    const req = {
      params: {
        referralUuid: validUuid
      }
    };
    const res = {};

    validateParams(commonSchemas.uuidParam('referralUuid'))(req, res, (err) => {
      assert.ifError(err);

      // Now test with invalid UUID
      const badReq = { params: { referralUuid: 'not-a-valid-uuid' } };
      validateParams(commonSchemas.uuidParam('referralUuid'))(badReq, res, (badErr) => {
        assert.ok(badErr instanceof ValidationError);
        assert.equal(badErr.details[0].code, 'INVALID_UUID');
        done();
      });
    });
  });

  it('Aggregates multi-source errors across body, query, and params simultaneously', (t, done) => {
    const multiSchema = {
      params: commonSchemas.numericIdParam('facilityId'),
      query: commonSchemas.pagination,
      body: {
        status: { required: true, enum: ['ACTIVE', 'INACTIVE'] }
      }
    };

    const req = {
      params: { facilityId: 'invalid-id' }, // Not an integer
      query: { limit: '200' }, // Exceeds max 100
      body: { status: 'INVALID_STATUS' } // Not in enum
    };
    const res = {};

    validateRequest(multiSchema)(req, res, (err) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.details.length, 3, 'Must capture errors across all 3 sources');
      assert.ok(err.details.some(d => d.source === 'params'));
      assert.ok(err.details.some(d => d.source === 'query'));
      assert.ok(err.details.some(d => d.source === 'body'));
      done();
    });
  });
});
