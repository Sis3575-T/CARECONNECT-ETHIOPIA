/**
 * CareConnect Ethiopia - Idempotency Key Middleware
 * Ensures reliable duplicate request handling across network disconnects or client retries.
 * Intercepts POST, PUT, and PATCH requests bearing 'Idempotency-Key' or 'X-Idempotency-Key'.
 */

export function createIdempotencyMiddleware(options = {}) {
  const ttlMs = options.ttlMs || 15 * 60 * 1000; // 15 minutes default TTL
  const cache = new Map(); // key -> { statusCode, body, timestamp, inFlight }

  // Periodic cleanup of expired idempotency keys
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > ttlMs) {
        cache.delete(key);
      }
    }
  }, Math.min(ttlMs, 5 * 60 * 1000));

  if (cleanup.unref) {
    cleanup.unref();
  }

  const middleware = (req, res, next) => {
    // Only apply to state-modifying methods
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!idempotencyKey) {
      return next();
    }

    const cached = cache.get(idempotencyKey);
    if (cached) {
      if (cached.inFlight) {
        return res.status(409).json({
          success: false,
          message: 'A request with this idempotency key is currently being processed',
          error: {
            code: 'CONCURRENT_REQUEST',
            message: 'In-flight operation underway. Please await response or retry later.'
          }
        });
      }

      // Replay cached response
      res.setHeader('Idempotent-Replay', 'true');
      res.setHeader('X-Idempotency-Key', idempotencyKey);
      return res.status(cached.statusCode).json(cached.body);
    }

    // Mark in-flight
    cache.set(idempotencyKey, {
      inFlight: true,
      timestamp: Date.now()
    });

    // Intercept res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Store in cache if operation completed with successful status (2xx or 3xx)
      if (res.statusCode >= 200 && res.statusCode < 400) {
        cache.set(idempotencyKey, {
          inFlight: false,
          statusCode: res.statusCode,
          body,
          timestamp: Date.now()
        });
      } else {
        // Evict from cache on error so client can retry with same key
        cache.delete(idempotencyKey);
      }
      return originalJson(body);
    };

    next();
  };

  middleware.reset = () => cache.clear();
  middleware.getCache = () => cache;

  return middleware;
}

export const idempotency = createIdempotencyMiddleware();

export default {
  createIdempotencyMiddleware,
  idempotency
};
