/**
 * CareConnect Ethiopia - Distributed Scheduler & Recurring Task Service
 * Manages one-time delayed jobs, recurring interval tasks, multi-instance leader leasing,
 * missed-schedule recovery, and Ethiopian timezone (EAT / UTC+3) calculations.
 */

import crypto from 'crypto';
import { DbService } from './dbService.js';
import { jobQueueService } from './jobQueueService.js';
import { JOB_STATUS, JOB_PRIORITY } from '../constants/jobs.js';

export const ETHIOPIA_TIMEZONE_OFFSET_HOURS = 3; // EAT is fixed UTC+3 (no DST)

export class SchedulerService {
  static sharedLeases = new Map(); // Shared in-memory lease table across instances

  static clearSharedLeases() {
    SchedulerService.sharedLeases.clear();
  }

  constructor(options = {}) {
    this.instanceId = options.instanceId || `instance-${crypto.randomBytes(4).toString('hex')}`;
    this.pollIntervalMs = Number(options.pollIntervalMs) || 5000;
    this.leaseDurationMs = Number(options.leaseDurationMs) || 30000; // 30s lease

    this.isRunning = false;
    this.timer = null;
    this.recurringTasks = new Map(); // taskName -> { intervalMs, taskFn, options }
  }

  /**
   * Schedules a one-time delayed background job
   * @param {string} jobType
   * @param {object} payload
   * @param {Date|string|number} runAt - Execution timestamp
   * @param {object} [options]
   */
  async scheduleOneTimeJob(jobType, payload, runAt, options = {}) {
    const scheduledAt = new Date(runAt);
    return jobQueueService.enqueue(jobType, payload, {
      ...options,
      scheduledAt
    });
  }

  /**
   * Registers a recurring schedule
   * @param {string} taskName - Unique task key
   * @param {number} intervalMs - Recurrence interval in milliseconds
   * @param {Function} taskFn - Async function(context)
   * @param {object} [options]
   */
  registerRecurringTask(taskName, intervalMs, taskFn, options = {}) {
    if (!taskName || typeof taskFn !== 'function') {
      throw new Error('taskName and taskFn are required');
    }
    this.recurringTasks.set(taskName, {
      intervalMs: Math.max(1000, Number(intervalMs) || 60000),
      taskFn,
      options
    });
  }

  /**
   * Starts the recurring scheduler engine
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const tick = async () => {
      if (!this.isRunning) return;
      try {
        await this.evaluateRecurringTasks();
      } catch {
        // Scheduler tick resilience
      } finally {
        if (this.isRunning) {
          this.timer = setTimeout(tick, this.pollIntervalMs);
          if (this.timer.unref) this.timer.unref();
        }
      }
    };

    tick();
  }

  /**
   * Stops the scheduler
   */
  stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
  }

  /**
   * Evaluates all registered recurring tasks and runs those whose lease can be acquired
   */
  async evaluateRecurringTasks() {
    for (const [taskName, def] of this.recurringTasks.entries()) {
      const acquired = await this.acquireTaskLease(taskName, def.intervalMs);
      if (acquired) {
        try {
          await def.taskFn({
            taskName,
            instanceId: this.instanceId,
            timestamp: new Date().toISOString()
          });
        } catch {
          // Task error handled internally by taskFn
        }
      }
    }
  }

  /**
   * Attempts to acquire exclusive distributed lease for a task execution
   * @param {string} taskName
   * @param {number} intervalMs
   * @returns {Promise<boolean>} True if lease was acquired
   */
  async acquireTaskLease(taskName, intervalMs) {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + this.leaseDurationMs).toISOString();
    const nextRunAt = new Date(now.getTime() + intervalMs).toISOString();

    try {
      const sql = `
        INSERT INTO scheduled_tasks_lease (
          task_name, locked_by, locked_until, last_run_at, next_run_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $4)
        ON CONFLICT (task_name) DO UPDATE
        SET locked_by = $2,
            locked_until = $3,
            last_run_at = $4,
            next_run_at = $5,
            updated_at = $4
        WHERE scheduled_tasks_lease.locked_until IS NULL 
           OR scheduled_tasks_lease.locked_until <= $4
           OR (scheduled_tasks_lease.next_run_at <= $4 AND scheduled_tasks_lease.locked_by = $2);
      `;
      const res = await DbService.query(sql, [taskName, this.instanceId, lockedUntil, now.toISOString(), nextRunAt]);
      return (res.rowCount || 0) > 0;
    } catch {
      // In-memory fallback leasing
      return this._acquireInMemoryLease(taskName, intervalMs, now, lockedUntil, nextRunAt);
    }
  }

  _acquireInMemoryLease(taskName, intervalMs, now, lockedUntil, nextRunAt) {
    let lease = SchedulerService.sharedLeases.get(taskName);
    if (!lease) {
      lease = {
        lockedBy: this.instanceId,
        lockedUntil,
        lastRunAt: now.toISOString(),
        nextRunAt
      };
      SchedulerService.sharedLeases.set(taskName, lease);
      return true;
    }

    const isExpired = !lease.lockedUntil || new Date(lease.lockedUntil).getTime() <= now.getTime();
    const isDue = !lease.nextRunAt || new Date(lease.nextRunAt).getTime() <= now.getTime();

    if (isExpired || (isDue && lease.lockedBy === this.instanceId)) {
      lease.lockedBy = this.instanceId;
      lease.lockedUntil = lockedUntil;
      lease.lastRunAt = now.toISOString();
      lease.nextRunAt = nextRunAt;
      return true;
    }

    return false;
  }

  /**
   * Converts a UTC Date to Ethiopian Local Time string (EAT: UTC+3)
   * @param {Date|string|number} utcDate
   * @returns {string} Formatted string in YYYY-MM-DD HH:mm:ss EAT
   */
  static formatEthiopianTime(utcDate) {
    const d = new Date(utcDate);
    if (isNaN(d.getTime())) return 'Invalid Date';
    // Add 3 hours for East Africa Time
    const eatTime = new Date(d.getTime() + ETHIOPIA_TIMEZONE_OFFSET_HOURS * 3600 * 1000);
    const pad = (n) => String(n).padStart(2, '0');

    const year = eatTime.getUTCFullYear();
    const month = pad(eatTime.getUTCMonth() + 1);
    const day = pad(eatTime.getUTCDate());
    const hours = pad(eatTime.getUTCHours());
    const minutes = pad(eatTime.getUTCMinutes());
    const seconds = pad(eatTime.getUTCSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} EAT`;
  }

  /**
   * Checks if a timestamp falls within standard Ethiopian clinical working hours
   * (08:30 to 17:30 Monday through Friday)
   */
  static isWorkingHours(utcDate, startTime = '08:30', endTime = '17:30') {
    const d = new Date(utcDate);
    const eatTime = new Date(d.getTime() + ETHIOPIA_TIMEZONE_OFFSET_HOURS * 3600 * 1000);
    const dayOfWeek = eatTime.getUTCDay(); // 0 is Sunday, 6 is Saturday

    // Check weekday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const currentMinutes = eatTime.getUTCHours() * 60 + eatTime.getUTCMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  clearInMemory() {
    this.recurringTasks.clear();
    SchedulerService.sharedLeases.clear();
  }
}

export const schedulerService = new SchedulerService();
export default schedulerService;
