# CareConnect Ethiopia — Environment Configuration Guide

## 1. Environment Architecture & Principles

CareConnect Ethiopia enforces strict separation of configuration and code following the Twelve-Factor App methodology. All credentials, database connection strings, cryptographic secrets, and environment-dependent URLs are injected via environment variables.

### Core Security Rules
1. **Never Commit Secrets:** Real credentials, production passwords, and private API keys must never be committed to Git.
2. **Template Synchronization:** All acceptable environment variables must be documented in `.env.example` with empty or safe development dummy values.
3. **Fail-Safe Startup Validation:** Critical variables (`JWT_ACCESS_SECRET`, `DATABASE_URL`) are validated during backend boot. If missing or insecure in `NODE_ENV=production`, the application halts immediately with an explanatory error.
4. **Client-Side Secret Shielding:** Frontend applications (Vite) only expose variables explicitly prefixed with `VITE_`. Server-side secrets (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `EXTERNAL_SERVICE_API_KEY`) must never carry the `VITE_` prefix and must never be imported into client-side code.

---

## 2. Environment Variables Specification

| Variable | Target Service | Default (Development) | Purpose |
|---|---|---|---|
| `NODE_ENV` | Root / Backend | `development` | Application runtime mode (`development`, `production`, `test`). |
| `DATABASE_URL` | Database / Backend | None (Local fallback) | Full PostgreSQL connection string (supports Neon SSL). |
| `PGHOST` | Database / Backend | `localhost` | Fallback PostgreSQL host. |
| `PGPORT` | Database / Backend | `5432` | Fallback PostgreSQL port. |
| `PGDATABASE` | Database / Backend | `careconnect_db` | Fallback PostgreSQL database name. |
| `PGUSER` | Database / Backend | `postgres` | Fallback PostgreSQL user. |
| `PGPASSWORD` | Database / Backend | `postgres` | Fallback PostgreSQL password. |
| `JWT_ACCESS_SECRET` | Backend API | Dev fallback string | 256-bit secret used to sign short-lived access tokens. |
| `JWT_REFRESH_SECRET` | Backend API | Dev fallback string | 256-bit secret used to sign long-lived refresh tokens. |
| `JWT_EXPIRES_IN` | Backend API | `15m` | Lifetime of user access tokens. |
| `REFRESH_TOKEN_EXPIRES_IN`| Backend API | `7d` | Lifetime of user refresh tokens. |
| `BACKEND_PORT` | Backend API | `5000` | HTTP port for the Node.js Express API. |
| `AI_SERVICE_PORT` | AI Service | `8000` | HTTP port for Python FastAPI AI service. |
| `AI_SERVICE_URL` | Backend API | `http://localhost:8000` | Base URL used by backend to invoke AI microservice. |
| `HEALTH_CENTRE_PORT` | Health Portal | `5173` | Vite dev server port for Health Centre application. |
| `HOSPITAL_PORT` | Hospital Portal | `5174` | Vite dev server port for Hospital application. |
| `TRANSPORT_PORT` | Transport Portal | `5175` | Vite dev server port for Transport Coordinator application.|
| `ADMIN_PORT` | Admin Portal | `5176` | Vite dev server port for System Administrator application.|
| `CORS_ALLOWED_ORIGINS` | Backend API | `http://localhost:5173,...`| Comma-separated list of permitted web origins. |
| `EXTERNAL_SERVICE_API_KEY`| External Gateway | None | Reserved token for third-party service integration. |

---

## 3. Local Development Setup

1. Copy `.env.example` to create `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```
2. For Neon cloud PostgreSQL development:
   - Create a branch on your Neon dashboard.
   - Copy your connection string into `DATABASE_URL`:
     ```env
     DATABASE_URL=postgresql://[user]:[password]@[endpoint].neon.tech/careconnect_db?sslmode=require
     ```
3. Set a strong local development JWT access secret (min 32 chars):
   ```env
   JWT_ACCESS_SECRET=careconnect_super_secure_local_dev_secret_key_32_chars!
   JWT_REFRESH_SECRET=careconnect_super_secure_local_refresh_key_32_chars!
   ```
4. Verify port availability before starting:
   ```bash
   node scripts/dev-orchestrator.js
   ```

---

## 4. Production Secret Configuration

In production environments (e.g. AWS ECS, Render, Railway, Kubernetes, or Docker Swarm):
- Never package `.env` into production container images.
- Inject secrets through container environment parameters or secret management stores (AWS Secrets Manager, HashiCorp Vault, Neon Secrets).
- Ensure `NODE_ENV=production` is set.
- Both `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be distinct, cryptographically random strings (at least 64 characters recommended).
- Ensure `DATABASE_URL` connects with TLS 1.3 enforced (`sslmode=require`).
