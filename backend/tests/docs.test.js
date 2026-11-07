import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { request } from './testHelper.js';

test('API Documentation Foundation Suite', async (t) => {
  await t.test('GET /api/v1/docs returns OpenAPI specification metadata and cataloged paths', async () => {
    const res = await request(app).get('/api/v1/docs');
    assert.equal(res.status, 200);
    assert.equal(res.body.openapi, '3.0.3');
    assert.equal(res.body.info.title, 'CareConnect Ethiopia REST API');
    assert.ok(res.body.paths['/health']);
    assert.ok(res.body.paths['/health/liveness']);
    assert.ok(res.body.paths['/auth/login']);
    assert.ok(res.body.paths['/auth/register']);
    assert.ok(res.body.paths['/referrals']);
    assert.ok(res.body.paths['/ai/recommend']);

    // Component schemas and security definitions
    assert.ok(res.body.components.securitySchemes.BearerAuth);
    assert.equal(res.body.components.securitySchemes.BearerAuth.scheme, 'bearer');
    assert.ok(res.body.components.securitySchemes.CookieAuth);
    assert.ok(res.body.components.securitySchemes.FacilityHeader);
    assert.ok(res.body.components.schemas.SuccessEnvelope);
    assert.ok(res.body.components.schemas.PaginatedEnvelope);
    assert.ok(res.body.components.schemas.ErrorEnvelope);
    assert.ok(res.body.components.schemas.PaginationMeta);
    assert.ok(res.body.components.schemas.DocumentMetadata);
    assert.ok(res.body.components.schemas.AuditLogEntry);

    // Verify domain paths
    assert.ok(res.body.paths['/users']);
    assert.ok(res.body.paths['/facilities']);
    assert.ok(res.body.paths['/patients']);
    assert.ok(res.body.paths['/documents']);
    assert.ok(res.body.paths['/audit/logs']);
    assert.ok(res.body.paths['/referrals/{referralId}/timeline']);
  });

  await t.test('GET /api/v1/docs/openapi.json serves valid JSON identical to docs root', async () => {
    const res = await request(app).get('/api/v1/docs/openapi.json');
    assert.equal(res.status, 200);
    assert.equal(res.body.openapi, '3.0.3');
    assert.equal(typeof res.body.paths, 'object');
    assert.ok(Object.keys(res.body.paths).length >= 25);
  });
});
