/**
 * CareConnect Ethiopia - Reliable Background Job Worker
 * Handles safe row-level job claiming (FOR UPDATE SKIP LOCKED),
 * concurrency management, exponential backoff retries, and crash recovery.
 */

import crypto from 'crypto';
import { DbService } from './dbService.js';
import { jobRegistry } from './jobRegistry.js';
import { jobQueueService } from './jobQueueService.js';
import { JOB_STATUS, JOB_PRIORITY } from '../constants/jobs.js';

export class JobWorker {
  constructor(options = {}) {
    this.workerId = options.workerId || `worker-${crypto.randomBytes(4).toString('hex')}`;
    this.concurrency = Number(options.concurrency) || 3;
    this.pollIntervalMs = Number(options.pollIntervalMs) || 1000;
    this.staleThresholdMs = Number(options.staleThresholdMs) || 5 * 60 * 1000; // 5 minutes
    this.baseRetryDelayMs = Number(options.baseRetryDelayMs) || 1000; // 1 second
    this.maxRetryDelayMs = Number(options.maxRetryDelayMs) || 60 * 1000; // 1 minute

    this.isRunning = false;
    this.inFlightCount = 0;
    this.pollTimer = null;
    this.staleSweeperTimer = null;
    this.activeJobPromises = new Set();
  }

  /**
   * Starts the background worker polling loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Start poll loop
    const scheduleNextPoll = () => {
      if (!this.isRunning) return;
      this.pollTimer = setTimeout(async () => {
        try {
          await this.tick();
        } catch {
          // Worker tick resilience
        } finally {
          scheduleNextPoll();
        }
      }, this.pollIntervalMs);

      if (this.pollTimer.unref) {
        this.pollTimer.unref();
      }
    };

    scheduleNextPoll();

    // Start periodic stale job sweeper (every 2 minutes)
    this.staleSweeperTimer = setInterval(() => {
      this.recoverAbandonedJobs().catch(() => {});
    }, Math.min(this.staleThresholdMs, 2 * 60 * 1000));

    if (this.staleSweeperTimer.unref) {
      this.staleSweeperTimer.unref();
    }
  }

  /**
   * Gracefully shuts down the worker
   */
  async stop(timeoutMs = 5000) {
    this.isRunning = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.staleSweeperTimer) clearInterval(this.staleSweeperTimer);

    // Wait for in-flight tasks up to timeout
    const waitPromise = Promise.all(Array.from(this.activeJobPromises));
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));
    await Promise.race([waitPromise, timeoutPromise]);
  }

  /**
   * Executes a single worker poll cycle
   */
  async tick() {
    if (!this.isRunning) return;
    const availableSlots = this.concurrency - this.inFlightCount;
    if (availableSlots <= 0) return;

    const claimedJobs = await this.claimJobs(availableSlots);
    for (const job of claimedJobs) {
      this.inFlightCount += 1;
      const jobPromise = this.processJob(job)
        .catch(() => {})
        .finally(() => {
          this.inFlightCount = Math.max(0, this.inFlightCount - 1);
          this.activeJobPromises.delete(jobPromise);
        });

      this.activeJobPromises.add(jobPromise);
    }
  }

  /**
   * Safely claims jobs using PostgreSQL FOR UPDATE SKIP LOCKED
   * @param {number} limit
   * @returns {Promise<object[]>}
   */
  async claimJobs(limit = 1) {
    const now = new Date();
    try {
      const sql = `
        WITH claimed AS (
          SELECT id FROM background_jobs
          WHERE status IN ('PENDING', 'SCHEDULED')
            AND scheduled_at <= $1
          ORDER BY 
            CASE priority 
              WHEN 'CRITICAL' THEN 4 
              WHEN 'HIGH' THEN 3 
              WHEN 'NORMAL' THEN 2 
              ELSE 1 
            END DESC,
            scheduled_at ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE background_jobs
        SET status = 'PROCESSING',
            locked_by = $3,
            locked_at = $1,
            started_at = COALESCE(started_at, $1),
            attempts = attempts + 1,
            updated_at = $1
        WHERE id IN (SELECT id FROM claimed)
        RETURNING *;
      `;
      const res = await DbService.query(sql, [now.toISOString(), limit, this.workerId]);
      if (res.rows && res.rows.length > 0) {
        return res.rows.map(r => jobQueueService._formatJob(r));
      }
      return [];
    } catch {
      // In-memory fallback claiming
      return this._claimInMemory(limit, now);
    }
  }

  _claimInMemory(limit, now) {
    const eligible = [];
    for (const job of jobQueueService.inMemoryStore.values()) {
      if ((job.status === JOB_STATUS.PENDING || job.status === JOB_STATUS.SCHEDULED) &&
          new Date(job.scheduled_at).getTime() <= now.getTime()) {
        eligible.push(job);
      }
    }

    // Sort by priority desc, scheduled_at asc
    const priorityWeight = { CRITICAL: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
    eligible.sort((a, b) => {
      const weightDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      if (weightDiff !== 0) return weightDiff;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });

    const claimed = eligible.slice(0, limit);
    for (const job of claimed) {
      job.status = JOB_STATUS.PROCESSING;
      job.locked_by = this.workerId;
      job.locked_at = now.toISOString();
      job.started_at = job.started_at || now.toISOString();
      job.attempts = (job.attempts || 0) + 1;
      job.updated_at = now.toISOString();
    }

    return claimed.map(j => jobQueueService._formatJob(j));
  }

  /**
   * Executes a claimed job using registered handler
   * @param {object} job
   */
  async processJob(job) {
    const handler = jobRegistry.get(job.jobType);
    const start = Date.now();

    if (!handler) {
      const err = new Error(`No registered handler for job type '${job.jobType}'`);
      err.isPermanent = true;
      return this.handleJobFailure(job, err, 0);
    }

    try {
      const result = await handler(job, { workerId: this.workerId });
      const durationMs = Date.now() - start;
      await this.markJobCompleted(job.id, durationMs, result);
    } catch (err) {
      const durationMs = Date.now() - start;
      await this.handleJobFailure(job, err, durationMs);
    }
  }

  /**
   * Marks a job as successfully completed
   */
  async markJobCompleted(jobId, durationMs, result = null) {
    const now = new Date().toISOString();
    try {
      const sql = `
        UPDATE background_jobs
        SET status = 'COMPLETED',
            completed_at = $1,
            locked_by = NULL,
            locked_at = NULL,
            execution_duration_ms = $2,
            updated_at = $1
        WHERE id = $3
        RETURNING *;
      `;
      await DbService.query(sql, [now, durationMs, jobId]);
    } catch {
      // In-memory fallback
      const mem = jobQueueService.inMemoryStore.get(jobId);
      if (mem) {
        mem.status = JOB_STATUS.COMPLETED;
        mem.completed_at = now;
        mem.locked_by = null;
        mem.locked_at = null;
        mem.execution_duration_ms = durationMs;
        mem.updated_at = now;
      }
    }
  }

  /**
   * Evaluates retry policy and updates job status to PENDING/SCHEDULED or FAILED
   */
  async handleJobFailure(job, error, durationMs = 0) {
    const now = new Date();
    const attempts = job.attempts || 1;
    const maxAttempts = job.maxAttempts || 5;
    const isPermanent = Boolean(error?.isPermanent || error?.statusCode === 400 || error?.name === 'ValidationError');
    const shouldRetry = attempts < maxAttempts && !isPermanent;

    const errorSummary = error?.message || 'Unknown execution error';

    if (shouldRetry) {
      // Exponential backoff with jitter
      const exponential = this.baseRetryDelayMs * Math.pow(2, attempts - 1);
      const capped = Math.min(this.maxRetryDelayMs, exponential);
      const jitter = Math.floor(Math.random() * (capped * 0.2));
      const delayMs = capped + jitter;
      const nextRetryAt = new Date(now.getTime() + delayMs);

      try {
        const sql = `
          UPDATE background_jobs
          SET status = 'SCHEDULED',
              scheduled_at = $1,
              next_retry_at = $1,
              locked_by = NULL,
              locked_at = NULL,
              error_summary = $2,
              execution_duration_ms = $3,
              updated_at = $4
          WHERE id = $5;
        `;
        await DbService.query(sql, [nextRetryAt.toISOString(), errorSummary, durationMs, now.toISOString(), job.id]);
      } catch {
        const mem = jobQueueService.inMemoryStore.get(job.id);
        if (mem) {
          mem.status = JOB_STATUS.SCHEDULED;
          mem.scheduled_at = nextRetryAt.toISOString();
          mem.next_retry_at = nextRetryAt.toISOString();
          mem.locked_by = null;
          mem.locked_at = null;
          mem.error_summary = errorSummary;
          mem.execution_duration_ms = durationMs;
          mem.updated_at = now.toISOString();
        }
      }
    } else {
      // Exhausted retries or permanent error
      try {
        const sql = `
          UPDATE background_jobs
          SET status = 'FAILED',
              completed_at = $1,
              locked_by = NULL,
              locked_at = NULL,
              error_summary = $2,
              execution_duration_ms = $3,
              updated_at = $1
          WHERE id = $4;
        `;
        await DbService.query(sql, [now.toISOString(), errorSummary, durationMs, job.id]);
      } catch {
        const mem = jobQueueService.inMemoryStore.get(job.id);
        if (mem) {
          mem.status = JOB_STATUS.FAILED;
          mem.completed_at = now.toISOString();
          mem.locked_by = null;
          mem.locked_at = null;
          mem.error_summary = errorSummary;
          mem.execution_duration_ms = durationMs;
          mem.updated_at = now.toISOString();
        }
      }
    }
  }

  /**
   * Recovers jobs abandoned by crashed worker instances
   * @param {number} [thresholdMs]
   * @returns {Promise<number>} Count of recovered jobs
   */
  async recoverAbandonedJobs(thresholdMs) {
    const threshold = thresholdMs || this.staleThresholdMs;
    const cutoff = new Date(Date.now() - threshold).toISOString();
    const now = new Date().toISOString();

    try {
      const sql = `
        UPDATE background_jobs
        SET status = 'PENDING',
            locked_by = NULL,
            locked_at = NULL,
            error_summary = COALESCE(error_summary, '') || ' [Recovered from abandoned worker lock]',
            updated_at = $1
        WHERE status = 'PROCESSING'
          AND locked_at < $2
        RETURNING id;
      `;
      const res = await DbService.query(sql, [now, cutoff]);
      return res.rowCount || 0;
    } catch {
      // In-memory fallback
      let recovered = 0;
      for (const job of jobQueueService.inMemoryStore.values()) {
        if (job.status === JOB_STATUS.PROCESSING &&
            job.locked_at && new Date(job.locked_at).getTime() < (Date.now() - threshold)) {
          job.status = JOB_STATUS.PENDING;
          job.locked_by = null;
          job.locked_at = null;
          job.error_summary = `${job.error_summary || ''} [Recovered from abandoned worker lock]`.trim();
          job.updated_at = now;
          recovered += 1;
        }
      }
      return recovered;
    }
  }
}

export const jobWorker = new JobWorker();
export default jobWorker;
