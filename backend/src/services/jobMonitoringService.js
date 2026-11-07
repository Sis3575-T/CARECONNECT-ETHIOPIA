/**
 * CareConnect Ethiopia - Job, Outbox & Notification Monitoring Service
 * Aggregates operational telemetry, queue backlog depths, error rates, and administrative actions.
 */

import { DbService } from './dbService.js';
import { jobQueueService } from './jobQueueService.js';
import { outboxService } from './outboxService.js';
import { notificationDeliveryService } from './notificationDeliveryService.js';
import { JOB_STATUS, OUTBOX_STATUS, DELIVERY_STATUS } from '../constants/jobs.js';

export class JobMonitoringService {
  /**
   * Retrieves aggregated background job metrics
   */
  async getJobMetrics() {
    try {
      const sql = `
        SELECT 
          status,
          COUNT(*)::int as count,
          AVG(execution_duration_ms)::int as avg_duration_ms,
          MIN(created_at) as oldest_created_at
        FROM background_jobs
        GROUP BY status;
      `;
      const res = await DbService.query(sql);
      const metrics = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        scheduled: 0,
        total: 0,
        avgDurationMs: 0,
        oldestPendingAgeSeconds: 0
      };

      for (const row of res.rows) {
        const key = row.status.toLowerCase();
        if (metrics[key] !== undefined) {
          metrics[key] = row.count;
        }
        metrics.total += row.count;
        if (row.avg_duration_ms) {
          metrics.avgDurationMs = row.avg_duration_ms;
        }
        if (row.status === 'PENDING' && row.oldest_created_at) {
          const age = Math.round((Date.now() - new Date(row.oldest_created_at).getTime()) / 1000);
          metrics.oldestPendingAgeSeconds = Math.max(0, age);
        }
      }
      return metrics;
    } catch {
      // In-memory fallback
      const metrics = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        scheduled: 0,
        total: 0,
        avgDurationMs: 0,
        oldestPendingAgeSeconds: 0
      };

      let totalDuration = 0;
      let completedCount = 0;
      let oldestPendingTime = null;

      for (const job of jobQueueService.inMemoryStore.values()) {
        const key = job.status.toLowerCase();
        if (metrics[key] !== undefined) {
          metrics[key] += 1;
        }
        metrics.total += 1;

        if (job.status === JOB_STATUS.COMPLETED && job.execution_duration_ms) {
          totalDuration += job.execution_duration_ms;
          completedCount += 1;
        }
        if (job.status === JOB_STATUS.PENDING) {
          const created = new Date(job.created_at).getTime();
          if (!oldestPendingTime || created < oldestPendingTime) {
            oldestPendingTime = created;
          }
        }
      }

      if (completedCount > 0) {
        metrics.avgDurationMs = Math.round(totalDuration / completedCount);
      }
      if (oldestPendingTime) {
        metrics.oldestPendingAgeSeconds = Math.max(0, Math.round((Date.now() - oldestPendingTime) / 1000));
      }

      return metrics;
    }
  }

  /**
   * Retrieves transactional outbox backlog metrics
   */
  async getOutboxMetrics() {
    try {
      const sql = `
        SELECT 
          status,
          COUNT(*)::int as count,
          MIN(created_at) as oldest_pending
        FROM outbox_events
        GROUP BY status;
      `;
      const res = await DbService.query(sql);
      const metrics = {
        pending: 0,
        processing: 0,
        published: 0,
        failed: 0,
        total: 0,
        backlogAgeSeconds: 0
      };

      for (const row of res.rows) {
        const key = row.status.toLowerCase();
        if (metrics[key] !== undefined) {
          metrics[key] = row.count;
        }
        metrics.total += row.count;
        if (row.status === 'PENDING' && row.oldest_pending) {
          metrics.backlogAgeSeconds = Math.max(0, Math.round((Date.now() - new Date(row.oldest_pending).getTime()) / 1000));
        }
      }
      return metrics;
    } catch {
      // In-memory fallback
      const metrics = {
        pending: 0,
        processing: 0,
        published: 0,
        failed: 0,
        total: 0,
        backlogAgeSeconds: 0
      };

      let oldestPendingTime = null;
      for (const ev of outboxService.inMemoryStore.values()) {
        const key = ev.status.toLowerCase();
        if (metrics[key] !== undefined) metrics[key] += 1;
        metrics.total += 1;

        if (ev.status === OUTBOX_STATUS.PENDING) {
          const created = new Date(ev.created_at).getTime();
          if (!oldestPendingTime || created < oldestPendingTime) {
            oldestPendingTime = created;
          }
        }
      }

      if (oldestPendingTime) {
        metrics.backlogAgeSeconds = Math.max(0, Math.round((Date.now() - oldestPendingTime) / 1000));
      }

      return metrics;
    }
  }

  /**
   * Retrieves notification delivery metrics
   */
  async getNotificationMetrics() {
    try {
      const sql = `
        SELECT 
          channel,
          status,
          COUNT(*)::int as count
        FROM notification_deliveries
        GROUP BY channel, status;
      `;
      const res = await DbService.query(sql);
      const metrics = {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        byChannel: {
          IN_APP: { total: 0, sent: 0, failed: 0 },
          SMS: { total: 0, sent: 0, failed: 0 },
          EMAIL: { total: 0, sent: 0, failed: 0 }
        }
      };

      for (const row of res.rows) {
        const channel = row.channel;
        const status = row.status.toLowerCase();
        if (metrics.byChannel[channel]) {
          metrics.byChannel[channel].total += row.count;
          if (metrics.byChannel[channel][status] !== undefined) {
            metrics.byChannel[channel][status] += row.count;
          }
        }
        metrics.total += row.count;
        if (metrics[status] !== undefined) {
          metrics[status] += row.count;
        }
      }
      return metrics;
    } catch {
      // In-memory fallback
      const metrics = {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        byChannel: {
          IN_APP: { total: 0, sent: 0, failed: 0 },
          SMS: { total: 0, sent: 0, failed: 0 },
          EMAIL: { total: 0, sent: 0, failed: 0 }
        }
      };

      for (const d of notificationDeliveryService.inMemoryDeliveries.values()) {
        const channel = d.channel;
        const status = d.status.toLowerCase();
        if (metrics.byChannel[channel]) {
          metrics.byChannel[channel].total += 1;
          if (metrics.byChannel[channel][status] !== undefined) {
            metrics.byChannel[channel][status] += 1;
          }
        }
        metrics.total += 1;
        if (metrics[status] !== undefined) {
          metrics[status] += 1;
        }
      }
      return metrics;
    }
  }

  /**
   * Operator action: manually retries a failed or cancelled job
   * @param {string} jobId
   * @param {object} authorizedUser
   */
  async retryJob(jobId, authorizedUser = {}) {
    const job = await jobQueueService.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== JOB_STATUS.FAILED && job.status !== JOB_STATUS.CANCELLED) {
      throw new Error(`Only FAILED or CANCELLED jobs can be retried (current: ${job.status})`);
    }

    const now = new Date().toISOString();
    const newMaxAttempts = Math.max(job.maxAttempts + 2, (job.attempts || 0) + 2);

    try {
      const sql = `
        UPDATE background_jobs
        SET status = 'PENDING',
            max_attempts = $1,
            scheduled_at = $2,
            next_retry_at = NULL,
            error_summary = COALESCE(error_summary, '') || ' [Manually retried by admin]',
            updated_at = $2
        WHERE id = $3
        RETURNING *;
      `;
      const res = await DbService.query(sql, [newMaxAttempts, now, jobId]);
      return jobQueueService._formatJob(res.rows[0]);
    } catch {
      const mem = jobQueueService.inMemoryStore.get(jobId);
      if (mem) {
        mem.status = JOB_STATUS.PENDING;
        mem.max_attempts = newMaxAttempts;
        mem.scheduled_at = now;
        mem.next_retry_at = null;
        mem.error_summary = `${mem.error_summary || ''} [Manually retried by admin]`.trim();
        mem.updated_at = now;
        return jobQueueService._formatJob(mem);
      }
      return null;
    }
  }

  /**
   * Operator action: cancels a pending or scheduled job
   */
  async cancelJob(jobId, reason = 'Cancelled by administrator', authorizedUser = {}) {
    return await jobQueueService.cancelJob(jobId, reason);
  }

  /**
   * Retrieves failed jobs for operator inspection
   */
  async getFailedJobs({ limit = 50, offset = 0 } = {}) {
    try {
      const sql = `
        SELECT * FROM background_jobs
        WHERE status = 'FAILED'
        ORDER BY updated_at DESC
        LIMIT $1 OFFSET $2;
      `;
      const res = await DbService.query(sql, [limit, offset]);
      return res.rows.map(r => jobQueueService._formatJob(r));
    } catch {
      const failed = Array.from(jobQueueService.inMemoryStore.values())
        .filter(j => j.status === JOB_STATUS.FAILED)
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(offset, offset + limit)
        .map(j => jobQueueService._formatJob(j));
      return failed;
    }
  }

  /**
   * Retrieves pending outbox events backlog
   */
  async getOutboxBacklog({ limit = 50, offset = 0 } = {}) {
    try {
      const sql = `
        SELECT * FROM outbox_events
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT $1 OFFSET $2;
      `;
      const res = await DbService.query(sql, [limit, offset]);
      return res.rows.map(r => outboxService._formatEvent(r));
    } catch {
      const pending = Array.from(outboxService.inMemoryStore.values())
        .filter(e => e.status === OUTBOX_STATUS.PENDING)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .slice(offset, offset + limit)
        .map(e => outboxService._formatEvent(e));
      return pending;
    }
  }

  /**
   * Aggregates all operational metrics in one call
   */
  async getAllMetrics() {
    const [jobs, outbox, notifications] = await Promise.all([
      this.getJobMetrics(),
      this.getOutboxMetrics(),
      this.getNotificationMetrics()
    ]);
    return {
      jobs,
      outbox,
      notifications,
      timestamp: new Date().toISOString()
    };
  }
}

export const jobMonitoringService = new JobMonitoringService();
export default jobMonitoringService;
