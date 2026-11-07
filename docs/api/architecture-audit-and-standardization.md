# CareConnect Ethiopia — Backend API Architecture Audit & Standardization Plan

**Scope:** Part 11 of 50 — API Architecture, Standardization, Validation & Error Handling  
**Date:** 2026-11-07  

---

## 1. Executive Summary & Audit Findings

An architectural inspection was conducted across all existing backend endpoints (`/api/v1/*`), controllers, services, repositories, validators, and middleware.

### 1.1 Key Audit Findings

| Domain / Component | Current State | Identified Deficiency | Target Standard (Part 11) |
|---|---|---|---|
| **Route Validation** | Mixed: `users.js` and `facilities.js` have route middleware; `referrals.js` and `patients.js` validate inside service methods. | URL params (`:referralId`, `:patientId`) and query params (`page`, `limit`, `sortBy`) bypass early middleware rejection. | Unified `validateRequest({ params, query, body })` middleware applied directly at route definitions. |
| **Response Contracts** | `successResponse` and `paginatedResponse` exist in `utils/response.js`; `errorResponse` places `requestId` at root level. | Minor variance with recommended standard contract (`meta: { requestId }`). | Standardized envelope with `data`, `meta: { requestId, pagination }`, and `error: { code, details }` while preserving backward compatibility. |
| **Error Handling** | `errorHandler.js` catches operational `AppError`s, but raw database errors (`23505`, `23503`, `22P02`) and malformed JSON syntax errors can bubble up with default 500 status. | Risk of leaking raw SQL fragments or returning 500 for client-side bad requests. | Centralized database error mapper converting Postgres codes to typed `ConflictError` (409), `BadRequestError` (400), or `NotFoundError` (404). |
| **Request Tracing** | `requestIdMiddleware` generates `X-Request-Id`, but it is not uniformly attached to all `meta` blocks or structured logs. | Tracing gaps across nested asynchronous service calls. | Ubiquitous propagation of `req.requestId` across request lifecycle, logs, and response envelopes. |
| **Logging & Redaction** | `requestLogger.js` logs HTTP method and status, but lacks automated payload redaction for passwords, tokens, and clinical notes. | Potential exposure of sensitive PII in development or staging stdout. | Dedicated redaction filter masking keys matching `password`, `token`, `secret`, `authorization`, `clinicalSummary`, and `vitalSigns`. |
| **CORS & Security** | CORS allowed origins configured via env with defaults; Helmet security headers applied. | Portal ports (3000, 3001, 3002, 3003) must be explicitly handled for credentialed preflight across all 4 independent portals. | Explicit CORS configuration supporting credentials, portal origins, and strict Content-Type validation. |
| **Collection Standards** | Pagination logic duplicated in multiple controllers (`parseInt(req.query.page, 10)`). | Duplicate parsing and risk of negative page or unbounded limit values. | Reusable `paginationSchema` and `sanitizePagination` helper enforcing `page >= 1`, `1 <= limit <= 100`, and allowlisted sort fields. |

---

## 2. Standardized Request & Response Pipeline

```
┌────────────────────────────────────────────────────────┐
│                   Incoming HTTP Request                │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 1. Security & Pre-Processing                           │
│    - Helmet Security Headers                           │
│    - CORS Origin & Preflight Validation                │
│    - Request Correlation ID (X-Request-Id)             │
│    - Structured Request Logging with Sensitive Masking │
│    - Rate Limiting (apiRateLimiter / authRateLimiter)  │
│    - Body Parsers with 10MB Ceiling & Malformed Guard  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Authentication & Authorization                      │
│    - Token Verification (JWT Bearer / Cookie)          │
│    - Session Active Status & Revocation Check          │
│    - Role-Based Access Control (requirePermission)     │
│    - Facility Tenancy Boundary Check (facilityTenancy) │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Declarative Request Validation                      │
│    - Route Parameters (:id, :uuid, numeric ID)         │
│    - Query Parameters (page, limit, filter, sort)      │
│    - Request Body (fields, types, enums, constraints)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. Controller Layer                                    │
│    - HTTP Request Handling                             │
│    - Delegation to Domain Service                      │
│    - Formats Standardized Envelope (success/paginated) │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 5. Service & Persistence Layer                         │
│    - Business Logic Execution                          │
│    - Dual-Mode Repository Execution (Postgres / Mem)   │
│    - Atomic Database Transactions with Savepoints      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 6. Centralized Error Handling Middleware               │
│    - Catches Thrown Errors / Database Code Mappings    │
│    - Normalizes to Standardized Error Envelope         │
│    - Attaches Request ID & Sanitizes Internal Details  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Standardized API Response Contracts

### 3.1 Standard Success Envelope
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {
    "requestId": "req-9a1b2c3d4e5f6a7b",
    "timestamp": "2026-11-07T09:55:00.000Z"
  }
}
```

### 3.2 Standard Paginated Envelope
```json
{
  "success": true,
  "message": "Records retrieved successfully",
  "data": [],
  "meta": {
    "requestId": "req-9a1b2c3d4e5f6a7b",
    "timestamp": "2026-11-07T09:55:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 3.3 Standard Error Envelope
```json
{
  "success": false,
  "message": "Validation failed for incoming payload",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "priority", "message": "priority must be one of: ROUTINE, URGENT, EMERGENCY" }
    ]
  },
  "meta": {
    "requestId": "req-9a1b2c3d4e5f6a7b",
    "timestamp": "2026-11-07T09:55:00.000Z"
  }
}
```

---

## 4. Implementation Roadmap for Part 11 (Commits 081–088)

1. **Commit 081** (`backend: audit and standardize API architecture`): Author audit report, establish pipeline architecture, document endpoint standards.
2. **Commit 082** (`backend: implement centralized request validation`): Implement enhanced `validateRequest({ params, query, body })`, reusable common schemas (pagination, sorting, IDs, date ranges).
3. **Commit 083** (`backend: implement standardized API response contracts`): Upgrade `response.js` with automatic request ID binding, dual-format metadata support.
4. **Commit 084** (`backend: centralize error handling and request tracing`): Enhance `errorHandler.js` with PostgreSQL error code mapping (`23505`, `23503`, `22P02`), malformed JSON parser guard, and structured logger redaction.
5. **Commit 085** (`backend: standardize API security and middleware policies`): Enhance CORS portal origins, rate limiting tiers (auth, api, search), strict Content-Type validation.
6. **Commit 086** (`docs: generate and maintain OpenAPI API reference`): Complete OpenAPI 3.0.3 specification covering all endpoints, parameters, request bodies, error schemas, and portal tags.
7. **Commit 087** (`backend: improve API reliability and compatibility`): Harden health probes (`/health`, `/health/ready`, `/health/live`), request timeouts, idempotency standards.
8. **Commit 088** (`test: verify API contracts validation and error handling`): Comprehensive integration suite testing validation, error mapping, response shapes, rate limiting, and regression.
