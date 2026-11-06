# CareConnect Ethiopia — Relational Entity Relationships & Ownership

## 1. Relational Cardinality & Ownership Matrix

This document defines entity ownership, relationship cardinalities, cascading rules, and referential integrity constraints across the nine database domains.

```text
+-----------------------+-------------+-----------------------+------------------+----------------------+
| Parent Entity         | Card.       | Child Entity          | Foreign Key      | Delete Behavior      |
+-----------------------+-------------+-----------------------+------------------+----------------------+
| roles                 | 1 : N       | role_permissions      | role_id          | CASCADE              |
| permissions           | 1 : N       | role_permissions      | permission_id    | CASCADE              |
| roles                 | 1 : N       | users                 | role_id          | RESTRICT             |
| users                 | 1 : N       | user_roles            | user_id          | CASCADE              |
| roles                 | 1 : N       | user_roles            | role_id          | CASCADE              |
| users                 | 1 : N       | user_sessions         | user_id          | CASCADE              |
| healthcare_facilities | 1 : N       | users                 | facility_id      | SET NULL             |
| healthcare_facilities | 1 : N       | facility_departments  | facility_id      | CASCADE              |
| healthcare_facilities | 1 : N       | facility_services     | facility_id      | CASCADE              |
| clinical_services     | 1 : N       | facility_services     | service_code     | RESTRICT             |
| healthcare_facilities | 1 : N       | facility_capacity     | facility_id      | CASCADE              |
| healthcare_facilities | 1 : N       | patients              | registered_fac_id| SET NULL             |
| patients              | 1 : N       | patient_identifiers   | patient_id       | CASCADE              |
| patients              | 1 : N       | patient_contacts      | patient_id       | CASCADE              |
| patients              | 1 : N       | referrals             | patient_id       | RESTRICT             |
| healthcare_facilities | 1 : N       | referrals (Origin)    | origin_fac_id    | RESTRICT             |
| healthcare_facilities | 1 : N       | referrals (Dest)      | destination_fac_id| RESTRICT            |
| users                 | 1 : N       | referrals (Referrer)  | referring_clin_id| SET NULL             |
| users                 | 1 : N       | referrals (Receiver)  | receiving_clin_id| SET NULL             |
| referrals             | 1 : N       | referral_events       | referral_id      | CASCADE              |
| referrals             | 1 : N       | referral_status_hist  | referral_id      | CASCADE              |
| referrals             | 1 : N       | referral_decisions    | referral_id      | CASCADE              |
| referrals             | 1 : N       | referral_feedback     | referral_id      | CASCADE              |
| referrals             | 1 : N       | referral_documents    | referral_id      | CASCADE              |
| referral_documents    | 1 : N       | document_access_logs  | document_id      | CASCADE              |
| healthcare_facilities | 1 : N       | transport_resources   | assigned_fac_id  | SET NULL             |
| referrals             | 1 : N       | transport_records     | referral_id      | CASCADE              |
| transport_resources   | 1 : N       | transport_records     | resource_id      | SET NULL             |
| transport_records     | 1 : N       | transport_delays      | transport_rec_id | CASCADE              |
| transport_records     | 1 : N       | transport_status_hist | transport_rec_id | CASCADE              |
| referrals             | 1 : N       | ai_processing_jobs    | referral_id      | CASCADE              |
| referrals             | 1 : N       | ai_recommendations    | referral_id      | CASCADE              |
| referrals             | 1 : N       | ai_predictions        | referral_id      | CASCADE              |
| ai_predictions        | 1 : N       | ai_human_reviews      | prediction_id    | CASCADE              |
| ai_predictions        | 1 : N       | ai_feedback           | prediction_id    | CASCADE              |
| users                 | 1 : N       | notifications         | recipient_user_id| CASCADE              |
| healthcare_facilities | 1 : N       | notifications         | recipient_fac_id | CASCADE              |
| users                 | 1 : N       | audit_logs            | user_id          | SET NULL             |
+-----------------------+-------------+-----------------------+------------------+----------------------+
```

---

## 2. Business Relationship Integrity Rules

### Rule 1: Patient Referral Ownership (RESTRICT on Delete)
Patients cannot be deleted while active referral records reference them. Deleting a patient with active clinical referrals is blocked (`ON DELETE RESTRICT`) to preserve medical history and accountability.

### Rule 2: Origin and Destination Facility Preservation
Referrals and transport requests cannot have their origin or destination facilities deleted (`ON DELETE RESTRICT`). If a health facility is decommissioned or temporarily closed, its `is_active` status must be set to `FALSE`, preserving all historical transfer paths.

### Rule 3: User Accountability & Anonymization
When user accounts are deactivated or removed, audit logs and clinical decision history must not be deleted. Foreign keys on `audit_logs.user_id`, `referrals.referring_clinician_id`, and `referrals.receiving_clinician_id` use `ON DELETE SET NULL`, ensuring historical audit events remain immutable even if an account is pruned.

### Rule 4: Multi-Facility Tenancy & Staff Scoping
A user belongs primarily to one home facility (`users.facility_id`), which defines default data tenancy boundaries in the Health Centre and Hospital Portals. Cross-facility staff assignments (`facility_staff_assignments`) support temporary duty stations while maintaining explicit audit records.

### Rule 5: Traceable State Machines
Neither referrals nor transport records allow arbitrary in-place status mutation without an accompanying entry in `referral_status_history` and `transport_status_history`. This ensures full chronological traceability for clinical and legal audits.
