/**
 * CareConnect Ethiopia - System Health & Readiness Endpoints
 */

import { Router } from 'express';
import { DbService } from '../../services/dbService.js';
import config from '../../config/env.js';
import { sanitizeConnectionString } from '../../config/database.js';

const router = Router();

// Full System Diagnostics
router.get('/', async (req, res) => {
  const dbHealth = await DbService.healthCheck();
  const memory = process.memoryUsage();

  const isHealthy = dbHealth.connected;
  const statusCode = isHealthy ? 200 : 503;
  const sanitizedError = dbHealth.error ? sanitizeConnectionString(dbHealth.error) : null;

  res.status(statusCode).json({
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    service: 'careconnect-backend-api',
    version: '1.0.0',
    environment: config.env,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: dbHealth.connected ? 'UP' : 'DOWN',
        latencyMs: dbHealth.latencyMs || 0,
        details: dbHealth.connected ? { database: dbHealth.database } : { error: sanitizedError }
      },
      memory: {
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        rssMb: Math.round(memory.rss / 1024 / 1024)
      }
    },
    ...(req.requestId ? { requestId: req.requestId } : {})
  });
});

// Container Liveness Probe (Returns 200 if process is running)
router.get(['/liveness', '/live'], (req, res) => {
  res.status(200).json({ status: 'ALIVE', timestamp: new Date().toISOString() });
});

// Container Readiness Probe (Returns 200 if database and dependencies ready)
router.get(['/readiness', '/ready'], async (req, res) => {
  const dbHealth = await DbService.healthCheck();
  if (dbHealth.connected) {
    return res.status(200).json({ status: 'READY', database: 'CONNECTED' });
  }
  const sanitizedError = dbHealth.error ? sanitizeConnectionString(dbHealth.error) : 'Database unreachable';
  return res.status(503).json({ status: 'NOT_READY', database: 'DISCONNECTED', error: sanitizedError });
});

export default router;

