/**
 * CareConnect Ethiopia - Part 11 Comprehensive Verification Test Suite
 * Fully verifies API Architecture, Centralized Validation, Standard Response Contracts,
 * Error Handling & Postgres Mapping, Request Tracing, Security & Middleware Policies,
 * OpenAPI Documentation, Reliability & Idempotency.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { app } from '../src/app.js';
import { request } from './testHelper.js';
import {
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
  commonSchemas
} from '../src/middleware/validate.js';
import {
  formatSuccess,
  formatPaginated,
  formatError,
  successResponse,
  paginatedResponse,
  errorResponse
} from '../src/utils/response.js';
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
import { corsOptions, allowedOrigins } from '../src/config/cors.js';
import { enforceContentType } from '../src/middleware/security.js';
import { createRateLimiter } from '../src/middleware/rateLimit.js';
import { createIdempotencyMiddleware } from '../src/middleware/idempotency.js';
import { openApiSpec } from '../src/routes/v1/docs.js';

describe('Part 11 Comprehensive Verification Suite: Backend API Architecture', () => {

  describe('1. Centralized Request Validation Architecture', () => {
    test('Validates multi-source payload across body, query, and params with coercion', (t, done) => {
      const schema = {
        params: {
          id: { type: 'uuid', required: true }
        },
        query: {
          page: { type: 'integer', default: 1, min: 1 },
          limit: { type: 'integer', default: 20, max: 100 },
          includeArchived: { type: 'boolean', default: false }
        },
        body: {
          title: { type: 'string', required: true, minLength: 3, trim: true },
          priority: { type: 'string', required: true, enum: ['ROUTINE', 'URGENT', 'EMERGENCY'] },
          contactEmail: { type: 'email', required: false }
        }
      };

      const validUuid = 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d';
      const req = {
        params: { id: validUuid },
        query: { page: '3', limit: '50', includeArchived: 'true' },
        body: {
          title: '  Urgent Cardiovascular Assessment  ',
          priority: 'URGENT',
          contactEmail: 'cardiologist@tikuranbessa.et'
        }
      };
      const res = {};

      validateRequest(schema)(req, res, (err) => {
        assert.ifError(err);
        assert.equal(req.params.id, validUuid);
        assert.equal(req.query.page, 3);
        assert.equal(req.query.limit, 50);
        assert.equal(req.query.includeArchived, true);
        assert.equal(req.body.title, 'Urgent Cardiovascular Assessment');
        assert.equal(req.body.priority, 'URGENT');
        done();
      });
    });

    test('Aggregates validation failures across all sources into a single 400 response', (t, done) => {
      const schema = {
        params: { id: { type: 'uuid', required: true } },
        query: { limit: { type: 'integer', max: 50 } },
        body: { title: { type: 'string', required: true } }
      };

      const req = {
        params: { id: 'not-a-uuid' },
        query: { limit: '999' },
        body: {}
      };
      const res = {};

      validateRequest(schema)(req, res, (err) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'VALIDATION_ERROR');
        assert.ok(Array.isArray(err.details));
        assert.ok(err.details.length >= 3);

        const sources = err.details.map(d => d.source);
        assert.ok(sources.includes('params'));
        assert.ok(sources.includes('query'));
        assert.ok(sources.includes('body'));
        done();
      });
    });
  });

  describe('2. Standardized API Response Contracts', () => {
    test('formatSuccess produces uniform envelope with metadata and requestId', () => {
      const payload = formatSuccess({ patientId: 'p-01' }, 'Patient retrieved', { cached: true }, 'req-test-999');
      assert.equal(payload.success, true);
      assert.equal(payload.message, 'Patient retrieved');
      assert.deepEqual(payload.data, { patientId: 'p-01' });
      assert.equal(payload.meta.requestId, 'req-test-999');
      assert.equal(payload.meta.cached, true);
      assert.ok(payload.meta.timestamp);
    });

    test('formatPaginated produces standard pagination schema with bounds', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const payload = formatPaginated(items, 2, 20, 45, 'Batch loaded', {}, 'req-page-123');

      assert.equal(payload.success, true);
      assert.deepEqual(payload.data, items);
      assert.equal(payload.meta.pagination.page, 2);
      assert.equal(payload.meta.pagination.limit, 20);
      assert.equal(payload.meta.pagination.total, 45);
      assert.equal(payload.meta.pagination.totalPages, 3);
      assert.equal(payload.meta.pagination.hasNext, true);
      assert.equal(payload.meta.pagination.hasPrev, true);
    });

    test('formatError preserves backward compatibility with top-level and meta requestId and error timestamp', () => {
      const errPayload = formatError('Invalid token', 'UNAUTHORIZED', null, 'req-err-456');
      assert.equal(errPayload.success, false);
      assert.equal(errPayload.message, 'Invalid token');
      assert.equal(errPayload.error.code, 'UNAUTHORIZED');
      assert.ok(errPayload.error.timestamp);
      assert.equal(errPayload.meta.requestId, 'req-err-456');
      assert.equal(errPayload.meta.timestamp, errPayload.error.timestamp);
      assert.equal(errPayload.requestId, 'req-err-456');
    });
  });

  describe('3. Error Handling & PostgreSQL Exception Mapping', () => {
    test('Maps PostgreSQL codes (23505, 23503, 23514, 22P02, 57014) accurately', () => {
      const mappings = [
        { code: '23505', expectedStatus: 409, expectedCode: 'CONFLICT' },
        { code: '23503', expectedStatus: 400, expectedCode: 'BAD_REQUEST' },
        { code: '23514', expectedStatus: 400, expectedCode: 'VALIDATION_ERROR' },
        { code: '22P02', expectedStatus: 400, expectedCode: 'BAD_REQUEST' },
        { code: '57014', expectedStatus: 504, expectedCode: 'GATEWAY_TIMEOUT' }
      ];

      for (const item of mappings) {
        const dbErr = new Error(`Simulated database code ${item.code}`);
        dbErr.code = item.code;

        let statusCode = 200;
        let responseBody = null;
        const res = {
          status(c) { statusCode = c; return this; },
          json(b) { responseBody = b; return this; },
          getHeader() { return 'req-db-test'; }
        };

        errorHandler(dbErr, { requestId: 'req-db-test' }, res, () => {});

        assert.equal(statusCode, item.expectedStatus);
        assert.equal(responseBody.error.code, item.expectedCode);
      }
    });

    test('Conceals internal stack traces in production mode', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const internalErr = new Error('Database pointer corruption error');
        let statusCode = 200;
        let responseBody = null;
        const res = {
          status(c) { statusCode = c; return this; },
          json(b) { responseBody = b; return this; }
        };

        errorHandler(internalErr, {}, res, () => {});

        assert.equal(statusCode, 500);
        assert.equal(responseBody.error.message, 'An unexpected server error occurred');
        assert.equal(responseBody.error.stack, undefined);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    test('Redacts sensitive healthcare PII and credentials in logging helper', () => {
      const rawPayload = {
        email: 'doc@moh.gov.et',
        password: 'TopSecretPassword#123',
        authorization: 'Bearer jwt_secret_token',
        clinicalSummary: 'Severe coronary disease diagnosed',
        vitalSigns: { bp: '150/95', hr: 110 }
      };

      const sanitized = redactSensitiveData(rawPayload);
      assert.equal(sanitized.email, 'doc@moh.gov.et');
      assert.equal(sanitized.password, '[REDACTED]');
      assert.equal(sanitized.authorization, '[REDACTED]');
      assert.equal(sanitized.clinicalSummary, '[REDACTED]');
      assert.equal(sanitized.vitalSigns, '[REDACTED]');
    });
  });

  describe('4. Security & Middleware Policies', () => {
    test('Allowed CORS origins include all 4 independent portal URLs in production and development', () => {
      const portalPorts = ['3000', '3001', '3002', '3003', '5173', '5174', '5175', '5176'];
      for (const port of portalPorts) {
        assert.ok(
          allowedOrigins.includes(`http://localhost:${port}`),
          `Origin http://localhost:${port} must be present in allowedOrigins`
        );
      }
    });

    test('Enforces Content-Type on mutating requests with payloads', async () => {
      const testApp = express();
      testApp.use(enforceContentType);
      testApp.post('/api/v1/mutating', (req, res) => res.json({ ok: true }));

      // Invalid Content-Type
      const resBad = await request(testApp).post(
        '/api/v1/mutating',
        'raw string data',
        { headers: { 'content-type': 'text/plain', 'content-length': '15' } }
      );
      assert.equal(resBad.status, 415);
      assert.equal(resBad.body.error.code, 'UNSUPPORTED_MEDIA_TYPE');

      // Valid application/json Content-Type
      const resOk = await request(testApp).post(
        '/api/v1/mutating',
        { valid: true },
        { headers: { 'content-type': 'application/json' } }
      );
      assert.equal(resOk.status, 200);
    });
  });

  describe('5. Reliability, Idempotency & Health Probes', () => {
    test('Idempotency middleware returns cached response with Idempotent-Replay header', async () => {
      const testApp = express();
      const idempotency = createIdempotencyMiddleware();
      let callCount = 0;

      testApp.use(express.json());
      testApp.use(idempotency);
      testApp.post('/api/v1/referral-create', (req, res) => {
        callCount += 1;
        res.status(201).json({ referralId: 'ref-007', callCount });
      });

      const key = 'idem-part11-test-key-abc';

      const res1 = await request(testApp).post(
        '/api/v1/referral-create',
        { priority: 'EMERGENCY' },
        { headers: { 'idempotency-key': key } }
      );
      assert.equal(res1.status, 201);
      assert.equal(res1.body.callCount, 1);

      const res2 = await request(testApp).post(
        '/api/v1/referral-create',
        { priority: 'EMERGENCY' },
        { headers: { 'idempotency-key': key } }
      );
      assert.equal(res2.status, 201);
      assert.equal(res2.body.callCount, 1);
      assert.equal(res2.headers['idempotent-replay'], 'true');
      assert.equal(callCount, 1);
    });

    test('Health probes verify container readiness, liveness, and memory diagnostics', async () => {
      const liveRes = await request(app).get('/health/live');
      assert.equal(liveRes.status, 200);
      assert.equal(liveRes.body.status, 'ALIVE');

      const fullRes = await request(app).get('/api/v1/health');
      assert.ok([200, 503].includes(fullRes.status));
      assert.ok(['HEALTHY', 'DEGRADED'].includes(fullRes.body.status));
      assert.equal(fullRes.body.service, 'careconnect-backend-api');
      assert.ok(fullRes.body.checks.database);
      assert.ok(fullRes.body.checks.memory);
    });
  });

  describe('6. OpenAPI 3.0.3 Specification Completeness', () => {
    test('OpenAPI spec documents all core domains, tags, and security definitions', async () => {
      const res = await request(app).get('/api/v1/docs');
      assert.equal(res.status, 200);
      assert.equal(res.body.openapi, '3.0.3');

      // Security schemes
      const sec = res.body.components.securitySchemes;
      assert.ok(sec.BearerAuth);
      assert.ok(sec.CookieAuth);
      assert.ok(sec.FacilityHeader);

      // Core Schemas
      const schemas = res.body.components.schemas;
      assert.ok(schemas.SuccessEnvelope);
      assert.ok(schemas.PaginatedEnvelope);
      assert.ok(schemas.ErrorEnvelope);
      assert.ok(schemas.PaginationMeta);
      assert.ok(schemas.HealthCheckResponse);
      assert.ok(schemas.LoginRequest);
      assert.ok(schemas.RegisterRequest);
      assert.ok(schemas.UserSummary);
      assert.ok(schemas.FacilitySummary);
      assert.ok(schemas.PatientSummary);
      assert.ok(schemas.ReferralSummary);
      assert.ok(schemas.DocumentMetadata);
      assert.ok(schemas.AuditLogEntry);

      // Paths
      const paths = res.body.paths;
      assert.ok(paths['/health']);
      assert.ok(paths['/auth/login']);
      assert.ok(paths['/auth/register']);
      assert.ok(paths['/auth/refresh']);
      assert.ok(paths['/auth/logout']);
      assert.ok(paths['/users']);
      assert.ok(paths['/facilities']);
      assert.ok(paths['/patients']);
      assert.ok(paths['/referrals']);
      assert.ok(paths['/referrals/{referralId}/timeline']);
      assert.ok(paths['/documents']);
      assert.ok(paths['/audit/logs']);
      assert.ok(paths['/transport/requests']);
      assert.ok(paths['/ai/recommend']);
    });
  });

  describe('7. End-to-End Application Pipeline Flow', () => {
    test('GET / returns system root descriptor with documentation link and X-Request-Id', async () => {
      const res = await request(app).get('/');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'online');
      assert.equal(res.body.documentation, '/api/v1/docs');
      assert.ok(res.headers['x-request-id']);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
    });

    test('GET /api/v1 returns API directory with all module links', async () => {
      const res = await request(app).get('/api/v1');
      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'CareConnect Ethiopia REST API v1');
      assert.equal(res.body.version, 'v1');
      assert.ok(res.body.endpoints.auth);
      assert.ok(res.body.endpoints.referrals);
      assert.ok(res.body.endpoints.documents);
      assert.ok(res.body.endpoints.docs);
    });

    test('Unmatched endpoint returns standardized 404 error envelope', async () => {
      const res = await request(app).get('/api/v1/unmatched-route-xyz');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'NOT_FOUND');
      assert.ok(res.body.error.timestamp);
      assert.ok(res.body.meta.requestId);
      assert.ok(res.body.requestId);
    });
  });
});
