# CareConnect Ethiopia — Backend HTTP Security Architecture

This document describes the defensive HTTP security controls implemented across the CareConnect Ethiopia backend API.

---

## 1. Security Headers (`Helmet`)

Configured via `backend/src/middleware/security.js`.

The backend enforces standard defensive HTTP headers:
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing by browsers.
- `X-Frame-Options: SAMEORIGIN`: Prevents unauthorized framing/clickjacking attacks.
- `X-DNS-Prefetch-Control: off`: Disables speculative DNS lookups.
- `Strict-Transport-Security`: Enforces TLS encryption for external clients in production.

---

## 2. Cross-Origin Resource Sharing (CORS)

Configured via `backend/src/config/cors.js` and applied through `backend/src/middleware/security.js`.

- Whitelists the four independent frontend portals by default:
  - Health Centre Portal (`http://localhost:5173`)
  - Hospital Portal (`http://localhost:5174`)
  - Transport Coordinator Portal (`http://localhost:5175`)
  - System Administrator Portal (`http://localhost:5176`)
- Configurable in production via the `CORS_ORIGIN` environment variable (comma-separated list).
- Permits necessary cross-origin headers including `Authorization`, `X-Request-Id`, and `X-Facility-ID`.
- Exposes client-facing metadata headers including `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`.
- Caches preflight `OPTIONS` requests for 24 hours (`maxAge: 86400`) to optimize frontend latency.

---

## 3. Sliding Window Rate Limiting

Implemented in `backend/src/middleware/rateLimit.js`.

### Quota Policies

| Scope | Path | Window | Limit | Response on Exceed |
|-------|------|--------|-------|--------------------|
| **General API** | `/api/v1/*` | 15 minutes | 100 requests | `429 Too Many Requests` |
| **Authentication** | `/api/v1/auth/login`, `/register` | 15 minutes | 10 requests | `429 Too Many Requests` |

### Rate Limit Response Headers

On every request, the backend attaches:
- `X-RateLimit-Limit`: Maximum requests permitted within the rolling window.
- `X-RateLimit-Remaining`: Number of requests remaining for the caller's IP address.
- `X-RateLimit-Reset`: Unix epoch timestamp (in seconds) when the quota window resets.

When rate limits are exceeded, the API returns HTTP 429 with `Retry-After: <seconds>` and a standardized JSON envelope:

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 840,
    "timestamp": "2026-11-06T18:47:00.000Z"
  },
  "requestId": "req-abcdef1234567890"
}
```
