# CareConnect Ethiopia — Backend Database Integration Architecture

## 1. Overview
The backend reuses the Neon PostgreSQL database foundation implemented in Part 02 (`database/connection.js`), re-exported via `backend/src/config/database.js` and abstracted through `DbService` (`backend/src/services/dbService.js`) and repository classes (`backend/src/repositories/`).

---

## 2. Centralized Query and Transaction Interface

```javascript
import DbService from '../services/dbService.js';

// Parameterized Query Execution
const user = await DbService.queryOne('SELECT * FROM users WHERE id = $1', [userId]);

// Transactional Atomicity
await DbService.transaction(async (client) => {
  await client.query('UPDATE facility_capacity_reports SET available_beds = available_beds - 1 WHERE id = $1', [capId]);
  await client.query('INSERT INTO referral_events (referral_id, action, new_status) VALUES ($1, $2, $3)', [refId, 'ACCEPTED', 'ACCEPTED']);
});
```

---

## 3. Resilience & Failure Handling
1. **Connection Pooling:** Single centralized pool shared across the entire Express instance. Connections are acquired only for query execution and returned immediately.
2. **Neon Cloud SSL:** TLS 1.3 enforced with `rejectUnauthorized: false` for cloud serverless endpoints (`.neon.tech`).
3. **Safe Offline Detection:** When PostgreSQL is unconfigured or temporarily offline, `DbService.healthCheck()` returns `{ connected: false, error: ... }` without crashing the HTTP server.
4. **Credential Masking:** Raw database passwords in error traces or URLs are masked via `sanitizeConnectionString()`.
