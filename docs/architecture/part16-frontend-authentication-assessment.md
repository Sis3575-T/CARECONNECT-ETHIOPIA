# CareConnect Ethiopia — Frontend Authentication Architecture Assessment
## Part 16 of 50: Authentication Frontend, Portal Login Experiences, Session Management & Protected User Access

**Date:** 2026-11-07  
**Author:** CareConnect Ethiopia Architecture Team  
**Status:** Approved for Implementation (Commits 121–128)

---

## 1. Executive Summary & Objective

CareConnect Ethiopia operates four distinct, role-specialized healthcare portals:
1. **Health Centre Referral Portal** (Port 5173 / `health-centre`): Primary care intake, digital referral generation, AI triage slip scanning.
2. **Hospital Specialist Portal** (Port 5174 / `hospital`): Secondary/tertiary triage, ICU/emergency bed allocation, surgical acceptance.
3. **Transport Coordinator Portal** (Port 5175 / `transport`): Fleet dispatch, driver routing, telemetry, and inter-facility transit tracking.
4. **System Administrator Portal** (Port 5176 / `administrator`): Ministry of Health (MoH) governance, RBAC audit, facility directory, and AI telemetry.

This architecture assessment evaluates the integration between the backend authentication subsystem established in Parts 04 & 11 and the shared frontend architecture created in Part 15. The core security imperative is that **all authorization and authentication decisions must remain server-authoritative**. Under no circumstances may a client-side selection or UI manipulation grant elevated privileges or unauthorized facility/portal access.

---

## 2. Backend Authentication Contracts & Inspection

The backend implements a battle-hardened authentication architecture under `/api/v1/auth` (port 5000) using Express, PostgreSQL/Neon, bcrypt password hashing, JWT access tokens, and server-managed session tokens.

### 2.1 API Endpoints Specification

| Method | Endpoint | Auth Required | Purpose | Payload / Parameters | Success Response Envelope |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | No (Rate-limited) | User authentication | `{ email, password }` | `{ success: true, message: "...", data: { user, accessToken, refreshToken, sessionId, expiresIn } }` |
| `POST` | `/api/v1/auth/refresh` | Optional Header / Cookie / Body | Rotate tokens & renew access | `{ refreshToken? }` + Cookie | `{ success: true, message: "...", data: { accessToken, refreshToken, expiresIn } }` |
| `POST` | `/api/v1/auth/logout` | Optional Bearer | Revoke active session | `{ refreshToken? }` + Cookie | `{ success: true, message: "Session terminated successfully" }` |
| `POST` | `/api/v1/auth/logout-all` | Yes (Bearer) | Terminate all user sessions across devices | None | `{ success: true, message: "All active sessions have been terminated" }` |
| `GET` | `/api/v1/auth/me` | Yes (Bearer) | Fetch current user profile & status | None | `{ success: true, data: { user: { id, email, firstName, lastName, roleId, facilityId, department, jobTitle, isActive } } }` |
| `GET` | `/api/v1/auth/permissions` | Yes (Bearer) | Fetch user role permissions & portal | None | `{ success: true, data: { roleId, roleName, portal, permissions: [...] } }` |
| `POST` | `/api/v1/auth/change-password` | Yes (Bearer) | Update user password | `{ currentPassword, newPassword }` | `{ success: true, message: "Password changed successfully" }` |
| `POST` | `/api/v1/auth/forgot-password` | No (Rate-limited) | Request reset token (anti-enumeration) | `{ email }` | `{ success: true, message: "..." }` |
| `POST` | `/api/v1/auth/reset-password` | No (Rate-limited) | Consume reset token & update password | `{ token, newPassword }` | `{ success: true, message: "Password has been reset successfully" }` |
| `GET` | `/api/v1/auth/sessions` | Yes (Bearer) | List all active sessions for user | None | `{ success: true, data: { sessions: [...] } }` |
| `DELETE` | `/api/v1/auth/sessions/:id` | Yes (Bearer) | Revoke specific session | URL Param `sessionId` | `{ success: true, message: "Session revoked successfully" }` |

### 2.2 User Object Structure
```json
{
  "id": 12,
  "email": "dr.alemayehu@careconnect.gov.et",
  "firstName": "Alemayehu",
  "lastName": "Bekele",
  "roleId": 1,
  "roleName": "HEALTH_CENTRE_REFERRAL_CLINICIAN",
  "portal": "HEALTH_CENTRE",
  "facilityId": 101,
  "department": "Outpatient Referrals",
  "jobTitle": "Senior Clinical Officer",
  "isActive": true
}
```

---

## 3. Server-Authoritative Role-to-Portal Authorization Matrix

The backend is strictly authoritative regarding a user's role and facility assignment. A user cannot elevate their access simply by navigating to a specific portal's URL.

| Portal | Portal Key | Target Port | Authorized Primary Roles | Oversight Roles (Permitted) | Unauthorized Roles Action |
|---|---|---|---|---|---|
| **Health Centre** | `health_centre` | 5173 | `HEALTH_CENTRE_REFERRAL_CLINICIAN`<br>`PRIMARY_CARE_PHYSICIAN`<br>`CLINICAL_NURSE` | `SYSTEM_ADMINISTRATOR`<br>`REGIONAL_OFFICER` | Show Role Mismatch Alert with link to user's assigned portal |
| **Hospital** | `hospital` | 5174 | `HOSPITAL_TRIAGE_CLINICIAN`<br>`EMERGENCY_PHYSICIAN`<br>`CHIEF_CLINICAL_OFFICER` | `SYSTEM_ADMINISTRATOR`<br>`REGIONAL_OFFICER` | Show Role Mismatch Alert with link to user's assigned portal |
| **Transport** | `transport` | 5175 | `TRANSPORT_COORDINATOR`<br>`AMBULANCE_DISPATCHER`<br>`AMBULANCE_DRIVER` | `SYSTEM_ADMINISTRATOR`<br>`REGIONAL_OFFICER` | Show Role Mismatch Alert with link to user's assigned portal |
| **Administrator** | `administrator` | 5176 | `SYSTEM_ADMINISTRATOR`<br>`REGIONAL_OFFICER`<br>`MOH_DATA_ANALYST` | None (Strict MoH access) | Reject access, redirect to authorized clinical/transport portal |

---

## 4. Token & Session Lifecycle Architecture

### 4.1 Token Storage Strategy
1. **Access Token (Short-lived, 15 minutes / 900 seconds):**
   - Stored in memory in `AuthContext` state for active API requests.
   - Persisted in browser `localStorage` under `careconnect_access_token` to support page reloads across the 4 portals.
   - Automatically attached to every outbound request via Axios request interceptor: `Authorization: Bearer <accessToken>`.
2. **Refresh Token (Long-lived, 7 days):**
   - Stored in HttpOnly cookie `cc_refresh_token` by the backend whenever supported.
   - As a resilient fallback for cross-origin or independent dev server scenarios, stored in secure local storage (`careconnect_refresh_token`).
3. **Session Restoration (`/api/v1/auth/me`):**
   - When the user opens or refreshes a portal, `AuthContext` initializes with `loading: true`.
   - If an access token exists, it calls `authService.getCurrentUser()`.
   - If valid, user context is re-established with latest facility, department, and role data.
   - If the access token has expired (401), the client seamlessly invokes `authService.refreshToken()`.
   - If refresh fails or token is revoked, user is logged out and redirected to `/login`.

### 4.2 Auto-Refresh & Request Queueing
When concurrent requests receive a `401 Unauthorized`:
1. The first failed request triggers a token refresh via `authService.refreshToken()`.
2. Subsequent 401 requests enter a pending promise queue.
3. Once the refresh succeeds, all queued requests are retried with the new access token.
4. If token refresh fails (e.g. refresh token expired or reused), the queue is rejected, tokens are cleared, and the multi-tab event `careconnect:session_expired` is broadcast.

### 4.3 Multi-Tab Synchronization
- `window.addEventListener('storage')` detects `careconnect_access_token` and `careconnect_user` removals from other tabs.
- When an operator logs out in Tab A, Tabs B, C, and D immediately clear their authenticated context and transition to the login page.
- Prevents stale healthcare session reuse on shared workstation computers in Ethiopian clinics.

---

## 5. Security & Usability Hardening Principles

1. **Anti-Enumeration:**
   - Password reset and login failures return identical generic timing-safe error messages.
2. **Accessible Form Feedback:**
   - WCAG 2.1 AA compliant error announcements via `aria-live="polite"`.
   - Visible high-contrast focus rings on all input fields and action buttons.
3. **Zero Plaintext Credential Retention:**
   - Passwords are never stored in `localStorage`, `sessionStorage`, or window object.
   - Passwords are wiped from form state upon submission.
4. **Facility Context Display:**
   - Authenticated user interface clearly indicates current assigned health facility (`facilityId`, name) and clinician role.
