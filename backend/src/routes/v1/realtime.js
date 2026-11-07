/**
 * CareConnect Ethiopia - Real-Time API Routes
 * Exposes missed-event recovery endpoints and real-time health diagnostics.
 */

import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { eventRecoveryService } from '../../realtime/eventRecoveryService.js';
import { connectionRegistry } from '../../realtime/connectionRegistry.js';
import { subscriptionManager } from '../../realtime/subscriptionManager.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();

/**
 * GET /api/v1/realtime/health
 * Public health probe for real-time WebSocket subsystem
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeConnections: connectionRegistry.count(),
    authenticatedConnections: connectionRegistry.authenticatedCount(),
    subscriptionMetrics: subscriptionManager.getMetrics(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/v1/realtime/missed-events
 * Recovers missed real-time events for authenticated clients with strict tenancy filtering
 */
router.get(
  '/missed-events',
  authenticate,
  asyncHandler(async (req, res) => {
    const { since, lastEventId, limit } = req.query;

    const result = await eventRecoveryService.recoverMissedEvents(req.user, {
      since,
      lastEventId,
      limit
    });

    res.json({
      status: 'success',
      data: result
    });
  })
);

export default router;
