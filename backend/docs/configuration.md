# CareConnect Ethiopia — Backend Configuration Architecture

## 1. Overview
The backend configuration system in `backend/src/config/env.js` safely parses, validates, and provides sensible defaults for application settings across Development, Test, and Production modes.

---

## 2. Configuration Inventory

| Variable | Required in Prod | Default (Dev) | Description |
|---|---|---|---|
| `NODE_ENV` | Optional | `development` | Runtime environment (`development`, `test`, `production`). |
| `PORT` / `BACKEND_PORT` | Optional | `5000` | Port for the Express HTTP server. |
| `HOST` | Optional | `0.0.0.0` | Network interface to bind to. |
| `API_BASE_URL` | Optional | `http://localhost:5000/api/v1` | Public root for API routes. |
| `DATABASE_URL` | **YES** | Local PG fallback | PostgreSQL connection string (supports Neon SSL). |
| `JWT_ACCESS_SECRET` | **YES (min 32 chars)**| Dev fallback | 256-bit secret for signing access tokens. |
| `JWT_REFRESH_SECRET` | **YES (min 32 chars)**| Dev fallback | 256-bit secret for signing refresh tokens. |
| `FRONTEND_ALLOWED_ORIGINS`| Optional | All 4 portals | Comma-separated list of permitted web origins. |
| `AI_SERVICE_URL` | Optional | `http://localhost:8000` | Microservice URL for FastAPI AI engine. |
| `EXTERNAL_SERVICE_API_KEY`| Optional | None | Reserved secret for external integration gateway. |
| `LOG_LEVEL` | Optional | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`). |

---

## 3. Production Validation Rules
When `NODE_ENV=production`:
1. `validateProductionSettings()` executes at startup.
2. If `JWT_ACCESS_SECRET` / `JWT_SECRET` is unset or fewer than 32 characters, the application raises a security alert.
3. If `DATABASE_URL` is unset or points to default local credentials (`postgres:postgres`), startup issues a fatal configuration error.
