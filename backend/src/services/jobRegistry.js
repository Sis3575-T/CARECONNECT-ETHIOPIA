/**
 * CareConnect Ethiopia - Job Handler Registry
 * Maintains decoupled registration of background task handlers.
 */

class JobRegistry {
  constructor() {
    this.handlers = new Map();
  }

  /**
   * Registers a handler function for a job type
   * @param {string} jobType - Unique job identifier string
   * @param {Function} handler - Async function(job, context) returning result
   */
  register(jobType, handler) {
    if (!jobType || typeof jobType !== 'string') {
      throw new Error('jobType must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new Error(`Handler for ${jobType} must be a function`);
    }
    this.handlers.set(jobType, handler);
  }

  /**
   * Retrieves handler for a given job type
   * @param {string} jobType
   * @returns {Function|null}
   */
  get(jobType) {
    return this.handlers.get(jobType) || null;
  }

  /**
   * Checks if handler exists
   * @param {string} jobType
   * @returns {boolean}
   */
  has(jobType) {
    return this.handlers.has(jobType);
  }

  /**
   * Lists all registered job types
   * @returns {string[]}
   */
  list() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clears registry (useful for test isolation)
   */
  clear() {
    this.handlers.clear();
  }
}

export const jobRegistry = new JobRegistry();
export default jobRegistry;
