/**
 * CareConnect Ethiopia - Centralized Error Handling & Request Tracing Unit Tests
 * Verifies domain errors, database code mapping, sanitization, stack concealment,
 * correlation ID propagation, and sensitive data redaction.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  DatabaseError,
  ServiceUnavailableError,
  UnprocessableEntityError,
  MethodNotAllowedError
} from '../src/utils/errors.js';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';
import { redactSensitiveData } from '../src/middleware/requestLogger.js';

function mockReq(overrides = {}) {
  return {
    method: 'GET',
    originalUrl: '/api/v1/test',
    headers: {},
    requestId: 'req-test-12345',
    ...overrides
  };
}

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key.toLowerCase()] = val;
    },
    getHeader(key) {
      return this.headers[key.toLowerCase()];
    }
  };
  return res;
}

describe('Centralized Error Handling & Request Tracing', () => {
  test('notFoundHandler forwards a NotFoundError with 404 code', () => {
    const req = mockReq({ method: 'GET', originalUrl: '/api/v1/nonexistent' });
    const res = mockRes();
    let forwardErr = null;

    notFoundHandler(req, res, (err) => {
      forwardErr = err;
    });

    assert.ok(forwardErr instanceof NotFoundError);
    assert.equal(forwardErr.statusCode, 404);
    assert.equal(forwardErr.code, 'NOT_FOUND');
    assert.match(forwardErr.message, /Route GET \/api\/v1\/nonexistent does not exist/);
  });

  test('errorHandler renders standardized payload for operational AppError', () => {
    const err = new BadRequestError('Invalid patient parameters', [{ field: 'mrn', message: 'Required' }]);
    const req = mockReq({ requestId: 'req-op-123' });
    const res = mockRes();

    errorHandler(err, req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
    assert.equal(res.body.error.message, 'Invalid patient parameters');
    assert.deepEqual(res.body.error.details, [{ field: 'mrn', message: 'Required' }]);
    assert.equal(res.body.meta.requestId, 'req-op-123');
    assert.equal(res.body.requestId, 'req-op-123');
  });

  test('errorHandler maps PostgreSQL unique_violation (23505) to 409 Conflict', () => {
    const dbErr = new Error('duplicate key value violates unique constraint "patients_mrn_key"');
    dbErr.code = '23505';

    const req = mockReq({ requestId: 'req-db-uniq' });
    const res = mockRes();

    errorHandler(dbErr, req, res, () => {});

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.match(res.body.error.message, /already exists/i);
    assert.equal(res.body.meta.requestId, 'req-db-uniq');
  });

  test('errorHandler maps PostgreSQL foreign_key_violation (23503) to 400 Bad Request', () => {
    const dbErr = new Error('insert or update on table "referrals" violates foreign key constraint');
    dbErr.code = '23503';

    const req = mockReq();
    const res = mockRes();

    errorHandler(dbErr, req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
    assert.match(res.body.error.message, /parent record does not exist/i);
  });

  test('errorHandler maps PostgreSQL check_violation (23514) to 400 Validation Error', () => {
    const dbErr = new Error('new row for relation "referrals" violates check constraint "referrals_priority_check"');
    dbErr.code = '23514';

    const req = mockReq();
    const res = mockRes();

    errorHandler(dbErr, req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.match(res.body.error.message, /constraint validation failed/i);
  });

  test('errorHandler maps PostgreSQL invalid syntax (22P02) to 400 Bad Request', () => {
    const dbErr = new Error('invalid input syntax for type uuid: "invalid-uuid"');
    dbErr.code = '22P02';

    const req = mockReq();
    const res = mockRes();

    errorHandler(dbErr, req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
    assert.match(res.body.error.message, /invalid identifier syntax/i);
  });

  test('errorHandler maps PostgreSQL statement_timeout (57014) to 504 Gateway Timeout', () => {
    const dbErr = new Error('canceling statement due to statement timeout');
    dbErr.code = '57014';

    const req = mockReq();
    const res = mockRes();

    errorHandler(dbErr, req, res, () => {});

    assert.equal(res.statusCode, 504);
    assert.equal(res.body.error.code, 'GATEWAY_TIMEOUT');
    assert.match(res.body.error.message, /timeout exceeded/i);
  });

  test('errorHandler maps malformed JSON payload parsing syntax errors to 400', () => {
    const jsonErr = new SyntaxError('Unexpected token } in JSON at position 12');
    jsonErr.status = 400;
    jsonErr.body = '{"malformed": }';

    const req = mockReq();
    const res = mockRes();

    errorHandler(jsonErr, req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
    assert.match(res.body.error.message, /Malformed JSON/i);
  });

  test('errorHandler maps Multer LIMIT_FILE_SIZE to 413 Payload Too Large', () => {
    const multerErr = new Error('File too large');
    multerErr.code = 'LIMIT_FILE_SIZE';

    const req = mockReq();
    const res = mockRes();

    errorHandler(multerErr, req, res, () => {});

    assert.equal(res.statusCode, 413);
    assert.equal(res.body.error.code, 'PAYLOAD_TOO_LARGE');
    assert.match(res.body.error.message, /exceeds the maximum allowed limit/i);
  });

  test('errorHandler sanitizes connection strings leaking database credentials', () => {
    const leakErr = new AppError('Failed connecting to postgres://user:secretpassword@db.example.com:5432/caredb', 500);
    const req = mockReq();
    const res = mockRes();

    errorHandler(leakErr, req, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.ok(!res.body.error.message.includes('secretpassword'));
    assert.match(res.body.error.message, /user:\*+@db\.example\.com/);
  });

  test('errorHandler conceals internal stack traces and details when NODE_ENV is production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const internalErr = new Error('Internal pointer explosion in worker thread');
      const req = mockReq();
      const res = mockRes();

      errorHandler(internalErr, req, res, () => {});

      assert.equal(res.statusCode, 500);
      assert.equal(res.body.error.code, 'INTERNAL_ERROR');
      assert.equal(res.body.error.message, 'An unexpected server error occurred');
      assert.equal(res.body.error.stack, undefined);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('redactSensitiveData recursively masks sensitive fields', () => {
    const rawData = {
      username: 'doctor_hanna',
      password: 'super-secret-password-123',
      credentials: {
        accessToken: 'jwt.token.here',
        refreshToken: 'refresh.token.here',
        apiKey: 'sec_key_xyz'
      },
      patientInfo: {
        name: 'Abebe Kebede',
        clinicalSummary: 'Patient presents with severe pulmonary edema',
        vitalSigns: { bp: '140/90', pulse: 98 }
      },
      headers: {
        authorization: 'Bearer secret_token',
        cookie: 'sessionId=abc12345'
      },
      metadata: {
        hospitalId: 'hosp-001',
        active: true,
        count: 5
      }
    };

    const redacted = redactSensitiveData(rawData);

    assert.equal(redacted.username, 'doctor_hanna');
    assert.equal(redacted.password, '[REDACTED]');
    assert.equal(redacted.credentials.accessToken, '[REDACTED]');
    assert.equal(redacted.credentials.refreshToken, '[REDACTED]');
    assert.equal(redacted.credentials.apiKey, '[REDACTED]');
    assert.equal(redacted.patientInfo.name, 'Abebe Kebede');
    assert.equal(redacted.patientInfo.clinicalSummary, '[REDACTED]');
    assert.equal(redacted.patientInfo.vitalSigns, '[REDACTED]');
    assert.equal(redacted.headers.authorization, '[REDACTED]');
    assert.equal(redacted.headers.cookie, '[REDACTED]');
    assert.equal(redacted.metadata.hospitalId, 'hosp-001');
    assert.equal(redacted.metadata.active, true);
    assert.equal(redacted.metadata.count, 5);
  });

  test('redactSensitiveData handles arrays and circular references safely', () => {
    const circularObj = { name: 'Item 1' };
    circularObj.self = circularObj;

    const list = [
      { id: 1, password: 'p1' },
      { id: 2, token: 't2' },
      circularObj
    ];

    const safeList = redactSensitiveData(list);
    assert.equal(safeList[0].password, '[REDACTED]');
    assert.equal(safeList[1].token, '[REDACTED]');
    assert.equal(safeList[2].self, '[CIRCULAR]');
  });
});
