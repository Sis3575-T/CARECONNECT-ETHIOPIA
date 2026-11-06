# CareConnect Ethiopia — Database Architecture & Neon Integration

## 1. Overview & Cloud Persistence Architecture

CareConnect Ethiopia utilizes a relational PostgreSQL database hosted on **Neon**, a serverless, branchable cloud PostgreSQL platform. This enables instant branch provisioning for feature testing, automated high availability, and isolated staging environments.

```text
+-----------------------------------------------------------------------------------+
|                         Neon PostgreSQL Infrastructure                            |
+-----------------------------------------------------------------------------------+
| Production Branch   | Protected primary branch serving live API instances         |
| Staging Branch      | Pre-release branch with sanitized test datasets             |
| Development Branch  | Isolated developer branch for schema migration experiments  |
+-----------------------------------------------------------------------------------+
| TLS 1.3 / SSL Encryption Enforced on All Client Pools (sslmode=require)           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Neon Cloud Connection & SSL Configuration

Neon requires encrypted connections (TLS/SSL). When connecting to Neon:
1. **Connection String Format:**
   ```text
   postgresql://[user]:[password]@[endpoint-id].us-east-2.aws.neon.tech/[dbname]?sslmode=require
   ```
2. **Client Configuration (`database/connection.js`):**
   - Automatically detects `.neon.tech` endpoints or `sslmode=require`.
   - Injects `ssl: { rejectUnauthorized: false }` into the `pg` Pool configuration.
   - Prevents SSL certificate negotiation handshake failures common with cloud serverless poolers.

---

## 3. Connection Pooling Strategy

Because Neon serverless architecture provisions connection endpoints dynamically, pool settings must prevent connection saturation:

| Parameter | Value | Rationale |
|---|---|---|
| `max` | `10` (Dev) / `20` (Prod) | Keeps active connections within Neon tenant quotas. |
| `connectionTimeoutMillis` | `5000` (5s) | Fails fast if endpoint is suspended or cold-starting. |
| `idleTimeoutMillis` | `30000` (30s) | Releases idle clients to allow serverless autoscaling. |

---

## 4. Development vs Production Isolation Policy

1. **Development Branches:**
   - Every developer or CI runner connects to an isolated Neon development branch or local PostgreSQL container.
   - Developers must never point their local `.env` to the production Neon endpoint.
2. **Production Protection:**
   - Schema alterations and migrations on the production branch must pass automated schema validation tests before applying.
   - Destructive commands (`DROP DATABASE`, `TRUNCATE`, `DROP TABLE CASCADE`) are strictly prohibited in runtime applications.
3. **No Fake Patient Data in Production:**
   - Demo seeds (`database/seeds/001_demo_seed_data.sql`) are strictly reserved for development and automated testing environments.

---

## 5. Credential Sanitization & Security

All connection strings and query errors passing through `database/connection.js` are processed by `sanitizeConnectionString()`. This guarantees:
- Connection passwords and user tokens are masked (`postgresql://user:********@...`).
- Terminal logs, error monitors, and exception reports never record plaintext database secrets.
- Health check endpoints (`/api/v1/health`) return connectivity flags and server timestamps without exposing hostnames or database usernames.
