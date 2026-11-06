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

// 1. SLA Response Policies
router.post('/policies', authenticate, createPolicy);
router.get('/policies', authenticate, listPolicies);
router.delete('/policies/:policyId', authenticate, deactivatePolicy);
router.post('/referral-policies', authenticate, createPolicy);
router.get('/referral-policies', authenticate, listPolicies);
router.delete('/referral-policies/:policyId', authenticate, deactivatePolicy);

// 2. Operational Escalations
router.get('/escalations', authenticate, listEscalations);
router.post('/escalations', authenticate, createEscalation);
router.post('/escalations/:escalationId/resolve', authenticate, resolveEscalation);

// 3. Operational Exceptions
router.get('/exceptions', authenticate, listExceptions);
router.post('/exceptions/:exceptionId/resolve', authenticate, resolveException);
router.get('/referral-exceptions', authenticate, listExceptions);
router.post('/referral-exceptions/:exceptionId/resolve', authenticate, resolveException);

export default router;
