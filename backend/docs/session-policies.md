# CareConnect Ethiopia — Session Lifecycle & Cookie Security Policies

This policy outlines session lifecycle management, browser cookie parameters, CSRF defense mechanisms, and session revocation protocols.

---

## 1. Browser Cookie Strategy

When browser applications (React + Vite portals) communicate with the backend API, refresh tokens are delivered via hardened HTTP cookies.

| Attribute | Setting | Justification |
|---|---|---|
| `HttpOnly` | `true` | Prevents browser JavaScript access; mitigates Cross-Site Scripting (XSS) token theft. |
| `Secure` | `true` in production (`false` in local HTTP development) | Enforces TLS transmission to prevent plaintext interception. |
| `SameSite` | `Lax` (or `Strict` for top-level navigation) | Defends against Cross-Site Request Forgery (CSRF) in cross-origin requests. |
| `Path` | `/api/v1/auth` | Scopes the cookie strictly to authentication endpoints (`/refresh`, `/logout`). |
| `Max-Age` | `604800` (7 days) | Matches refresh token expiration. |

> [!NOTE]
> `localStorage` and `sessionStorage` **MUST NOT** be used to store refresh tokens in any of the four portals due to vulnerability to XSS exploits. Short-lived access tokens are held exclusively in browser memory.

---

## 2. Refresh Token Rotation & Family Invalidation

```
Session Family (family_id = UUID_A)
   ├── Token 1 (Active) ──> Used to refresh ──> Revoked (Rotated)
   └── Token 2 (Active) ──> Used to refresh ──> Revoked (Rotated)
         └── Token 3 (Active)

Replay Attack Scenario:
   Attacker uses leaked Token 1 (Already Revoked)
         │
         ▼
   Backend detects Reuse!
         │
         ├── Revokes Token 1, Token 2, Token 3 (Entire Family UUID_A)
         └── Logs REFRESH_TOKEN_REUSED Security Alert
```

- When `POST /api/v1/auth/refresh` is received, the backend hashes the incoming refresh token.
- If the token is found and active (`is_revoked = FALSE` and `expires_at > NOW()`):
  1. The existing session record is marked revoked (`is_revoked = TRUE`, `revoked_at = NOW()`).
  2. A new session record is created sharing the same `family_id`.
  3. A new cryptographically secure refresh token is issued and set in the cookie / response.
  4. A fresh 15-minute access token is generated.
- If the incoming token is found but **already revoked**:
  1. An attacker or out-of-order client is attempting token reuse.
  2. All sessions matching `family_id` are immediately revoked.
  3. A security audit event `REFRESH_TOKEN_REUSED` is logged with IP address and User-Agent.
  4. HTTP 401 Unauthorized is returned.

---

## 3. Cross-Site Request Forgery (CSRF) Handling

Because cookie-based authentication introduces CSRF vulnerability on cross-origin mutations:
1. State-changing requests (`POST /refresh`, `POST /logout`, `POST /change-password`) require a custom header:
   `x-csrf-token` or `x-requested-with: XMLHttpRequest`.
2. Cross-origin requests without authorized `Origin` headers are blocked by the CORS origin whitelist (`backend/src/config/cors.js`).
3. For non-browser and mobile clients, bearer authentication via `Authorization: Bearer <token>` or JSON body refresh tokens bypasses cookie-specific CSRF requirements cleanly.

---

## 4. Session Revocation Operations

1. **Current Session Logout (`POST /api/v1/auth/logout`):**
   - Marks the specific session record revoked in `user_sessions`.
   - Clears the refresh cookie with `Max-Age: 0`.
2. **Global Account Logout (`POST /api/v1/auth/logout-all`):**
   - Marks **all** active sessions for the calling `user_id` as revoked.
   - Used immediately following password changes, compromise detection, or explicit user action.
3. **Administrative Suspension:**
   - When an administrator deactivates or locks a user account, all active user sessions are invalidated immediately in the database.
