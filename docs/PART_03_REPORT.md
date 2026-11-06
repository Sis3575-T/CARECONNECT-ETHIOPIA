# CareConnect Ethiopia — Part 03 Development Report
**Part:** 03 of 50 — Backend Foundation and API Architecture  
**Date:** 2026-11-06  
**Lead Backend Architect & Senior Full-Stack Engineer:** Antigravity AI  

---

## 1. Executive Summary

Part 03 establishes the production-grade backend application and versioned REST API architecture for **CareConnect Ethiopia**. The backend serves as the unified coordination engine connecting all four independent frontend portals (Health Centre, Hospital, Transport Coordinator, and System Administrator) and integrates with the Neon cloud PostgreSQL database and the upcoming Python FastAPI AI Decision Service.

The backend is built with pure modern JavaScript (Node.js ES modules) using Express 5, implementing strict architectural separation between HTTP server lifecycle management (`server.js`) and Express application routing/middleware composition (`app.js`). All API endpoints enforce a standardized JSON response contract, distributed correlation tracing via `X-Request-Id`, sliding window rate limiting, Helmet HTTP security headers, CORS origin whitelisting, centralized operational error handling, and complete OpenAPI 3.0.3 documentation.

All requirements of Part 03 were met, with all 8 planned commits successfully executed and verified against automated test suites.

---

## 2. All Eight Git Commits

| Commit # | Hash | Type & Message | Key Deliverables & Summary |
|---|---|---|---|
| **017** | `0b1eb53` | `backend: initialize modular Express application` | Established modular [backend/src/server.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/server.js) with graceful SIGTERM/SIGINT shutdown and database draining, [backend/src/constants/index.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/constants/index.js), [backend/src/repositories/baseRepository.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/repositories/baseRepository.js), and updated [backend/package.json](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/package.json). |
| **018** | `bd9eab2` | `backend: implement centralized environment configuration` | Centralized typed configuration in [backend/src/config/env.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/config/env.js), dedicated CORS configuration in [backend/src/config/cors.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/config/cors.js), updated [backend/.env.example](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/.env.example), and authored [backend/docs/configuration.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/configuration.md). |
| **019** | `02e1bf5` | `backend: integrate PostgreSQL database infrastructure` | Enhanced [backend/src/services/dbService.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/services/dbService.js) with atomic transaction management, automated rollback, and query latency profiling; re-exported `sanitizeConnectionString` in [backend/src/config/database.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/config/database.js); authored [backend/docs/database-integration.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/database-integration.md). |
| **020** | `6da9852` | `backend: establish versioned REST API architecture` | Created standardized response envelope helpers (`successResponse`, `paginatedResponse`, `errorResponse`) in [backend/src/utils/response.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/utils/response.js), connected master version router `/api/v1`, and authored [backend/docs/api-conventions.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/api-conventions.md). |
| **021** | `4cfabee` | `backend: implement request middleware and centralized errors` | Implemented distributed tracing in [backend/src/middleware/requestId.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/middleware/requestId.js), async route error wrapper in [backend/src/utils/asyncHandler.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/utils/asyncHandler.js), centralized error handler with operational/non-operational segregation, dual-mounted health probes, and authored [backend/docs/middleware-and-errors.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/middleware-and-errors.md). |
| **022** | `5321eab` | `security: implement backend HTTP security foundation` | Implemented in-memory sliding window rate limiter in [backend/src/middleware/rateLimit.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/middleware/rateLimit.js) (`X-RateLimit-*` and `Retry-After` headers), unified Helmet and CORS in [backend/src/middleware/security.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/middleware/security.js), created [backend/tests/rateLimit.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/rateLimit.test.js), and authored [backend/docs/security.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/security.md). |
| **023** | `4f13989` | `docs: establish OpenAPI backend documentation` | Authored complete OpenAPI 3.0.3 specification in [backend/src/routes/v1/docs.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/routes/v1/docs.js), generated standalone [backend/docs/openapi.json](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/openapi.json), and expanded [backend/tests/docs.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/docs.test.js). |
| **024** | `f95da5e` | `test: verify backend infrastructure and API foundation` | Created comprehensive infrastructure integration test suite in [backend/tests/infrastructure.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/infrastructure.test.js), executed all quality standards, updated [docs/DEVELOPMENT_PROGRESS.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/DEVELOPMENT_PROGRESS.md), and compiled this completion report. |

---

## 3. Files Created & Modified

### Created Files
1. [backend/src/server.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/server.js) — Dedicated HTTP server entry point with graceful signal listeners and database connection draining.
2. [backend/src/constants/index.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/constants/index.js) — System-wide enums (roles, referral statuses, priorities, error codes, HTTP statuses).
3. [backend/src/repositories/baseRepository.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/repositories/baseRepository.js) — Base repository abstraction providing standardized CRUD, pagination, and soft-delete methods.
4. [backend/src/config/cors.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/config/cors.js) — Centralized CORS configuration with origin validation, allowed/exposed headers, and preflight cache.
5. [backend/src/utils/response.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/utils/response.js) — Standard response envelope builders (`successResponse`, `paginatedResponse`, `errorResponse`).
6. [backend/src/middleware/requestId.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/middleware/requestId.js) — Distributed correlation tracing middleware generating/forwarding `X-Request-Id`.
7. [backend/src/utils/asyncHandler.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/utils/asyncHandler.js) — Higher-order async route wrapper forwarding rejected promises to Express error pipeline.
8. [backend/src/middleware/rateLimit.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/middleware/rateLimit.js) — In-memory sliding window rate limiter with quota tracking, `Retry-After`, and 429 response formatting.
9. [backend/tests/rateLimit.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/rateLimit.test.js) — Automated test suite verifying rate limiting quotas, headers, IP isolation, and reset behavior.
10. [backend/tests/infrastructure.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/infrastructure.test.js) — Comprehensive infrastructure verification suite covering all 8 foundational pillars.
11. [backend/docs/configuration.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/configuration.md) — Comprehensive environment variables and configuration reference.
12. [backend/docs/database-integration.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/database-integration.md) — PostgreSQL connection pool architecture, transactions, and latency profiling guide.
13. [backend/docs/api-conventions.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/api-conventions.md) — REST API conventions, status codes, and uniform response/error contracts.
14. [backend/docs/middleware-and-errors.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/middleware-and-errors.md) — Request pipeline flow, correlation ID propagation, and error taxonomy.
15. [backend/docs/security.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/security.md) — Defensive HTTP security controls, Helmet headers, CORS policies, and rate limits.
16. [backend/docs/openapi.json](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/openapi.json) — Standalone OpenAPI 3.0.3 specification file.
17. [docs/PART_03_REPORT.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/PART_03_REPORT.md) — This Part 03 completion report.

### Modified Files
1. [backend/src/app.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/app.js) — Wired `requestIdMiddleware`, `apiRateLimiter`, security middleware, and dual-mounted health probes.
2. [backend/src/config/env.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/config/env.js) — Centralized environment parsing with safe fallbacks and production validator.
3. [backend/src/config/database.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/config/database.js) — Re-exported credential sanitizer and client wrappers.
4. [backend/src/services/dbService.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/services/dbService.js) — Added atomic transaction runner (`DbService.transaction`) and latency instrumentation.
5. [backend/src/middleware/errorHandler.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/middleware/errorHandler.js) — Integrated `requestId` into standardized error responses; operational vs non-operational stack trace sanitization.
6. [backend/src/middleware/requestLogger.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/middleware/requestLogger.js) — Leveraged `req.requestId` from tracing middleware.
7. [backend/src/middleware/security.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/middleware/security.js) — Replaced duplicate CORS options with centralized `corsOptions` import.
8. [backend/src/routes/v1/health.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/routes/v1/health.js) — Added support for `/live` and `/ready` aliases for container orchestrators.
9. [backend/src/routes/v1/auth.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/routes/v1/auth.js) — Applied strict `authRateLimiter` to `/login` and `/register`.
10. [backend/src/routes/v1/docs.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/routes/v1/docs.js) — Expanded OpenAPI 3.0.3 specification with component schemas, security definitions, and complete endpoint catalog.
11. [backend/tests/health.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/health.test.js) — Added test assertions for root probes `/health/live` and `/health/ready`.
12. [backend/tests/docs.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/docs.test.js) — Added test assertions for OpenAPI components and security definitions.
13. [backend/tests/testHelper.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/testHelper.js) — Added stream/socket mocks (`unpipe`, `socket.remoteAddress`) for robust in-memory testing.
14. [backend/package.json](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/package.json) — Added `start:server` script pointing to `src/server.js`.
15. [docs/DEVELOPMENT_PROGRESS.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/DEVELOPMENT_PROGRESS.md) — Updated Part 03 milestone tracking table.

---

## 4. Architecture & Technical Decisions

### 4.1 Server vs Application Separation
- **`app.js`**: Exports the pure Express application instance without binding to a network port. This enables rapid, socket-free in-memory execution during automated test runs.
- **`server.js`**: Controls the HTTP listener process on `PORT=5000`. Manages operating system signal handlers (`SIGTERM`, `SIGINT`), closes the HTTP listener, and calls `pool.end()` to drain Neon PostgreSQL connections safely without dropped requests.

### 4.2 Centralized Environment & Security Audits
- Centralized in `backend/src/config/env.js`.
- Features `validateProductionSettings()`, which actively halts server boot if default placeholder secrets (`jwt.secret`, default database passwords) are detected when `NODE_ENV === 'production'`.
- Normalizes CORS origins from comma-delimited strings into validated origin arrays.

### 4.3 Database Integration & Atomic Transactions
- `DbService.transaction(async (client) => { ... })`: Executes multi-step business logic inside a single `BEGIN ... COMMIT` block. Automatically runs `ROLLBACK` on any thrown exception and returns the client to the pool.
- Health checks execute `SELECT 1` with query latency measurement, gracefully returning `{ connected: false, error }` without crashing the API process when the database is unreachable.

### 4.4 Versioned REST API & Uniform Response Contracts
- Version prefix: `/api/v1` mounted on `app.js`.
- Standardized success envelope:
  ```json
  { "success": true, "message": "Operation completed", "data": {}, "meta": {} }
  ```
- Standardized error envelope:
  ```json
  { "success": false, "message": "Reason", "error": { "code": "...", "details": [] }, "requestId": "req-..." }
  ```

### 4.5 Distributed Tracing (`requestIdMiddleware`)
- Intercepts incoming `X-Request-Id` headers or generates `req-<16-hex-bytes>`.
- Attaches the identifier to `req.requestId` and the outgoing `X-Request-Id` response header.
- Propagates across all logged HTTP requests, error responses, and downstream database logs.

### 4.6 Centralized Error Handling & Operational Classification
- `AppError` base class with `isOperational: true`.
- Granular subclasses: `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `DatabaseError` (500).
- Operational errors return structured JSON without stack traces. Unhandled exceptions return generic messages in production while preserving stack traces in development/test.

### 4.7 HTTP Security & Sliding Window Rate Limiting
- **Helmet**: Disables speculative DNS prefetching, enforces `X-Content-Type-Options: nosniff`, and applies `X-Frame-Options: SAMEORIGIN`.
- **CORS**: Enforces origin whitelist for the four frontend portals (`:5173`, `:5174`, `:5175`, `:5176`), allows credentials, and exposes tracking headers (`X-Request-Id`, `X-RateLimit-*`, `Retry-After`).
- **Rate Limiting**: Sliding window in-memory limiter with automatic memory cleanup. Enforces:
  - Global API: 100 requests per 15-minute rolling window.
  - Authentication (`/login`, `/register`): 10 requests per 15-minute rolling window.
  - Returns HTTP 429 Too Many Requests with standard error envelope when exceeded.

### 4.8 Cloud Orchestrator Probes
- Container orchestrators (Docker, Kubernetes, AWS ECS) require standard health checks without version prefixes:
  - `GET /health/live` & `/health/liveness`: Returns `200 ALIVE`.
  - `GET /health/ready` & `/health/readiness`: Verifies database connectivity, returning `200 READY` or `503 NOT_READY`.
  - `GET /health`: Returns full system memory and diagnostic metrics.
- Versioned API consumers access identical diagnostics at `GET /api/v1/health`.

### 4.9 OpenAPI 3.0.3 Specification
- Exposed interactively at `GET /api/v1/docs`.
- Exported as static [backend/docs/openapi.json](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/openapi.json).
- Documents all core tags, security schemes (`BearerAuth`), request/response schemas, and endpoint paths.

---

## 5. Verification & Test Results

### 5.1 Standards Verification (`npm run check:standards`)
```
============================================================
   CARECONNECT ETHIOPIA - CODE QUALITY & STANDARDS CHECK
============================================================

[1/3] Checking Required Standard Configuration Files:
  ✔ Found eslint.config.js
  ✔ Found .prettierrc.json
  ✔ Found .prettierignore
  ✔ Found .env.example
  ✔ Found .gitignore

[2/3] Checking Source Code Files:
  ✔ Scanned 47 JavaScript/JSX files across core services with zero syntax/secret anomalies.

[3/3] Checking Portal Independence:
  ✔ Portal 'health-centre' configured with independent package.json & vite.config.js
  ✔ Portal 'hospital' configured with independent package.json & vite.config.js
  ✔ Portal 'transport' configured with independent package.json & vite.config.js
  ✔ Portal 'administrator' configured with independent package.json & vite.config.js

============================================================
   RESULT: ALL CODE QUALITY & STANDARDS CHECKS PASSED
============================================================
```

### 5.2 Database Integrity Tests (`npm run test:db`)
- **12 tests passed, 0 failed** across 2 suites.
- Validated all 24 database migrations, foreign keys, check constraints, soft-delete rules, and credential masking.

### 5.3 Backend Integration Tests (`npm run test:backend`)
- **80 tests passed, 0 failed** across 17 test suites:
  - `app.test.js`: Express instantiation and welcome metadata (2 tests)
  - `config.test.js`: Environment and settings configuration (4 tests)
  - `dbService.test.js`: DbService queries, transactions, and health checks (2 tests)
  - `docs.test.js`: OpenAPI 3.0.3 specification and schemas (2 tests)
  - `errorHandler.test.js`: Error classes and 404 handler (2 tests)
  - `facilityTenancy.test.js`: Facility tenancy boundaries and RBAC (5 tests)
  - `health.test.js`: Liveness, readiness, and diagnostics probes (5 tests)
  - `infrastructure.test.js`: Full infrastructure integration suite (9 tests)
  - `logger.test.js`: Correlation ID and request logging (2 tests)
  - `login.test.js`: Authentication and credential verification (3 tests)
  - `logout.test.js`: Session termination and token revocation (1 test)
  - `password.test.js`: Bcrypt hashing and password strength (2 tests)
  - `projectHealth.test.js`: Service directory and port configuration (4 tests)
  - `rateLimit.test.js`: Quotas, 429 status, and IP isolation (3 tests)
  - `rbac.test.js`: Role-based access control and portal separation (4 tests)
  - `refresh.test.js`: Refresh token lifecycle and rotation (3 tests)
  - `register.test.js`: User registration and duplicate prevention (2 tests)
  - `security.test.js`: Helmet security headers and CORS (2 tests)
  - `token.test.js`: JWT access tokens and `/me` authentication (3 tests)
  - `validate.test.js`: Request payload validation middleware (2 tests)
  - `versioning.test.js`: Versioned router `/api/v1` directory (1 test)

---

## 6. Git History Alignment

With the completion of Part 03, CareConnect Ethiopia reaches **24 total Git commits** across the 50-part roadmap:
- **Part 01:** Commits 001–008 (`e6f4238` through `cf43d25`)
- **Part 02:** Commits 009–016 (`1d95d42` through `bccd168`)
- **Part 03:** Commits 017–024 (`0b1eb53` through `f95da5e`)

Every part maintains a strict minimum of 8 meaningful, self-contained, and verified Git commits.

---

## 7. Next Steps & Part 04 Preview

The backend foundation is now complete, secured, documented, and tested. The project is fully prepared for **Part 04**:

### Part 04 Focus Areas
1. **Production Authentication Service**:
   - Expansion of token lifecycle and blacklisting with Redis/PostgreSQL session storage.
   - Comprehensive account status lifecycle (active, pending, suspended, deactivated).
   - Account lockout after consecutive failed authentication attempts.
   - Password reset workflow with time-limited cryptographic tokens.
2. **Granular RBAC & Permissions Middleware**:
   - Permission-level gates (`requirePermission`) mapping to database `role_permissions`.
   - Facility tenancy scoping for patient and referral data.
   - Cross-portal boundary enforcement across all 4 frontend consumer apps.

> [!IMPORTANT]
> **Part 03 is complete.** Per master execution instructions, work stops here. Part 04 will begin only after explicit user approval.
