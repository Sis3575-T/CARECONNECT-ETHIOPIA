/**
 * CareConnect Ethiopia - Background Jobs & Notification Monitoring Router
 * Administrative endpoints for telemetry, queue metrics, failed job management, and operational controls.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { jobMonitoringService } from '../../services/jobMonitoringService.js';
import { successResponse } from '../../utils/response.js';
import { HTTP_STATUS } from '../../constants/index.js';

const router = Router();

// Protect all job monitoring routes with System Administrator access
router.use(authenticate, requireRole(['SYSTEM_ADMINISTRATOR']));

/**
 * GET /api/v1/jobs/metrics
 * Aggregated metrics: job status counts, durations, outbox backlog, and notification delivery stats.
 */
router.get('/metrics', async (req, res, next) => {
  try {
    const metrics = await jobMonitoringService.getAllMetrics();
    return successResponse(res, metrics, 'Operational metrics retrieved successfully', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/jobs/failed
 * Inspect failed background jobs with error summaries and retry attempt counts.
 */
router.get('/failed', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * limit;

    const failedJobs = await jobMonitoringService.getFailedJobs({ limit, offset });
    return successResponse(res, { jobs: failedJobs }, 'Failed jobs retrieved successfully', HTTP_STATUS.OK, {
      pagination: { page, limit, count: failedJobs.length }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/jobs/outbox/backlog
 * Inspect pending transactional outbox events awaiting asynchronous publication.
 */
router.get('/outbox/backlog', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * limit;

    const backlog = await jobMonitoringService.getOutboxBacklog({ limit, offset });
    return successResponse(res, { events: backlog }, 'Outbox backlog retrieved successfully', HTTP_STATUS.OK, {
      pagination: { page, limit, count: backlog.length }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/jobs/:id/retry
 * Manual operator retry for failed or cancelled jobs.
 */
router.post('/:id/retry', async (req, res, next) => {
  try {
    const retriedJob = await jobMonitoringService.retryJob(req.params.id, req.user);
    return successResponse(res, { job: retriedJob }, 'Job queued for retry successfully', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/jobs/:id/cancel
 * Manual operator cancellation of pending or scheduled jobs.
 */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const reason = req.body?.reason || 'Cancelled by administrator via monitoring portal';
    const cancelledJob = await jobMonitoringService.cancelJob(req.params.id, reason, req.user);
    if (!cancelledJob) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: `Job ${req.params.id} not found or not in cancellable state`
      });
    }
    return successResponse(res, { job: cancelledJob }, 'Job cancelled successfully', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
});

export default router;
