# CareConnect Ethiopia — Frontend Authentication Integration Contract

This contract defines the exact interface and runtime security behavior that all four independent React + Vite frontend applications must implement when interacting with the backend API:
- **Health Centre Portal** (`http://localhost:5173`)
- **Hospital Portal** (`http://localhost:5174`)
- **Transport Coordinator Portal** (`http://localhost:5175`)
- **System Administrator Portal** (`http://localhost:5176`)

---

## 1. Authentication Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate credentials and establish session | None (Rate limited: 10/15m) |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token and obtain new access token | Refresh Cookie / Token |
| `POST` | `/api/v1/auth/logout` | Terminate current session | Authenticated or Refresh Cookie |
| `POST` | `/api/v1/auth/logout-all` | Terminate all active sessions across all devices | Bearer Access Token |
| `GET` | `/api/v1/auth/me` | Fetch authenticated identity, facility & roles | Bearer Access Token |
| `POST` | `/api/v1/auth/change-password`| Change current account password | Bearer Access Token |
| `POST` | `/api/v1/auth/forgot-password`| Request password reset link/token | None (Rate limited: 5/15m) |
| `POST` | `/api/v1/auth/reset-password` | Complete password reset using secure token | None |
| `GET` | `/api/v1/auth/sessions` | List active sessions for authenticated account | Bearer Access Token |
| `DELETE`| `/api/v1/auth/sessions/:sessionId` | Revoke a specific active session | Bearer Access Token |
| `GET` | `/api/v1/auth/permissions` | Retrieve current user's resolved permission list | Bearer Access Token |

---

## 2. Login Flow (`POST /api/v1/auth/login`)

### Request
```http
POST /api/v1/auth/login HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "email": "nurse.hanna@bolehealth.gov.et",
  "password": "SecurePassword123"
}
```

### Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "user": {
      "id": 14,
      "email": "nurse.hanna@bolehealth.gov.et",
      "firstName": "Hanna",
      "lastName": "Mulugeta",
      "roleId": 1,
      "roleName": "HEALTH_CENTRE_STAFF",
      "portal": "HEALTH_CENTRE",
      "facilityId": "hc-bole-001",
      "department": "Maternal & Child Health",
      "jobTitle": "Senior Triage Nurse"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```
*Note: A hardened `Set-Cookie: careconnect_refresh=...; HttpOnly; SameSite=Lax; Path=/api/v1/auth` header is automatically set on browser requests with `credentials: 'include'`.*

---

## 3. Token Storage & Axios Interceptors

1. **Access Token Storage:**
   - Store `accessToken` exclusively in **React application memory** (e.g. React Context, Zustand, or module variable).
   - **Never store access tokens in `localStorage` or `sessionStorage`**.
2. **Axios Authorization Header:**
   - Attach the access token on every outgoing request:
     ```javascript
     apiClient.interceptors.request.use((config) => {
       if (accessToken) {
         config.headers.Authorization = `Bearer ${accessToken}`;
       }
       return config;
     });
     ```
3. **Automatic Token Refresh (401 Interceptor):**
   - When any API call returns HTTP 401, catch the error in an Axios response interceptor.
   - Dispatch `POST /api/v1/auth/refresh` (with `{ withCredentials: true }`).
   - If refresh succeeds, update memory with the new `accessToken` and retry the queued request.
   - If refresh fails (HTTP 401/403), purge application state and redirect the user to `/login`.

---

## 4. Role & Portal Boundary Rules

1. Each portal must verify the user's assigned portal before granting access to its dashboard:
   - Health Centre Portal requires: `portal === 'HEALTH_CENTRE'` (or `ADMINISTRATOR`)
   - Hospital Portal requires: `portal === 'HOSPITAL'` (or `ADMINISTRATOR`)
   - Transport Coordinator Portal requires: `portal === 'TRANSPORT'` (or `ADMINISTRATOR`)
   - Administrator Portal requires: `portal === 'ADMINISTRATOR'`
2. If a user attempts to log into the incorrect portal (e.g. an ambulance driver logging into Hospital Portal), the frontend must display an informative notice and redirect to their designated portal.

---

## 5. Security & Error Response Handling

All responses follow the unified CareConnect JSON error contract:
```json
{
  "success": false,
  "message": "Access token has expired. Please refresh session.",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token has expired. Please refresh session.",
    "details": [],
    "timestamp": "2026-11-06T19:00:00.000Z"
  },
  "requestId": "req-abcdef1234567890"
}
```

- **HTTP 400 (`VALIDATION_ERROR`):** Display field-level errors beside form inputs.
- **HTTP 401 (`UNAUTHORIZED`):** Attempt refresh; if unresolvable, transition to login screen.
- **HTTP 403 (`FORBIDDEN`):** Display access denied notice (user lacks required role, permission, or facility tenancy).
- **HTTP 429 (`RATE_LIMIT_EXCEEDED`):** Inform user of rate limiting; read `retryAfter` seconds.
