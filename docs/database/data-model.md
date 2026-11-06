# CareConnect Ethiopia — Relational Data Model Specification

## 1. Architectural Principles & Normalization Strategy

The CareConnect Ethiopia relational schema is engineered to Third Normal Form (3NF) across transactional clinical workflows, with Boyce-Codd Normal Form (BCNF) applied to reference lookups and catalogs. Selective denormalization is restricted to immutable audit records and structured JSONB columns where polymorphic telemetry, model feature vectors, and dynamic event context demand high schema flexibility without relational overhead.

### Primary Key Architecture
1. **UUID Primary & Alternate Keys:** Every major operational entity (`users`, `healthcare_facilities`, `patients`, `referrals`, `referral_documents`, `transport_records`, `ai_processing_jobs`) incorporates a globally unique UUID (`UUID DEFAULT gen_random_uuid()`).
2. **Human-Readable Business Keys:** Clinical users and dispatchers require human-friendly codes on paper slips and phone calls. Standard alphanumeric identifiers (e.g. `REF-20261105-00042`, `PAT-2026-00101`, `FAC-HC-KAZANCHIS`, `AMB-AA-01`) are maintained as indexed primary or natural unique keys.
3. **High-Frequency Surrogate Keys:** High-velocity audit logs and event streams (`referral_events`, `audit_logs`, `notifications`) utilize `BIGSERIAL` / `SERIAL` to ensure continuous write throughput and minimal B-tree fragmentation.

---

## 2. Domain Data Dictionary

### Domain A: Identity and Access Management
- **`roles`**: System roles defining portal access boundaries (`HEALTH_CENTRE_STAFF`, `HOSPITAL_STAFF`, `HOSPITAL_TRIAGE`, `TRANSPORT_COORDINATOR`, `AMBULANCE_DRIVER`, `SYSTEM_ADMINISTRATOR`, `REGIONAL_OFFICER`).
- **`permissions`**: Fine-grained authorization permissions categorized by module (`patient:create`, `referral:triage`, `transport:dispatch`, etc.).
- **`role_permissions`**: Composite join table mapping many-to-many relationships between roles and permissions.
- **`users`**: Authenticated staff profiles storing email, Bcrypt password hash, personal details, active status, and primary facility association.
- **`user_roles`**: Many-to-many relationship enabling secondary role grants (e.g. clinician acting as interim facility administrator).
- **`user_sessions`**: Active session records tracking JWT refresh token hashes, client IP, user agent, expiration, and revocation timestamps.

### Domain B: Healthcare Facilities
- **`facility_types`**: Normalized classification of healthcare delivery tiers (`HEALTH_CENTRE`, `PRIMARY_HOSPITAL`, `GENERAL_HOSPITAL`, `TERTIARY_HOSPITAL`).
- **`healthcare_facilities`**: Master facility registry including Amharic names, geographical coordinates (`latitude`, `longitude`, `altitude`), catchment zone, bed capacity, emergency department status, and operational flags.
- **`facility_departments`**: Functional units within facilities (Emergency, Obstetrics, Pediatric ICU, Surgical Ward, Radiology).
- **`clinical_services`**: Standardized catalog of clinical specialties and diagnostic interventions.
- **`facility_services`**: Join table defining available services per facility, specialist-on-duty flags, and operating hours.
- **`facility_capacity_reports`**: Periodic shift reports capturing bed/ICU/ventilator occupancy.
- **`facility_staff_assignments`**: Historical record of staff stationing across facilities and clinical departments.

### Domain C: Patients
- **`patients`**: Core patient demographic records following Ethiopian patronymic naming conventions (`first_name`, `father_name`, `grandfather_name`), age, gender, national Fayda ID, kebele residency, and baseline medical metadata.
- **`patient_identifiers`**: Multi-identifier registry accommodating local Kebele cards, hospital-specific Medical Record Numbers (MRN), and national Fayda IDs.
- **`patient_emergency_contacts`**: Normalized emergency contact directory capturing relationships, physical addresses, and verified phone numbers.

### Domain D: Referral Lifecycle Management
- **`referrals`**: Core patient transfer entity tracking clinical diagnosis, vital signs, reason for referral, required specialty, priority (`ROUTINE`, `URGENT`, `EMERGENCY`), origin health centre, destination hospital, and referral status.
- **`referral_status_history`**: Strict state transition ledger documenting every milestone (`DRAFT` -> `SUBMITTED` -> `ACKNOWLEDGED` -> `ACCEPTED`/`REJECTED` -> `TRANSPORT_ASSIGNED` -> `IN_TRANSIT` -> `ARRIVED` -> `COMPLETED`).
- **`referral_decisions`**: Formal clinical evaluation record from the receiving triage physician documenting acceptance, rejection category, or additional stabilization requirements.
- **`referral_feedback`**: Clinical counter-referral outcome feedback sent back to the originating health centre upon patient discharge.

### Domain E: Clinical Documents and OCR
- **`referral_documents`**: Metadata for uploaded medical attachments, paper referral slips, lab results, and ultrasound images. Stores secure object storage URIs (S3/cloud storage) rather than exposed local paths.
- **`document_access_logs`**: Confidentiality access trail recording every instance a clinical file is viewed or downloaded.

### Domain F: Emergency Transportation Coordination
- **`transport_resources`**: Ambulance fleet registry tracking vehicle plate number, type (Basic Life Support vs. Advanced Life Support), equipment flags, driver contact, and GPS coordinates.
- **`transport_records`**: Dispatch requests linked to accepted referrals, documenting assignment, departure, route distance, and arrival.
- **`transport_status_history`**: Audit trail of transit milestones (`REQUESTED`, `ASSIGNED`, `DISPATCHED`, `EN_ROUTE`, `ARRIVED`).
- **`transport_delays`**: Incident reports logging roadblocks, severe weather, mechanical breakdown, or transit medical complications.

### Domain G: Notifications Engine
- **`notifications`**: Targeted user and facility notifications for urgent referral events, capacity alerts, and transit delays.
- **`notification_preferences`**: User-level notification delivery preferences (In-app, SMS, Email).

### Domain H: AI Decision Subsystem Governance
- **`ai_processing_jobs`**: Asynchronous task tracking for document OCR, clinical text classification, and facility recommendation pipelines.
- **`ai_recommendations`**: Explainable destination hospital recommendations scored across distance, clinical specialty match, available beds, and historical acceptance.
- **`ai_predictions`**: Machine learning inferences for transfer delay risk and admission likelihood.
- **`ai_human_reviews`**: Verifiable records of clinician review, acceptance, disagreement, or manual override of AI suggestions.
- **`ai_model_versions`**: Registered model metadata, training dataset bounds, precision, recall, and deployment lifecycle status.
- **`ai_feedback`**: Direct feedback from healthcare providers on AI suggestion accuracy and clinical utility.

### Domain I: Reporting and Security Audit
- **`audit_logs`**: Immutable security event stream logging user logins, patient record inspections, role changes, and administrative actions.
- **`system_events`**: High-level platform events, error diagnostics, and service integration health records.
