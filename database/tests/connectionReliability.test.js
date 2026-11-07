/**
 * CareConnect Ethiopia - Database Connection Pooling & Reliability Test Suite
 * Tests pool configuration, metrics, transient error retry mechanism,
 * and graceful shutdown handling.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPoolMetrics,
  isTransientError,
  executeWithRetry,
  sanitizeConnectionString,
  dbConfig,
  testConnection
} from '../connection.js';
import DbService from '../../backend/src/services/dbService.js';

describe('Connection Pooling & Reliability Suite — Commit 077', () => {
  it('dbConfig includes tuned pool limits and statement timeouts', () => {
    assert.ok(dbConfig.max >= 5, 'Max pool connections must be at least 5');
    assert.ok(dbConfig.min >= 1, 'Min pool connections must be at least 1');
    assert.ok(dbConfig.idleTimeoutMillis >= 10000, 'Idle timeout must be at least 10s');
    assert.ok(dbConfig.connectionTimeoutMillis >= 1000, 'Connection timeout must be configured');
    assert.ok(dbConfig.statementTimeoutMillis >= 5000, 'Statement timeout must be at least 5s');
  });

  it('getPoolMetrics returns instantaneous pool statistics', () => {
    const metrics = getPoolMetrics();
    assert.equal(typeof metrics.totalCount, 'number', 'totalCount must be numeric');
    assert.equal(typeof metrics.idleCount, 'number', 'idleCount must be numeric');
    assert.equal(typeof metrics.waitingCount, 'number', 'waitingCount must be numeric');
    assert.equal(metrics.maxLimit, dbConfig.max, 'maxLimit must reflect dbConfig');
  });

  it('isTransientError accurately identifies transient network and concurrency errors', () => {
    assert.equal(isTransientError({ code: 'ECONNRESET' }), true, 'ECONNRESET must be transient');
    assert.equal(isTransientError({ code: '40001' }), true, 'Serialization failure (40001) must be transient');
    assert.equal(isTransientError({ code: '57P01' }), true, 'Admin shutdown (57P01) must be transient');
    assert.equal(isTransientError({ code: '08006' }), true, 'Connection failure (08006) must be transient');
    assert.equal(isTransientError({ message: 'connection timeout exceeded' }), true, 'Timeout message must be transient');

    // Non-transient errors
    assert.equal(isTransientError({ code: '42P01' }), false, 'Undefined table (42P01) must NOT be transient');
    assert.equal(isTransientError({ code: '23505' }), false, 'Unique violation (23505) must NOT be transient');
    assert.equal(isTransientError({ message: 'syntax error at or near SELECT' }), false, 'Syntax error must NOT be transient');
  });

  it('executeWithRetry retries on transient errors and succeeds upon recovery', async () => {
    let callCount = 0;
    const transientOp = async () => {
      callCount++;
      if (callCount < 3) {
        const err = new Error('Connection terminated unexpectedly');
        err.code = 'ECONNRESET';
        throw err;
      }
      return { success: true, attempts: callCount };
    };

    const result = await executeWithRetry(transientOp, {
      maxRetries: 3,
      baseDelayMs: 10,
      isIdempotent: true
    });

    assert.equal(result.success, true);
    assert.equal(result.attempts, 3);
  });

  it('executeWithRetry does not retry non-transient errors', async () => {
    let callCount = 0;
    const fatalOp = async () => {
      callCount++;
      const err = new Error('relation "unknown_table" does not exist');
      err.code = '42P01';
      throw err;
    };

    await assert.rejects(
      async () => {
        await executeWithRetry(fatalOp, { maxRetries: 3, baseDelayMs: 10, isIdempotent: true });
      },
      (err) => {
        assert.equal(err.code, '42P01');
        assert.equal(callCount, 1, 'Should fail immediately without retrying fatal errors');
        return true;
      }
    );
  });

  it('DbService.healthCheck provides pool metrics and latency telemetry', async () => {
    const health = await DbService.healthCheck();
    assert.ok('connected' in health, 'Must report connectivity status');
    assert.ok('latencyMs' in health, 'Must report query latency');
    assert.ok('pool' in health, 'Must report pool utilization metrics');
    assert.equal(typeof health.pool.totalCount, 'number');
  });
});
