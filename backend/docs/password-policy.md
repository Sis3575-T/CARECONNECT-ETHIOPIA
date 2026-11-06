# CareConnect Ethiopia — Password Policy & Security Configuration

This document specifies the password hashing parameters, complexity requirements, dictionary blacklists, and verification protocols enforced by the CareConnect Ethiopia backend.

---

## 1. Complexity Requirements

Passwords must meet the following rules before acceptance:
- **Minimum Length:** 8 characters.
- **Maximum Length:** 72 bytes (enforces bcrypt algorithm maximum input ceiling without silent truncation).
- **Character Composition:** Must contain at least one letter (`[a-zA-Z]`) and at least one numeric digit (`[0-9]`).
- **Dictionary Blacklist:** Passwords matching common weak phrases (`password`, `12345678`, `admin123`, `careconnect`, `ethiopia123`, etc.) are rejected with:
  `"Password is too common or easily guessable. Please choose a stronger password."`

---

## 2. Cryptographic Hashing Configuration

Implemented in `backend/src/utils/password.js`.

- **Algorithm:** Bcrypt (via `bcryptjs`).
- **Cost Factor / Salt Rounds:** Default `10` rounds (computes in ~60-80ms per hash, preventing CPU denial-of-service on API servers while effectively mitigating GPU-accelerated rainbow table and offline dictionary attacks).
- **Salt Generation:** Unique CSPRNG salt generated automatically per hash.
- **Constant-Time Comparison:** Password comparisons execute in constant time to prevent timing side-channel attacks that could reveal password lengths or character matches.

---

## 3. Password Reset Security

- **Token Generation:** 32 cryptographically random bytes generated via Node.js `crypto.randomBytes(32)` (64 hex characters).
- **Storage:** The raw reset token is **never stored**. Only its **SHA-256 hash** (`crypto.createHash('sha256').update(token).digest('hex')`) is stored in the database with a 1-hour expiration timestamp.
- **One-Time Use:** When a reset is executed, the token record is marked `is_used = TRUE` and all active sessions across all devices are immediately revoked.
- **Anti-Enumeration Responses:** `POST /api/v1/auth/forgot-password` always returns:
  `"If an account exists with this email address, password reset instructions have been dispatched."`
  This generic response prevents attackers from enumerating registered healthcare staff emails.

---

## 4. Privacy & Logging Standards

- Passwords and reset tokens are strictly filtered and omitted from all console logging, file logging, and error tracking systems.
- Password hashes (`password_hash`) are explicitly omitted from all API responses and model serialization.
