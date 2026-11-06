/**
 * CareConnect Ethiopia - Sliding Window Rate Limiting Middleware
 * Protects endpoints from brute-force and DDoS attacks.
 */

export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 100;
  const message = options.message || 'Too many requests. Please try again later.';
  const statusCode = options.statusCode || 429;
  const keyGenerator = options.keyGenerator || ((req) => {
    if (req.headers && req.headers['x-forwarded-for']) {
      return req.headers['x-forwarded-for'].split(',')[0].trim();
    }
    if (req.socket && req.socket.remoteAddress) {
      return req.socket.remoteAddress;
    }
    if (req.connection && req.connection.remoteAddress) {
      return req.connection.remoteAddress;
    }
    return '127.0.0.1';
  });
  const skip = options.skip || (() => false);

  // In-memory hit storage: Map of key -> { count: number, resetTime: number }
  const hits = new Map();

  // Periodic cleanup interval to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 5 * 60 * 1000));

  if (cleanupInterval.unref) {
    cleanupInterval.unref(); // Don't hold Node process open in test runners
  }

  const rateLimiter = (req, res, next) => {
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    let record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil(record.resetTime / 1000);
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));

    if (record.count > max) {
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(statusCode).json({
        success: false,
        message,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter,
          timestamp: new Date().toISOString()
        },
        ...(req.requestId ? { requestId: req.requestId } : {})
      });
    }

    next();
  };

  rateLimiter.reset = () => hits.clear();
  rateLimiter.getHits = () => hits;

  return rateLimiter;
}

// Global API rate limiter (100 req per 15 min; in test environment skips unless header X-Test-RateLimit is passed)
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-ratelimit']
});

// Stricter Auth rate limiter (10 req per 15 min)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-ratelimit']
});

export default {
  createRateLimiter,
  apiRateLimiter,
  authRateLimiter
};
