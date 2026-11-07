# CareConnect Ethiopia — Part 12 Implementation Report
## Background Jobs, Scheduling, Outbox Processing and Notification Delivery Infrastructure

**Document Version:** 1.0.0  
**Status:** Completed & Verified  
**Date:** 2026-11-07  
**Author:** CareConnect Ethiopia Backend Infrastructure Team  
**Milestone:** Part 12 of 50 (Commits 089–096)

---

### Executive Summary & Purpose

Part 12 of the CareConnect Ethiopia development roadmap establishes a resilient, production-grade background processing and asynchronous event delivery subsystem. This infrastructure underpins the operational lifecycle of digital medical referrals across Ethiopia's multi-tiered healthcare system. It automates referral response deadlines, escalation management, multi-channel notifications (In-App, SMS, Email), and asynchronous document processing without sacrificing clinical safety or human primacy.

To maintain operational simplicity, infrastructure cost efficiency, and cloud-native resilience in resource-constrained environments, the system leverages PostgreSQL row-level locks (`SELECT ... FOR UPDATE SKIP LOCKED`) rather than external Redis brokers. This guarantees atomic consistency within Neon/PostgreSQL transactional boundaries while ensuring zero loss of operational events or domain notifications.

---

### Key Architectural Pillars

1. **Transactional Outbox Pattern**:
   Domain events (e.g., `referral:submitted`, `referral:escalation_created`, `document:uploaded`) are persisted within the exact same database transaction as the primary entity state mutation. An asynchronous outbox sweeper claims and publishes these events with guaranteed at-least-once delivery and deduplication via `idempotency_key`.

2. **Row-Level Concurrency Locking (`FOR UPDATE SKIP LOCKED`)**:
   Distributed worker processes safely claim pending jobs and outbox events concurrently across multiple compute instances without race conditions or head-of-line blocking.

3. **Deterministic Error Handling & Exponential Backoff**:
   Errors are classified into transient (network blips, lock timeouts) and permanent (validation failures, schema corruption). Transient errors back off exponentially with randomized jitter to prevent thundering herd retries; permanent errors transition immediately to `FAILED`.

4. **Multi-Instance Distributed Leasing & Leader Election**:
   The `scheduled_tasks_lease` table ensures that recurring background tasks (e.g., hourly SLA sweeps, daily database pruning) execute exclusively on a single worker node across high-availability clusters.

5. **East Africa Time (EAT) & Clinical Working Hours**:
   Scheduling algorithms operate with explicit awareness of Ethiopia's timezone (EAT: UTC+3, no DST) and working schedules (Monday–Friday 08:30–17:30 EAT), ensuring operational deadline calculations reflect localized clinical staffing realities.

6. **Absolute Ethical Mandate & Clinical Boundaries**:
   Operational escalation strictly monitors communication and administrative turnaround times. A background job **NEVER** autonomously diagnoses a patient, alters clinical priority, prescribes treatments, or accepts/rejects referrals.

---

### Database Schema Architecture (`Migration 035`)

Migration `035_background_jobs_and_outbox_schema.sql` establishes four foundational tables:

#### 1. `background_jobs`
- **Purpose**: Stores asynchronous tasks, execution states, retry telemetry, and payloads.
- **Columns**:
  - `id` (UUID, PK)
  - `job_type` (VARCHAR(100), Indexed)
  - `payload` (JSONB)
  - `priority` (VARCHAR(20), `CRITICAL`, `HIGH`, `NORMAL`, `LOW`)
  - `status` (VARCHAR(20), `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`, `SCHEDULED`)
  - `attempts` (INT, default 0)
  - `max_attempts` (INT, default 5)
  - `scheduled_at` (TIMESTAMPTZ)
  - `next_retry_at` (TIMESTAMPTZ)
  - `started_at` / `completed_at` (TIMESTAMPTZ)
  - `locked_by` (VARCHAR(100)) / `locked_at` (TIMESTAMPTZ)
  - `error_summary` (TEXT)
  - `execution_duration_ms` (INT)
  - `created_at` / `updated_at` (TIMESTAMPTZ)
- **Indexes**: Composite index on `(status, priority, scheduled_at, created_at)` for high-throughput `SKIP LOCKED` queries.

#### 2. `outbox_events`
- **Purpose**: Guarantees atomic domain event capture and asynchronous publication.
- **Columns**:
  - `id` (UUID, PK)
  - `aggregate_type` (VARCHAR(50))
  - `aggregate_id` (VARCHAR(100))
  - `event_type` (VARCHAR(100))
  - `payload` (JSONB)
  - `status` (VARCHAR(20), `PENDING`, `PROCESSING`, `PUBLISHED`, `FAILED`)
  - `attempts` / `max_attempts` (INT)
  - `idempotency_key` (VARCHAR(255), UNIQUE)
  - `error_summary` (TEXT)
  - `locked_by` / `locked_at` (TIMESTAMPTZ)
  - `created_at` / `published_at` (TIMESTAMPTZ)

#### 3. `notification_deliveries`
- **Purpose**: Tracks delivery attempts, external provider statuses, and deduplication across notification channels.
- **Columns**:
  - `id` (UUID, PK)
  - `channel` (VARCHAR(20), `IN_APP`, `SMS`, `EMAIL`)
  - `recipient_user_id` (UUID, FK -> `users`)
  - `recipient_address` (VARCHAR(255))
  - `notification_type` (VARCHAR(50))
  - `status` (VARCHAR(20), `PENDING`, `SENT`, `FAILED`, `CANCELLED`)
  - `external_reference` (VARCHAR(255))
  - `deduplication_key` (VARCHAR(255), UNIQUE)
  - `attempts` / `error_details` / `sent_at` / `created_at`

#### 4. `scheduled_tasks_lease`
- **Purpose**: Coordinates multi-instance distributed execution locks for recurring tasks.
- **Columns**:
  - `task_name` (VARCHAR(100), PK)
  - `locked_by` (VARCHAR(100))
  - `locked_until` (TIMESTAMPTZ)
  - `last_run_at` / `next_run_at` / `updated_at` (TIMESTAMPTZ)

---

### Implementation Details Across Commits (089–096)

| Commit | Hash | Description | Core Artifacts |
| :--- | :--- | :--- | :--- |
| **089** | `63e89d3` | `backend: establish background job processing architecture` | Assessment, Migration 035, `jobQueueService.js`, `jobRegistry.js`, `jobs.js` constants, unit test |
| **090** | `cf35743` | `backend: implement reliable job execution and retry handling` | `jobWorker.js` with `FOR UPDATE SKIP LOCKED`, priority dispatch, backoff jitter, crash recovery |
| **091** | `ed6166e` | `backend: implement transactional outbox event processing` | `outboxService.js` supporting transactional insertion, publisher loop, subscriber dispatch |
| **092** | `009399a` | `backend: implement scheduling and recurring job infrastructure` | `schedulerService.js`, distributed lease lock, EAT UTC+3 timezone and working hours calculator |
| **093** | `c8e273b` | `backend: automate referral deadline and escalation processing` | `referralDeadlineService.js`, SLA deadline sweep, exceptions & level-incremented escalations |
| **094** | `5b043f8` | `backend: implement notification delivery infrastructure` | `notificationDeliveryService.js`, providers (`inApp`, `email`, `sms`), non-PII templates |
| **095** | `187f9b3` | `backend: implement job and notification monitoring` | `jobMonitoringService.js`, `/api/v1/jobs` endpoints (`GET /metrics`, `GET /failed`, `POST /retry`) |
| **096** | *(Pending)* | `test: verify background processing scheduling and delivery reliability` | `part12Comprehensive.test.js` (24/24 passed), documentation reports & progress tracking |

---

### Verification Matrix & Test Results

The subsystem underwent rigorous automated testing across unit, integration, and comprehensive end-to-end suites:

1. **Job Queue Architecture**: Priority enqueueing, scheduled status handling, safe cancellation, listing & filtering.
2. **Worker Concurrency & Locking**: Row-level locking verification, in-flight thread bounds, graceful worker shutdown.
3. **Error Handling & Backoff**: Exponential backoff calculation, permanent error discrimination, crash recovery sweeps.
4. **Transactional Outbox**: Atomic transaction inclusion, idempotency key deduplication, subscriber dispatch.
5. **Distributed Leasing**: Distributed leadership contention, lease TTL expiration, clock-synchronized leader transfer.
6. **Ethiopian Timezone Calculations**: UTC to EAT (+3 hrs) translation, weekday 08:30–17:30 clinical hours evaluation.
7. **Referral SLA Monitoring**: Overdue acknowledgement/decision escalation, suppression of terminal referrals (`CANCELLED`, `REJECTED`, `COMPLETED`).
8. **Multi-Channel Notification**: In-App, SMS, Email provider dispatches, deduplication keys, portal deep-links without clinical PII.
9. **Administrative Controls**: RBAC restrictions (System Administrator only), failed job inspection, manual operator retry/cancel.

---

### Operational & Production Readiness

- **Zero Redis Dependency**: Backed entirely by PostgreSQL tables and row-level locks, reducing cloud operational surface and deployment complexity.
- **Graceful Lifecycle Management**: Workers intercept termination signals (`SIGINT`, `SIGTERM`), halt new poll cycles, and allow in-flight tasks up to 5000ms to complete before terminating database connections.
- **Stale Lock Reclamation**: Autonomous recovery processes periodically scan for jobs locked by dead or partitioned worker instances and safely reset them to `PENDING`.
- **Backward Compatibility**: All existing APIs and domain services remain fully functional without regression.

---

### Conclusion & Next Steps

Part 12 delivers a resilient foundation for asynchronous execution and notification delivery in CareConnect Ethiopia. With all 24 comprehensive scenarios verified and regression suites passing, backend infrastructure is ready for subsequent roadmap phases.

**Status**: Ready for Part 13 upon user approval (`NEXT`).
