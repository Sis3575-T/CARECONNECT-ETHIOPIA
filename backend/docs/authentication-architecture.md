# CareConnect Ethiopia — Authentication Architecture & Security Strategy

This document specifies the technical architecture for authentication, authorization, and secure session management across the CareConnect Ethiopia platform.

---

## 1. Unified Identity Architecture

All four frontend applications authenticate against a single, centralized backend identity authority:
1. **Health Centre Portal** (`http://localhost:5173`)
2. **Hospital Portal** (`http://localhost:5174`)
3. **Transport Coordinator Portal** (`http://localhost:5175`)
4. **System Administrator Portal** (`http://localhost:5176`)

There are **zero independent user databases** or siloed credentials. Every user account has a single identity in the PostgreSQL `users` table, linked to one or more system roles in `roles` / `user_roles` and affiliated with a healthcare facility or regional administrative unit.

---

## 2. Token Lifecycle & Dual-Delivery Strategy

```
Frontend Client                   CareConnect Backend API                 PostgreSQL (Neon)
      │                                     │                                     │
      │── 1. POST /api/v1/auth/login ──────>│                                     │
      │      (email, password)              │── 2. Verify Bcrypt Hash ───────────>│
      │                                     │<── User Record (Active, Unlocked) ──│
      │                                     │                                     │
      │                                     │── 3. Generate Access Token (15m)    │
      │                                     │── 4. Generate CSPRNG Refresh Token  │
      │                                     │── 5. Insert SHA-256 Hash ──────────>│
      │                                     │      into user_sessions             │
      │<── 6. 200 OK Response ──────────────│                                     │
      │      Set-Cookie: HttpOnly Refresh   │                                     │
      │      JSON: { accessToken, user }    │                                     │
```

### 2.1 Short-Lived Access Tokens
- **Format:** Signed JSON Web Token (JWT).
- **Algorithm:** Explicitly enforced HMAC-SHA256 (`HS256`). Rejects unsigned `none` algorithms.
- **Lifetime:** 15 minutes (`900` seconds).
- **Issuer / Audience:** `iss: 'careconnect-backend'`, `aud: 'careconnect-portals'`.
- **Payload Minimization:** Contains only essential claims:
  - `userId` (Primary key integer)
  - `email` (Normalized string)
  - `roleId` (Primary role identifier)
  - `roleName` (System role name)
  - `facilityId` (Affiliated facility UUID/ID)
  - `portal` (Allowed portal scope)

### 2.2 Secure Refresh Tokens & Session Records
- **Generation:** 64-byte cryptographically secure pseudorandom token (`crypto.randomBytes(64).toString('hex')`).
- **Storage:** Only the **SHA-256 cryptographic hash** is stored in the PostgreSQL `user_sessions` table (`refresh_token_hash`).
- **Raw Token Security:** Raw refresh tokens are never written to disk, databases, or application log files.
- **Rotation:** Every `/api/v1/auth/refresh` request revokes the previous refresh token and issues a fresh refresh token linked to the same `family_id`.
- **Reuse Detection:** If an already-rotated or revoked refresh token is submitted, the system flags a token theft attempt, invalidates all sessions belonging to the `family_id`, and records a `CRITICAL` security audit event.

---

## 3. Account Status & Lockout Lifecycle

1. **Active Check:** Inactive accounts (`is_active = FALSE` or `deleted_at IS NOT NULL`) are immediately denied with HTTP 401.
2. **Account Lockout:**
   - Tracks `failed_login_attempts` in `users`.
   - After **5 consecutive failed attempts**, the account is locked for **15 minutes** (`locked_until = NOW() + INTERVAL '15 minutes'`).
   - If a login attempt occurs while locked, returns HTTP 401 with a generic error message avoiding brute-force account enumeration.
   - Successful authentication resets `failed_login_attempts` to `0` and clears `locked_until`.

---

## 4. Password Security Standards

- **Hashing:** Bcrypt with 10–12 salt rounds (or Argon2id where native bindings permit).
- **Verification:** Secure constant-time comparison to prevent timing side-channel attacks.
- **Complexity Requirements:**
  - Minimum 8 characters in length.
  - At least one uppercase or lowercase ASCII letter.
  - At least one numeric digit.
  - Checked against common dictionary weak passwords (`password`, `12345678`, `admin123`, `careconnect`, etc.).
- **Response Privacy:** Generic error messages (`Invalid email or password credentials`) are returned uniformly whether the email exists or not.
