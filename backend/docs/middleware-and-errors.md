# CareConnect Ethiopia — Request Middleware & Centralized Error Architecture

This document details the HTTP request processing pipeline, distributed request correlation, asynchronous route handling, and centralized error lifecycle in the CareConnect Ethiopia backend.

---

## 1. Request Pipeline Flow

```
Incoming Request
       │
       ▼
[requestIdMiddleware] ── Sets req.requestId & 'X-Request-Id' response header
       │
       ▼
[configureSecurity]   ── Applies Helmet security headers & CORS origin enforcement
       │
       ▼
[requestLogger]       ── Formats method, url, status, latency & requestId
       │
       ▼
[express.json / urlencoded] ── Parses payloads up to 10MB
       │
       ▼
[Orchestrator Probes] ── Root /health, /health/live, /health/ready
       │
       ▼
[Versioned REST API]  ── /api/v1 (auth, facilities, referrals, transport, etc.)
       │
       ▼
[notFoundHandler]     ── Catches unhandled routes, raises NotFoundError
       │
       ▼
[errorHandler]        ── Serializes error into uniform JSON envelope with requestId
```

---

## 2. Distributed Tracing (`requestIdMiddleware`)

Located at `backend/src/middleware/requestId.js`.

- Checks incoming request headers for `X-Request-Id`.
- If missing, generates a unique crypto-random identifier formatted as `req-<16-hex-chars>`.
- Attaches the identifier to `req.requestId`.
- Sets the `X-Request-Id` header on the outgoing response.
- Enables end-to-end tracing across the 4 frontend portals, backend API, and Python AI service.

---

## 3. Asynchronous Handling (`asyncHandler`)

Located at `backend/src/utils/asyncHandler.js`.

- Wraps route controllers returning Promises.
- Forwards rejected promises directly to Express `next(err)`.
- Eliminates redundant `try/catch` boilerplate in controllers.

```javascript
import { asyncHandler } from '../utils/asyncHandler.js';

router.get('/referrals/:id', asyncHandler(async (req, res) => {
  const referral = await referralService.getById(req.params.id);
  res.json(successResponse(referral));
}));
```

---

## 4. Centralized Error Taxonomy

Located at `backend/src/utils/errors.js`.

| Class | HTTP Status | Error Code | Operational |
|-------|-------------|------------|-------------|
| `AppError` | Variable | Variable | `true` |
| `ValidationError` | `400` | `VALIDATION_ERROR` | `true` |
| `UnauthorizedError` | `401` | `UNAUTHORIZED` | `true` |
| `ForbiddenError` | `403` | `FORBIDDEN` | `true` |
| `NotFoundError` | `404` | `NOT_FOUND` | `true` |
| `ConflictError` | `409` | `CONFLICT` | `true` |
| `DatabaseError` | `500` | `DATABASE_ERROR` | `true` |

---

## 5. Standard Error Envelope

All HTTP errors return a uniform contract:

```json
{
  "success": false,
  "message": "Patient referral not found",
  "error": {
    "code": "NOT_FOUND",
    "message": "Patient referral not found",
    "details": [],
    "timestamp": "2026-11-06T18:40:00.000Z"
  },
  "requestId": "req-9876543210abcdef"
}
```

In development and test environments, unhandled 500 errors include `error.stack`. In production, stack traces are stripped to prevent information leakage.
