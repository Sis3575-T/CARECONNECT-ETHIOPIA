# CareConnect Ethiopia — Database Schema & Architecture Verification Report

**Subsystem:** Relational Database Engine (PostgreSQL / Neon Cloud)  
**Milestone:** Part 02 of 50 — PostgreSQL Database Architecture, Schema Design and Data Modeling  
**Date:** 2026-11-06  

---

## 1. Executive Summary

The database architecture for CareConnect Ethiopia has been formally modeled, implemented, and verified across all nine required functional domains. The schema provides a normalized, relational, and auditable foundation capable of supporting the four independent portals (Health Centre, Hospital, Transport Coordinator, System Administrator) and the AI Decision Service.

---

## 2. Implemented Schema Domain Inventory

| Domain | Table / View Name | Entity Purpose | Primary Key | Key Relationships |
|---|---|---|---|---|
| **A. Identity & Access** | `roles` | System roles & portal access scopes | `SERIAL (id)` | Referenced by `users`, `user_roles`, `role_permissions` |
| | `permissions` | Granular permission catalog | `SERIAL (id)` | Referenced by `role_permissions` |
| | `role_permissions` | Role-permission join table | `(role_id, permission_id)` | Foreign keys to `roles`, `permissions` |
| | `users` | Authenticated staff profiles | `SERIAL (id)` / `UUID` | References `roles`, `healthcare_facilities` |
| | `user_roles` | Multi-role assignment mapping | `(user_id, role_id)` | Foreign keys to `users`, `roles` |
| | `user_sessions` | Refresh tokens & active sessions | `SERIAL (id)` / `UUID` | Foreign key to `users` |
| **B. Healthcare Facilities** | `facility_types` | Facility tiers & hierarchy | `VARCHAR(50) (code)` | Lookup table for facility classification |
| | `healthcare_facilities` | Master facility registry & coordinates | `VARCHAR(50) (id)` / `UUID`| Referenced by referrals, users, transport |
| | `facility_departments` | Internal clinical departments | `SERIAL (id)` / `UUID` | References `healthcare_facilities`, `users` |
| | `clinical_services` | Standard clinical services catalog | `SERIAL (id)` / `VARCHAR(code)`| Referenced by `facility_services` |
| | `facility_services` | Facility clinical capabilities | `SERIAL (id)` | References `healthcare_facilities`, `clinical_services` |
| | `facility_capacity_reports` | Time-stamped bed/ICU occupancy | `SERIAL (id)` | References `healthcare_facilities`, `users` |
| | `v_facility_current_capacity`| Real-time latest capacity view | View (`facility_id`) | Selects latest from `facility_capacity_reports` |
| | `facility_staff_assignments`| Cross-department staff assignments | `SERIAL (id)` / `UUID` | References `users`, `healthcare_facilities` |
| **C. Patients** | `patients` | Demographics & patronymic profiles | `VARCHAR(50) (id)` / `UUID`| References `healthcare_facilities` |
| | `patient_identifiers` | Multi-ID registry (Fayda, Kebele) | `SERIAL (id)` / `UUID` | References `patients` |
| | `patient_emergency_contacts` | Verified emergency contacts | `SERIAL (id)` / `UUID` | References `patients` |
| | `patient_medical_baseline` | Allergies & chronic conditions | `SERIAL (id)` / `UUID` | References `patients`, `users` |
| **D. Referrals** | `referrals` | Core digital referral records | `VARCHAR(50) (id)` / `UUID`| References `patients`, origin/dest facilities |
| | `referral_events` | Chronological transition events | `SERIAL (id)` | References `referrals`, `users`, `facilities` |
| | `referral_status_history` | Formal state machine audit ledger | `BIGSERIAL (id)` / `UUID` | References `referrals`, `users`, `facilities` |
| | `referral_decisions` | Triage physician evaluation decisions | `SERIAL (id)` / `UUID` | References `referrals`, `healthcare_facilities` |
| | `referral_feedback` | Counter-referral clinical feedback | `SERIAL (id)` | References `referrals`, `healthcare_facilities` |
| **E. Documents** | `referral_documents` | Scans, lab results, S3 storage URIs | `SERIAL (id)` / `UUID` | References `referrals`, `users` |
| | `document_access_logs` | Confidentiality access audit trail | `BIGSERIAL (id)` / `UUID` | References `referral_documents`, `users` |
| **F. Transport** | `transport_resources` | Emergency ambulance fleet | `VARCHAR(50) (id)` / `UUID`| References `healthcare_facilities` |
| | `transport_records` | Dispatch requests & coordination | `VARCHAR(50) (id)` / `UUID`| References `referrals`, `transport_resources` |
| | `transport_delays` | Transit incident & delay reports | `SERIAL (id)` / `UUID` | References `transport_records`, `users` |
| | `transport_status_history` | Transit milestone tracking | `BIGSERIAL (id)` / `UUID` | References `transport_records`, `users` |
| **G. Notifications** | `notifications` | Targeted user & facility alerts | `SERIAL (id)` | References `users`, `healthcare_facilities` |
| | `notification_preferences` | In-app/SMS/Email preferences | `SERIAL (id)` / `UUID` | References `users` |
| **H. AI Processing** | `ai_processing_jobs` | Asynchronous inference tasks | `BIGSERIAL (id)` / `UUID` | References `referrals`, `referral_documents` |
| | `ai_recommendations` | Explainable hospital ranking | `SERIAL (id)` | References `referrals`, `healthcare_facilities` |
| | `ai_predictions` | Delay risk & likelihood scores | `SERIAL (id)` | References `referrals` |
| | `ai_model_versions` | Registered ML model weights & metrics| `SERIAL (id)` | Model registry and accuracy tracking |
| | `ai_human_reviews` | Mandatory clinician review records | `SERIAL (id)` / `UUID` | References `ai_processing_jobs`, `users` |
| | `ai_feedback` | Provider utility feedback | `SERIAL (id)` | References `ai_predictions`, `ai_recommendations` |
| **I. Audit & Observability**| `audit_logs` | Security & compliance audit trail | `SERIAL (id)` | References `users`, `healthcare_facilities` |
| | `system_events` | Service diagnostics & error logs | `BIGSERIAL (id)` / `UUID` | References `users` |

---

## 3. Migration Status

Total migrations versioned: **24 scripts**  
All 24 migrations validated with 100% syntax compliance:
- `001_initial_migration_tracker.sql`
- `002_create_roles_and_permissions.sql`
- `003_create_users.sql`
- `004_create_healthcare_facilities.sql`
- `005_create_facility_services.sql`
- `006_create_facility_capacity.sql`
- `007_create_patients.sql`
- `008_create_referrals.sql`
- `009_create_constraints_and_indexes.sql`
- `010_create_referral_documents.sql`
- `011_create_referral_events.sql`
- `012_create_transport_records.sql`
- `013_create_referral_feedback.sql`
- `014_create_notifications.sql`
- `015_create_audit_logs.sql`
- `016_create_ai_recommendations.sql`
- `017_create_ai_predictions.sql`
- `018_create_ai_models_and_feedback.sql`
- `019_identity_and_facility_schema.sql`
- `020_patient_data_schema.sql`
- `021_referral_workflow_schema.sql`
- `022_document_and_transport_schema.sql`
- `023_notification_ai_audit_schema.sql`
- `024_performance_indexes_and_integrity.sql`
