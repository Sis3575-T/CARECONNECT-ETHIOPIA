# CareConnect Ethiopia — 220-Task Comprehensive Development Roadmap

This document outlines the complete 220-task engineering roadmap for CareConnect Ethiopia, broken down into 22 sequential phases of 10 tasks each. Development strictly adheres to sequential execution, automated testing, atomic Git commits, and zero-mock backend integration.

## Architecture Overview

- **Frontend**: 4 independent Vite + React applications (`portals/health-centre`, `portals/hospital`, `portals/transport`, `portals/administrator`)
- **Backend**: Node.js / Express API with PostgreSQL database layer (`backend/`)
- **Database**: PostgreSQL schema with 18 migrations, strict foreign keys, GIS/spatial coordinates, and transactional audit trails (`database/`)
- **AI Service**: Python / FastAPI microservice for OCR (Tesseract/Amharic), referral triage, hospital recommendation, and delay forecasting (`ai-service/`)

---

## Roadmap Index

- [Phase 1: Project Foundation (Tasks 001–010)](#phase-1-project-foundation)
- [Phase 2: Database Foundation (Tasks 011–020)](#phase-2-database-foundation)
- [Phase 3: Database Completion (Tasks 021–030)](#phase-3-database-completion)
- [Phase 4: Backend Foundation (Tasks 031–040)](#phase-4-backend-foundation)
- [Phase 5: Authentication and Authorization (Tasks 041–050)](#phase-5-authentication-and-authorization)
- [Phase 6: User and Facility Management (Tasks 051–060)](#phase-6-user-and-facility-management)
- [Phase 7: Patient Management (Tasks 061–070)](#phase-7-patient-management)
- [Phase 8: Core Referral Management (Tasks 071–080)](#phase-8-core-referral-management)
- [Phase 9: Referral Workflow and Coordination (Tasks 081–090)](#phase-9-referral-workflow-and-coordination)
- [Phase 10: Document and File Management (Tasks 091–100)](#phase-10-document-and-file-management)
- [Phase 11: Transportation Backend (Tasks 101–110)](#phase-11-transportation-backend)
- [Phase 12: Notifications and Reporting Backend (Tasks 111–120)](#phase-12-notifications-and-reporting-backend)
- [Phase 13: AI Service Foundation (Tasks 121–130)](#phase-13-ai-service-foundation)
- [Phase 14: OCR and NLP (Tasks 131–140)](#phase-14-ocr-and-nlp)
- [Phase 15: AI Classification and Recommendation (Tasks 141–150)](#phase-15-ai-classification-and-recommendation)
- [Phase 16: Advanced AI Functions (Tasks 151–160)](#phase-16-advanced-ai-functions)
- [Phase 17: AI Assistant and Integration (Tasks 161–170)](#phase-17-ai-assistant-and-integration)
- [Phase 18: Health Centre Frontend (Tasks 171–180)](#phase-18-health-centre-frontend)
- [Phase 19: Hospital Frontend (Tasks 181–190)](#phase-19-hospital-frontend)
- [Phase 20: Transport Frontend (Tasks 191–200)](#phase-20-transport-frontend)
- [Phase 21: Administrator Frontend (Tasks 201–210)](#phase-21-administrator-frontend)
- [Phase 22: Integration, Security, Testing and Deployment (Tasks 211–220)](#phase-22-integration-security-testing-and-deployment)

---

## Phase 1: Project Foundation

**Task Range:** Tasks 001 to 010

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 001** | chore: initialize CareConnect Ethiopia repository | Verified root project structure and directory layout matches Part 1.3 specification |
| **Task 002** | docs: add project overview and objectives | Validated comprehensive project overview, objectives, stakeholder matrix, and problem statement in docs/OVERVIEW.md |
| **Task 003** | docs: add software requirements specification | Validated SDS document structure, functional requirements FR1-FR8, non-functional requirements NFR1-NFR6, state machine, and data flow in docs/SDS.md |
| **Task 004** | docs: add system architecture documentation | Validated system architecture documentation, port specifications, dual-service communication pattern, and sequence workflows in docs/ARCHITECTURE.md |
| **Task 005** | chore: configure root npm workspace | Verified npm workspace configuration across 4 portals and backend in root package.json and backend/package.json |
| **Task 006** | chore: configure shared development scripts | Verified root npm scripts (dev:backend, dev:ai, test:backend) and dev-orchestrator.js port scanner across all 6 service ports |
| **Task 007** | chore: configure environment variable templates | Verified 7 environment variable templates across root, backend, ai-service, and 4 portals with safe defaults and zero exposed secrets |
| **Task 008** | chore: configure gitignore and repository hygiene | Verified .gitignore exclusion patterns for node_modules, python venv/cache, credentials, upload directories, and test coverage using git check-ignore |
| **Task 009** | chore: configure code formatting and linting | Verified .prettierrc.json, .prettierignore, eslint.config.js, and ai-service/pyproject.toml syntax and schema validity |
| **Task 010** | docs: add initial installation and setup guide | Validated installation and setup guide across Node.js, Python, PostgreSQL, and port map in docs/SETUP.md |

## Phase 2: Database Foundation

**Task Range:** Tasks 011 to 020

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 011** | db: configure PostgreSQL connection | Verified PostgreSQL connection pool, query execution wrapper, and testConnection health check in database/connection.js and backend/src/config/database.js |
| **Task 012** | db: create initial migration structure | Verified database/migrate.js runner with schema_migrations table, status listing, and 001_initial_migration_tracker.sql |
| **Task 013** | db: create roles and permissions tables | Verified 002_create_roles_and_permissions.sql with roles, permissions, role_permissions join table, and foundational seed data |
| **Task 014** | db: create users table | Verified 003_create_users.sql with authentication fields, role relations, facility tenancy identifiers, and index constraints |
| **Task 015** | db: create healthcare facilities table | Verified 004_create_healthcare_facilities.sql with facility classification tiers, geographic coordinates, capacity metrics, and diagnostic equipment flags |
| **Task 016** | db: create facility services table | Verified 005_create_facility_services.sql with clinical_services catalog, facility capability mapping, specialist on duty flags, and unique constraints |
| **Task 017** | db: create facility capacity table | Verified 006_create_facility_capacity.sql with time-stamped capacity reports, ventilator/ICU counts, compound indexes, and latest-capacity view v_facility_current_capacity |
| **Task 018** | db: create patients table | Verified 007_create_patients.sql with patronymic naming structure, Fayda national ID, Kebele metadata, and allergies/chronic history fields |
| **Task 019** | db: create referrals table | Verified 008_create_referrals.sql with status state machine, clinical triage priorities, vital signs, and origin/destination facility foreign keys |
| **Task 020** | db: add initial database constraints and indexes | Verified 009_create_constraints_and_indexes.sql with cross-table foreign key constraints, priority/status/gender/tier check constraints, and composite indexes |

## Phase 3: Database Completion

**Task Range:** Tasks 021 to 030

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 021** | db: create referral documents table | Verified 010_create_referral_documents.sql with document types, mime validation metadata, OCR status transitions, and referral foreign key cascade |
| **Task 022** | db: create referral events table | Verified 011_create_referral_events.sql with status machine transitions, actor metadata, and JSONB event payload auditing |
| **Task 023** | db: create transport records table | Verified 012_create_transport_records.sql with transport_resources fleet registry, trip coordination, distance/delay tracking, and route endpoints |
| **Task 024** | db: create referral feedback table | Verified 013_create_referral_feedback.sql with clinical outcome categories, Likert rating constraints (1-5), and bidirectional audit links |
| **Task 025** | db: create notifications table | Verified 014_create_notifications.sql with user/facility multi-target recipients, priority escalations, read tracking, and entity foreign references |
| **Task 026** | db: create audit logs table | Verified 015_create_audit_logs.sql with security severity categorization, IP/UserAgent tracing, JSONB payload context, and resource type indexes |
| **Task 027** | db: create AI recommendations table | Verified 016_create_ai_recommendations.sql with ranking order, transparent factor breakdown scoring, transit calculation metrics, and clinician selection tracking |
| **Task 028** | db: create AI predictions table | Verified 017_create_ai_predictions.sql with prediction types, confidence scores, features audit JSONB, model provenance, and clinician review verification fields |
| **Task 029** | db: create AI model versions and feedback tables | Verified 018_create_ai_models_and_feedback.sql with model version registry, accuracy metrics, feedback collection schema, and baseline model seeds |
| **Task 030** | db: implement database seeds and relationship tests | Ran database/tests/relationship.test.js (4/4 tests passed) and database/seed.js validation covering all 18 migration scripts and fictional Ethiopian demo records |

## Phase 4: Backend Foundation

**Task Range:** Tasks 031 to 040

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 031** | backend: initialize Express application | Ran backend/tests/app.test.js (3/3 tests passed) verifying Express application instance, middleware, and welcome route in backend/src/app.js |
| **Task 032** | backend: configure environment and application settings | Ran backend/tests/config.test.js (5/5 tests passed) verifying safe environment parsing, CORS origin parsing, JWT windows, and production security audits in backend/src/config/env.js |
| **Task 033** | backend: configure PostgreSQL database client | Ran backend/tests/dbService.test.js (3/3 tests passed) verifying DbService methods query, queryOne, queryMany, transaction, and healthCheck |
| **Task 034** | backend: add centralized error handling | Ran backend/tests/errorHandler.test.js (3/3 tests passed) verifying AppError, ValidationError, NotFoundError, centralized JSON schema, and 404 handler |
| **Task 035** | backend: add request validation middleware | Ran backend/tests/validate.test.js (3/3 tests passed) verifying schema validation, required fields, data type sanitation, enum guards, and 400 error reporting |
| **Task 036** | backend: configure CORS and security headers | Ran backend/tests/security.test.js (3/3 tests passed) verifying Helmet HTTP security headers and CORS allowed-origin validation across portal origins |
| **Task 037** | backend: add request logging | Ran backend/tests/logger.test.js (3/3 tests passed) verifying X-Request-Id correlation generation, distributed header preservation, and structured logging |
| **Task 038** | backend: add API versioning | Ran backend/tests/versioning.test.js (2/2 tests passed) verifying /api/v1 master router, v1 metadata, and service directory mappings in backend/src/routes/v1/index.js |
| **Task 039** | backend: add health check endpoint | Ran backend/tests/health.test.js (3/3 tests passed) verifying diagnostics, database connection probes, memory telemetry, and liveness endpoints |
| **Task 040** | backend: add API documentation foundation | Ran backend/tests/docs.test.js (2/2 tests passed) verifying OpenAPI 3.0 documentation route /api/v1/docs and authored comprehensive docs/API.md specification |

## Phase 5: Authentication and Authorization

**Task Range:** Tasks 041 to 050

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 041** | backend: implement user registration | Ran backend/tests/register.test.js (3/3 tests passed) verifying user registration, duplicate prevention, and response sanitization |
| **Task 042** | backend: implement secure password hashing | Ran backend/tests/password.test.js (3/3 tests passed) verifying bcrypt salting rounds, hash non-reversibility, comparison matching, and strength complexity rules |
| **Task 043** | backend: implement user login | Ran backend/tests/login.test.js (4/4 tests passed) verifying login credential authentication, password verification, active status checking, and 401 rejection for invalid/non-existent credentials |
| **Task 044** | backend: implement access token management | Ran backend/tests/token.test.js (4/4 tests passed) verifying JWT access token generation, Bearer header authentication middleware, and GET /api/v1/auth/me profile protection |
| **Task 045** | backend: implement refresh token management | Ran backend/tests/refresh.test.js (4/4 tests passed) verifying dual token login (access + refresh), token renewal endpoint /api/v1/auth/refresh, and revocation handling in TokenModel |
| **Task 046** | backend: implement logout and token revocation | Ran backend/tests/logout.test.js (2/2 tests passed) verifying POST /api/v1/auth/logout, refresh token revocation, and prevention of revoked token replay |
| **Task 047** | backend: implement role-based authorization | Ran backend/tests/rbac.test.js (5/5 tests passed) verifying requireRole, requirePortal, cross-portal separation, and administrator access |
| **Task 048** | backend: implement facility-based access restrictions | Ran backend/tests/facilityTenancy.test.js (4/4 tests passed) verifying facility tenancy boundaries, cross-facility prevention, and administrator oversight exceptions |
| **Task 049** | backend: implement account activation and deactivation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 050** | backend: add authentication and authorization tests | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 6: User and Facility Management

**Task Range:** Tasks 051 to 060

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 051** | backend: implement user management APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 052** | backend: implement user profile APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 053** | backend: implement role management APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 054** | backend: implement facility registration APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 055** | backend: implement facility update APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 056** | backend: implement facility search and filtering | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 057** | backend: implement facility services APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 058** | backend: implement facility capacity reporting APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 059** | backend: implement facility location APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 060** | backend: test user and facility management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 7: Patient Management

**Task Range:** Tasks 061 to 070

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 061** | backend: implement patient registration | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 062** | backend: implement patient information updates | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 063** | backend: implement patient search | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 064** | backend: implement patient details endpoint | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 065** | backend: implement patient referral history | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 066** | backend: implement patient access restrictions | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 067** | backend: implement patient input validation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 068** | backend: implement patient record audit events | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 069** | backend: add patient pagination and filtering | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 070** | backend: test patient management workflows | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 8: Core Referral Management

**Task Range:** Tasks 071 to 080

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 071** | backend: implement referral creation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 072** | backend: implement unique referral number generation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 073** | backend: implement referral information validation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 074** | backend: implement referral update | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 075** | backend: implement referral submission | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 076** | backend: implement incoming referral retrieval | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 077** | backend: implement referral details endpoint | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 078** | backend: implement referral acknowledgement | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 079** | backend: implement referral acceptance and rejection | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 080** | backend: implement additional information requests | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 9: Referral Workflow and Coordination

**Task Range:** Tasks 081 to 090

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 081** | backend: implement referral status transition rules | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 082** | backend: implement referral event history | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 083** | backend: implement referral cancellation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 084** | backend: implement referral assignment and reassignment rules | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 085** | backend: implement referral filtering and pagination | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 086** | backend: implement referral timeline API | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 087** | backend: implement referral feedback API | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 088** | backend: implement referral outcome management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 089** | backend: implement referral closure rules | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 090** | backend: test complete referral lifecycle | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 10: Document and File Management

**Task Range:** Tasks 091 to 100

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 091** | backend: configure secure file upload | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 092** | backend: implement document type validation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 093** | backend: implement document size validation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 094** | backend: implement referral document storage | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 095** | backend: implement document retrieval authorization | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 096** | backend: implement document deletion rules | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 097** | backend: implement document processing status | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 098** | backend: implement document audit events | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 099** | backend: implement document upload tests | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 100** | docs: document secure document management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 11: Transportation Backend

**Task Range:** Tasks 101 to 110

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 101** | backend: implement transport request creation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 102** | backend: implement transport request listing | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 103** | backend: implement transport assignment | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 104** | backend: implement transport resource management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 105** | backend: implement transport status transitions | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 106** | backend: implement transport departure updates | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 107** | backend: implement transport arrival updates | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 108** | backend: implement transport delay reporting | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 109** | backend: implement transport history | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 110** | backend: test transportation workflows | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 12: Notifications and Reporting Backend

**Task Range:** Tasks 111 to 120

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 111** | backend: implement notification creation service | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 112** | backend: implement notification retrieval | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 113** | backend: implement notification read status | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 114** | backend: implement referral event notifications | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 115** | backend: implement transport notifications | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 116** | backend: implement administrative delay alerts | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 117** | backend: implement health centre dashboard statistics | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 118** | backend: implement hospital dashboard statistics | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 119** | backend: implement transport dashboard statistics | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 120** | backend: implement administrator analytics APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 13: AI Service Foundation

**Task Range:** Tasks 121 to 130

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 121** | ai: initialize Python AI service | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 122** | ai: configure FastAPI application | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 123** | ai: configure Python dependencies | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 124** | ai: implement AI service health checks | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 125** | ai: implement AI request validation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 126** | ai: implement AI error handling | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 127** | ai: implement AI logging | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 128** | ai: configure model and dataset directories | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 129** | ai: implement model version management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 130** | ai: add AI service tests | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 14: OCR and NLP

**Task Range:** Tasks 131 to 140

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 131** | ai: configure Tesseract OCR | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 132** | ai: implement document image preprocessing | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 133** | ai: implement OCR extraction endpoint | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 134** | ai: implement OCR extraction result validation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 135** | ai: implement referral information extraction | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 136** | ai: implement referral text normalization | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 137** | ai: implement referral summarization | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 138** | ai: implement referral completeness checking | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 139** | ai: implement English and Amharic text handling | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 140** | ai: test OCR and NLP processing | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 15: AI Classification and Recommendation

**Task Range:** Tasks 141 to 150

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 141** | ai: prepare referral classification dataset | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 142** | ai: implement referral category preprocessing | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 143** | ai: train initial referral classification model | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 144** | ai: evaluate referral classification model | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 145** | ai: implement referral classification API | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 146** | ai: implement hospital service matching | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 147** | ai: implement facility distance calculation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 148** | ai: implement hospital recommendation ranking | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 149** | ai: implement recommendation explanations | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 150** | ai: test hospital recommendation results | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 16: Advanced AI Functions

**Task Range:** Tasks 151 to 160

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 151** | ai: implement approved referral review flags | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 152** | ai: implement historical referral delay dataset preparation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 153** | ai: implement baseline delay estimation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 154** | ai: train referral delay prediction model | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 155** | ai: evaluate delay prediction performance | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 156** | ai: implement potential duplicate referral detection | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 157** | ai: implement hospital workload analysis | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 158** | ai: implement referral anomaly detection | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 159** | ai: implement referral pattern analytics | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 160** | ai: add AI model performance reporting | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 17: AI Assistant and Integration

**Task Range:** Tasks 161 to 170

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 161** | ai: implement system knowledge base | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 162** | ai: implement grounded system assistant | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 163** | ai: implement administrative translation service | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 164** | ai: implement referral status explanation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 165** | ai: implement AI feedback collection | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 166** | backend: configure AI service client | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 167** | backend: implement secure AI request forwarding | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 168** | backend: implement AI processing result storage | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 169** | backend: implement AI processing status management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 170** | integration: test backend and AI communication | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 18: Health Centre Frontend

**Task Range:** Tasks 171 to 180

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 171** | frontend(health): initialize independent Vite application | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 172** | frontend(health): implement branding and design system | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 173** | frontend(health): implement authentication pages | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 174** | frontend(health): implement dashboard | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 175** | frontend(health): implement patient management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 176** | frontend(health): implement referral creation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 177** | frontend(health): implement document upload and AI review | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 178** | frontend(health): implement hospital recommendation interface | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 179** | frontend(health): implement referral tracking and timeline | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 180** | frontend(health): implement reports and responsive navigation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 19: Hospital Frontend

**Task Range:** Tasks 181 to 190

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 181** | frontend(hospital): initialize independent Vite application | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 182** | frontend(hospital): implement branding and design system | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 183** | frontend(hospital): implement authentication pages | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 184** | frontend(hospital): implement hospital dashboard | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 185** | frontend(hospital): implement incoming referral management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 186** | frontend(hospital): implement referral details and review | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 187** | frontend(hospital): implement acknowledgement and response actions | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 188** | frontend(hospital): implement patient arrival management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 189** | frontend(hospital): implement facility services and capacity management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 190** | frontend(hospital): implement feedback and reporting | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 20: Transport Frontend

**Task Range:** Tasks 191 to 200

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 191** | frontend(transport): initialize independent Vite application | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 192** | frontend(transport): implement branding and design system | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 193** | frontend(transport): implement authentication pages | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 194** | frontend(transport): implement transport dashboard | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 195** | frontend(transport): implement transport request management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 196** | frontend(transport): implement transport assignment forms | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 197** | frontend(transport): implement in-transit management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 198** | frontend(transport): implement facility map and route visualization | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 199** | frontend(transport): implement transport resource management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 200** | frontend(transport): implement transport reports and responsive UI | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 21: Administrator Frontend

**Task Range:** Tasks 201 to 210

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 201** | frontend(admin): initialize independent Vite application | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 202** | frontend(admin): implement branding and design system | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 203** | frontend(admin): implement administrator authentication | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 204** | frontend(admin): implement system overview dashboard | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 205** | frontend(admin): implement user and role management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 206** | frontend(admin): implement healthcare facility management | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 207** | frontend(admin): implement referral monitoring | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 208** | frontend(admin): implement AI management interface | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 209** | frontend(admin): implement analytics and audit logs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 210** | frontend(admin): implement settings and responsive navigation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

## Phase 22: Integration, Security, Testing and Deployment

**Task Range:** Tasks 211 to 220

| Task # | Title | Target Deliverables / Scope |
|---|---|---|
| **Task 211** | integration: connect health centre portal to backend APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 212** | integration: connect hospital portal to backend APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 213** | integration: connect transport portal to backend APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 214** | integration: connect administrator portal to backend APIs | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 215** | security: implement cross-portal access verification | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 216** | test: add complete referral lifecycle integration tests | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 217** | test: add cross-service and AI integration tests | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 218** | test: perform responsive, performance, and security verification | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 219** | deploy: configure independent portal and service deployments | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |
| **Task 220** | docs: finalize installation, deployment, API, and user documentation | Deliver core functionality, schema/routes, validation, and automated unit/integration test suite. |

