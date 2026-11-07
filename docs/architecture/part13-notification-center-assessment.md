# CareConnect Ethiopia — Part 13 Architectural Assessment
## In-App Notification Center, Notification Preferences, Read/Unread Management and User Communication APIs

### 1. Executive Context & Objectives
In-app communication and alerting represent a mission-critical bridge between asynchronous domain events (referrals, transport dispatches, clinical triage decisions, SLA breaches) and healthcare professionals operating across Ethiopia's multi-tiered referral network (Woreda Health Centres, Primary Hospitals, General/Specialized Tertiary Referral Hospitals, and Regional Transport Units).

Part 13 builds a production-grade, secure, multi-tenant in-app notification center that guarantees:
- **Strict Clinical Privacy**: Zero transmission of raw patient identifiers, full diagnoses, or unprotected clinical notes in alerts.
- **Tenancy & Facility Scoping**: Complete isolation of hospital- and facility-specific notifications to prevent accidental information leaks.
- **User Ownership & RBAC**: Every in-app alert is strictly addressed to a verified recipient; cross-user reading or tampering is rejected at the database and middleware levels.
- **Transactional Outbox Event Ingestion**: Event consumption decoupled from primary transactional workflows via PostgreSQL `outbox_events`.
- **Granular Preference Management**: Users configure notification channels while protecting non-negotiable operational and security mandates.

---

### 2. Analysis of Existing Infrastructure (Parts 01–12)

1. **Database Schema State**:
   - `Migration 014` defined a baseline `notifications` table (`id SERIAL`, `recipient_user_id`, `recipient_facility_id`, `title`, `message`, `notification_type`, `entity_type`, `entity_id`, `priority`, `is_read`, `read_at`, `created_at`).
   - `Migration 023` established a baseline `notification_preferences` table (`user_id`, `channel`, `is_enabled`, specific boolean event columns).
   - `Migration 035` introduced `notification_deliveries` (`id UUID`, `channel`, `recipient_address`, `status`, `deduplication_key`, `error_message`).
   - **Gaps Identified**:
     - `notifications` lacks a `uuid` field for unified client references, `category` categorization, soft-dismissal states (`is_dismissed`, `dismissed_at`), safe JSONB `metadata`, and database-level `deduplication_key` enforcement.
     - Partial index on `(recipient_user_id, is_read)` is missing filter for active (non-dismissed) unread notifications.
     - User preferences require support for modern categories (e.g. `COORDINATION_TASK`, `ESCALATION`, `SECURITY`, `SYSTEM`) and mandatory category rules.

2. **Backend Services**:
   - `notificationDeliveryService.js` (Part 12) coordinates channel providers (`inAppProvider`, `emailProvider`, `smsProvider`).
   - `inAppProvider.js` writes basic records into `notifications`.
   - **Gaps Identified**:
     - No centralized recipient resolution engine that evaluates user roles, facility assignments, and active account status.
     - No template rendering service with non-PII compliance and XSS/HTML sanitization.
     - No user-facing REST API for querying notifications, unread counts, reading/dismissing, or editing preferences.

---

### 3. Target Schema Enhancement (`Migration 036`)

Migration `036_in_app_notifications_and_preferences_schema.sql` extends the existing schema non-destructively:
- Alter `notifications`:
  - Add `uuid UUID DEFAULT gen_random_uuid() UNIQUE`.
  - Add `category VARCHAR(50) DEFAULT 'REFERRAL_UPDATE'`.
  - Add `is_dismissed BOOLEAN DEFAULT FALSE`.
  - Add `dismissed_at TIMESTAMP WITH TIME ZONE`.
  - Add `deduplication_key VARCHAR(255)`.
  - Add `metadata JSONB DEFAULT '{}'::jsonb`.
  - Add unique constraint/index on `(recipient_user_id, deduplication_key)` where `deduplication_key IS NOT NULL`.
  - Add composite index for high-speed unread badge count queries: `(recipient_user_id, is_read, is_dismissed, created_at DESC)`.
- Enhance `notification_preferences`:
  - Add `preferences JSONB DEFAULT '{}'::jsonb` to store extensible category mappings.
  - Enforce mandatory categories (`SECURITY`, `ESCALATION`, `REFERRAL_CRITICAL`).

---

### 4. Implementation Phasing (Commits 097–104)

- **Commit 097**: Establish notification center data architecture, migration 036, domain constants, and repository.
- **Commit 098**: Implement secure recipient resolution (facility assignments, role permissions, active status).
- **Commit 099**: Implement safe templates, XSS prevention, and transactional outbox event ingestion.
- **Commit 100**: Implement notification preferences, mandatory category enforcement, and audit trails.
- **Commit 101**: Implement read/unread operations, fast unread count, dismissal, and ownership guards.
- **Commit 102**: Implement REST APIs (`/api/v1/notifications`), validation, pagination, and OpenAPI spec.
- **Commit 103**: Implement delivery tracking, provider failure tolerance, and retention/archival cleanup.
- **Commit 104**: End-to-end verification suite (`part13Comprehensive.test.js`) and regression test execution.
