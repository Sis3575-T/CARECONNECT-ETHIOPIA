# CareConnect Ethiopia — Database Constraints & Data Integrity

## 1. Integrity Philosophy
Data integrity in CareConnect Ethiopia is enforced at the database persistence tier through declarative constraints rather than relying solely on client or API validation. This guarantees data consistency even in multi-service or concurrent operation environments.

---

## 2. Check Constraints Catalog

| Constraint Name | Table | Rule Definition | Business Justification |
|---|---|---|---|
| `chk_referral_priority` | `referrals` | `priority IN ('ROUTINE', 'URGENT', 'EMERGENCY')` | Enforces triage priority categories aligned with Ethiopian referral guidelines. |
| `chk_referral_status` | `referrals` | 16-state lifecycle (`DRAFT` through `CLOSED`) | Enforces the complete 16-step referral state machine without illegal states. |
| `chk_patient_status` | `patients` | `status IN ('ACTIVE', 'DECEASED', 'MERGED', 'SUSPENDED')` | Enforces controlled patient lifecycle transitions. |
| `chk_patient_gender` | `patients` | `gender IN ('MALE', 'FEMALE', 'OTHER')` | Standardizes demographic classification. |
| `chk_facility_tier` | `healthcare_facilities`| `tier IN ('PRIMARY', 'SECONDARY', 'TERTIARY')` | Governs appropriate clinical referral routing. |
| `chk_capacity_reporting_bounds`| `facility_capacity_reports`| Non-negative integers for all bed counts | Prevents erroneous negative bed/ICU occupancy values. |
| `chk_transport_delay_duration`| `transport_delays` | `delay_duration_minutes > 0` | Ensures delay incidents record valid durations. |
| `chk_ai_review_verdict` | `ai_human_reviews` | `verdict IN ('ACCEPTED', 'MODIFIED', 'REJECTED')` | Enforces mandatory human-in-the-loop review outcomes. |
| `chk_ai_jobs_status` | `ai_processing_jobs` | `status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING')` | Governs asynchronous AI task state transitions. |
| `chk_notif_pref_channel` | `notification_preferences` | `channel IN ('IN_APP', 'SMS', 'EMAIL')` | Restricts delivery to supported notification channels. |
| `feedback_rating_bounds` | `referral_feedback` | `rating >= 1 AND rating <= 5` | Standardizes 5-point Likert clinical quality feedback. |
| `chk_document_verification_status` | `referral_documents` | `status IN ('UPLOADED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'REQUIRES_CORRECTION', 'ARCHIVED')` | Enforces human-verified document workflow states. |
| `chk_document_processing_status` | `referral_documents` | `status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')` | Governs background OCR and document analysis jobs. |
| `chk_document_version_positive` | `referral_documents` | `version_number > 0` | Guarantees strictly positive version numbering. |
| `chk_escalation_level` | `referral_escalations` | `escalation_level IN (1, 2, 3)` | Restricts escalations to defined operational hierarchy. |
| `chk_merge_different_patients` | `patient_merge_requests` | `source_patient_id <> target_patient_id` | Prevents reflexive duplicate merge cycles. |
| `chk_sla_ack_positive` | `referral_response_policies` | `acknowledgement_deadline_minutes > 0` | Enforces strictly positive response SLAs. |

---

## 3. Unique Constraints

1. `uq_patient_identifier (identifier_type, identifier_value)`: Guarantees unique patient identifiers across national Fayda IDs, local Kebele cards, and facility MRNs.
2. `uq_facility_dept (facility_id, code)`: Prevents duplicate department codes within the same healthcare facility.
3. `uq_facility_service (facility_id, service_code)`: Prevents duplicate service capability listings within a facility.
4. `uq_model_version (model_name, version)`: Enforces unique version registry entries for AI models.
5. `uq_user_pref_channel (user_id, channel)`: Enforces single configuration record per user per delivery channel.
6. `users.email (UNIQUE)`: Enforces unique email credentials per user.
7. `transport_resources.plate_number (UNIQUE)`: Enforces distinct vehicle registrations across the fleet.

---

## 4. Referential Action Matrix (Cascade vs Restrict vs Set Null)

- **`ON DELETE RESTRICT`:** Applied to clinical relationships where deletion would destroy medical history (`patients -> referrals`, `healthcare_facilities -> referrals`, `users -> ai_human_reviews`).
- **`ON DELETE CASCADE`:** Applied to dependent child entities that have no independent lifecycle (`referrals -> referral_documents`, `referrals -> referral_events`, `referrals -> ai_recommendations`, `users -> user_sessions`).
- **`ON DELETE SET NULL`:** Applied to optional actor references where the audit history must survive account deactivation (`users -> audit_logs.user_id`, `users -> referrals.referring_clinician_id`).
