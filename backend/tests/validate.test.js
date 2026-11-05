import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { validate } from '../src/middleware/validate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { request } from './testHelper.js';

test('Request Validation Middleware Suite', async (t) => {
  const testApp = express();
  testApp.use(express.json());

  const testSchema = {
    email: { required: true, type: 'email' },
    age: { required: true, type: 'number', min: 0, max: 130 },
    priority: { required: true, enum: ['ROUTINE', 'URGENT', 'EMERGENCY'] }
  };

  testApp.post('/test-validate', validate(testSchema), (req, res) => {
    res.json({ success: true, data: req.body });
  });

  testApp.use(errorHandler);

  await t.test('Rejects invalid payload with 400 and detailed field errors', async () => {
    const res = await request(testApp).post('/test-validate', {
      email: 'invalid-email-string',
      age: -5,
      priority: 'INVALID_PRIORITY'
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.error.details));
    assert.equal(res.body.error.details.length, 3);
  });

  await t.test('Accepts valid payload with 200 and sanitized types', async () => {
    const res = await request(testApp).post('/test-validate', {
      email: 'officer@healthcentre.et',
      age: '35',
      priority: 'URGENT'
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.age, 35); // converted string to number
    assert.equal(res.body.data.priority, 'URGENT');
  });
});
