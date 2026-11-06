/**
 * CareConnect Ethiopia - Referral Coordination Master Router
 * Mounts operational SLA policies, escalation queues, and exception tracking endpoints.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  createPolicy,
  listPolicies,
  deactivatePolicy,
  createEscalation,
  resolveEscalation,
  listEscalations,
  listExceptions,
  resolveException
} from '../../controllers/coordinationController.js';

const router = Router();

// All operational coordination endpoints require authentication
router.use(authenticate);

// 1. SLA Response Policies
router.post('/policies', createPolicy);
router.get('/policies', listPolicies);
router.delete('/policies/:policyId', deactivatePolicy);
router.post('/referral-policies', createPolicy);
router.get('/referral-policies', listPolicies);
router.delete('/referral-policies/:policyId', deactivatePolicy);

// 2. Operational Escalations
router.get('/escalations', listEscalations);
router.post('/escalations', createEscalation);
router.post('/escalations/:escalationId/resolve', resolveEscalation);

// 3. Operational Exceptions
router.get('/exceptions', listExceptions);
router.post('/exceptions/:exceptionId/resolve', resolveException);
router.get('/referral-exceptions', listExceptions);
router.post('/referral-exceptions/:exceptionId/resolve', resolveException);

export default router;
