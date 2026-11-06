/**
 * CareConnect Ethiopia - API v1 Master Router
 * Aggregates all modular v1 endpoint routers.
 */

import { Router } from 'express';
import healthRouter from './health.js';
import docsRouter from './docs.js';
import authRouter from './auth.js';
import usersRouter from './users.js';
import facilitiesRouter from './facilities.js';
import rolesRouter from './roles.js';
import auditRouter from './audit.js';
import patientsRouter from './patients.js';

const router = Router();

// Sub-routers
router.use('/health', healthRouter);
router.use('/docs', docsRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/facilities', facilitiesRouter);
router.use('/roles', rolesRouter);
router.use('/audit', auditRouter);
router.use('/patients', patientsRouter);

// v1 Root Information
router.get('/', (req, res) => {
  res.json({
    version: 'v1',
    name: 'CareConnect Ethiopia REST API v1',
    description: 'National smart healthcare referral and patient coordination service',
    endpoints: {
      health: '/api/v1/health',
      docs: '/api/v1/docs',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      facilities: '/api/v1/facilities',
      patients: '/api/v1/patients',
      referrals: '/api/v1/referrals',
      transport: '/api/v1/transport',
      notifications: '/api/v1/notifications',
      analytics: '/api/v1/analytics',
      ai: '/api/v1/ai'
    }
  });
});

export default router;
