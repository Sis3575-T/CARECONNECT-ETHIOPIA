# CareConnect Ethiopia — API Documentation (v1)

## Base URL
```text
http://localhost:5000/api/v1
```

All requests must use `application/json` content-type unless transmitting multipart file uploads.

---

## 1. Authentication & Security Headers

### Bearer Token
Protected endpoints require an `Authorization` header containing an active JWT token:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### Request Tracing
Clients may provide an `X-Request-Id` header for end-to-end tracing:
```http
X-Request-Id: req-98f2b7a14e9102c3
```

---

## 2. Standard Response Envelope

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for incoming payload",
    "details": [
      { "field": "email", "message": "email is required" }
    ],
    "timestamp": "2026-11-05T20:00:00.000Z"
  }
}
```

---

## 3. Core Endpoint Catalog

### 3.1 Authentication (`/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user account | Admin |
| `POST` | `/auth/login` | Authenticate email/password, return access & refresh tokens | Public |
| `POST` | `/auth/refresh` | Renew expired access token using refresh token | Public |
| `POST` | `/auth/logout` | Invalidate refresh token and revoke session | Authenticated |
| `GET` | `/auth/me` | Retrieve profile and permissions of authenticated user | Authenticated |

### 3.2 Facilities & Capacity (`/facilities`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/facilities` | List healthcare facilities with filters (region, tier, type) | Public / Auth |
| `GET` | `/facilities/:id` | Get facility details, coordinates, and services catalog | Public / Auth |
| `POST` | `/facilities` | Register new healthcare facility | Admin |
| `PUT` | `/facilities/:id` | Update facility details | Admin |
| `GET` | `/facilities/:id/capacity` | Get latest live capacity (beds, ICU, ventilators) | Authenticated |
| `POST` | `/facilities/:id/capacity` | Submit time-stamped capacity report | Hospital Staff |

### 3.3 Patient Management (`/patients`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/patients` | Search and paginate patient records | Health Centre / Hospital |
| `POST` | `/patients` | Register new patient record | Health Centre Staff |
| `GET` | `/patients/:id` | Retrieve patient demographics and medical summary | Authorized Staff |
| `PUT` | `/patients/:id` | Update permitted patient information | Authorized Staff |
| `GET` | `/patients/:id/referrals` | Retrieve patient referral history | Authorized Staff |

### 3.4 Electronic Referrals (`/referrals`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/referrals` | Create new referral draft | Health Centre Staff |
| `GET` | `/referrals/:id` | Get comprehensive authorized referral details | Referring / Receiving Facility |
| `PUT` | `/referrals/:id` | Update draft referral clinical information | Referring Staff |
| `POST` | `/referrals/:id/submit` | Formally submit referral to destination hospital | Referring Staff |
| `GET` | `/referrals/incoming` | Retrieve incoming referrals queue for hospital | Hospital Triage |
| `POST` | `/referrals/:id/acknowledge`| Mark incoming referral as acknowledged by hospital | Hospital Triage |
| `POST` | `/referrals/:id/accept` | Accept referral and confirm bed reservation | Hospital Triage |
| `POST` | `/referrals/:id/reject` | Decline referral with structured clinical reason | Hospital Triage |
| `POST` | `/referrals/:id/request-info`| Request additional laboratory or clinical information | Hospital Triage |
| `GET` | `/referrals/:id/timeline` | Retrieve chronological referral event history | Authorized Staff |
| `POST` | `/referrals/:id/feedback`| Record post-admission hospital clinical feedback | Hospital Staff |

### 3.5 Transportation & Fleet (`/transport`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/transport/requests` | List transport requests requiring ambulance dispatch | Transport Dispatcher |
| `POST` | `/transport/requests` | Create transport request for accepted emergency referral| Clinician |
| `POST` | `/transport/assign` | Assign ambulance vehicle and driver to request | Transport Dispatcher |
| `GET` | `/transport/resources` | List ambulance fleet status and GPS coordinates | Transport Dispatcher |
| `POST` | `/transport/:id/status` | Update transit milestone (departed, delayed, arrived) | Driver / Dispatcher |

### 3.6 AI Services Gateway (`/ai`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/ai/ocr/extract` | Upload paper referral slip and extract OCR text | Health Centre Staff |
| `POST` | `/ai/recommend` | Calculate ranked hospital recommendations & weights | Health Centre Staff |
| `POST` | `/ai/predict/delay` | Estimate predicted triage and transit delay risk | Health Centre / Hospital |
| `POST` | `/ai/assistant` | Query grounded clinical knowledge base & guidelines | Authenticated |

### 3.7 Secure Document Management (`/documents`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/documents` | Upload and attach medical document (PDF, JPEG, PNG) | Health Centre / Hospital Staff |
| `GET` | `/documents/:id` | Retrieve sanitized document metadata | Authorized Facility Staff |
| `GET` | `/documents/:id/download` | Authorized binary download with secure disposition | Authorized Facility Staff |
| `GET` | `/documents/:id/preview` | Authorized inline binary preview (anti-sniffing) | Authorized Facility Staff |
| `POST` | `/documents/:id/replace` | Upload replacement version (with concurrency check) | Authorized Facility Staff |
| `GET` | `/documents/:id/versions` | Query document version history lineage | Authorized Facility Staff |
| `POST` | `/documents/:id/verify` | Record human verification review outcome | Clinician Reviewer |
| `POST` | `/documents/:id/archive` | Transition document to ARCHIVED lifecycle state | Originating Facility / Admin |
| `DELETE` | `/documents/:id` | Soft-delete document with mandatory justification | Authorized Staff / Admin |
| `GET` | `/documents/:id/logs` | Query document access and audit trail history | Facility Staff / Admin |
| `GET` | `/documents/:id/processing` | Query AI/OCR processing preparation status | Authorized Facility Staff |
| `POST` | `/documents/:id/processing/queue` | Queue document for AI/OCR processing pipeline | Authorized Facility Staff |
| `POST` | `/documents/:id/processing/complete` | Worker callback recording processing results | Worker / Service |
| `GET` | `/referrals/:id/documents` | List attachments associated with a referral | Referring / Receiving Facility |
| `POST` | `/referrals/:id/documents` | Upload attachment directly against a referral | Referring / Receiving Facility |
| `GET` | `/patients/:id/documents` | List attachments associated with a patient | Registered Facility Staff |
| `POST` | `/patients/:id/documents` | Upload attachment directly against a patient | Registered Facility Staff |

### 3.8 Notification Center (`/notifications`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/notifications` | List user notifications with filtering and pagination | Authenticated |
| `GET` | `/notifications/unread-count` | Get total count of unread notifications | Authenticated |
| `GET` | `/notifications/unread` | Fetch latest unread notifications list | Authenticated |
| `PATCH` | `/notifications/:id/read` | Mark individual notification as read (idempotent) | Notification Owner |
| `PATCH` | `/notifications/:id/unread` | Mark individual notification as unread | Notification Owner |
| `POST` | `/notifications/read-all` | Mark all unread notifications as read | Authenticated |
| `DELETE` | `/notifications/:id` | Dismiss / soft-delete notification | Notification Owner |
| `GET` | `/notifications/preferences` | Retrieve user notification preferences | Authenticated |
| `PUT` | `/notifications/preferences` | Update user notification preferences | Authenticated |

### 3.9 Real-Time Event Infrastructure (`/realtime` & WebSocket)
| Protocol / Method | Endpoint | Description | Access |
|---|---|---|---|
| `WS` | `/ws` | Authenticated real-time WebSocket connection | Authenticated (JWT) |
| `GET` | `/realtime/health` | Real-time WebSocket server health & telemetry probe | Public / Orchestrator |
| `GET` | `/realtime/missed-events` | Reconnection sync endpoint for offline event catchup | Authenticated |
| `GET` | `/realtime/metrics` | Real-time connection, throughput & error metrics | Admin / Regional Officer |
| `POST` | `/realtime/disconnect-user/:userId` | Administrative force disconnect across user sockets | System Administrator |

#### WebSocket Connection & Handshake Specification
- **Path:** `/ws` (or root `/` upgrade)
- **Supported Auth Handshakes:**
  1. HTTP Header: `Authorization: Bearer <jwt_access_token>`
  2. Subprotocol: `Sec-WebSocket-Protocol: careconnect-auth, <jwt_access_token>`
  3. Cookie: `careconnect_access_token=<jwt_access_token>`
  4. First-Frame Message: `{"type": "auth", "token": "<jwt_access_token>"}` within 5000ms
- **Prohibited:** Tokens in URL query parameters (`?token=...`) are rejected with WS Close Code `1008` (Policy Violation).
- **Supported Client Message Types:**
  - `{"type": "subscribe", "channel": "facility:<facilityId>"}`
  - `{"type": "unsubscribe", "channel": "facility:<facilityId>"}`
  - `{"type": "sync", "since": "2026-11-07T10:00:00.000Z", "lastEventId": "uuid"}`
  - `{"type": "ping"}`
- **Server Standard Event Format:**
  ```json
  {
    "eventId": "uuid",
    "type": "referral.status_changed",
    "version": 1,
    "occurredAt": "2026-11-07T12:00:00.000Z",
    "requestId": "req-uuid",
    "data": {
      "referralId": "referral-uuid",
      "status": "ACCEPTED"
    }
  }
  ```


