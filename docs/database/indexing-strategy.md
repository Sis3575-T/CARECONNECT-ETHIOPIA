# CareConnect Ethiopia — Database Indexing Strategy & Query Optimization

## 1. Indexing Principles

CareConnect Ethiopia optimizes database performance through deliberate, workload-aware indexing designed around the access patterns of the four independent portals:
1. **Foreign Key Indexing:** Every foreign key column is explicitly indexed to eliminate full table sequential scans during joins and cascade evaluations.
2. **Partial (Filtered) Indexes:** High-velocity tables (`referrals`, `transport_records`, `notifications`) leverage `WHERE` clauses to index only active, incomplete, or unread records, saving 60-80% index storage overhead.
3. **Compound Indexes:** Multi-column indexes follow equality-first, range-second ordering to optimize composite filter and sort operations.
4. **No Redundant B-Trees:** Avoid duplicate prefix indexing on tables with primary or unique constraints.

---

## 2. Portal-Specific Indexing Matrix

### 2.1 Health Centre Portal Query Patterns
- **Active Outbound Referrals:**
  ```sql
  CREATE INDEX idx_referrals_hc_active 
  ON referrals(origin_facility_id, status, created_at DESC) 
  WHERE deleted_at IS NULL;
  ```
  *Benefit:* Accelerates the Health Centre referral tracking table by filtering directly for referrals originating from the user's health centre.
- **Clinician Drafts:**
  ```sql
  CREATE INDEX idx_referrals_draft_clinician 
  ON referrals(referring_clinician_id, created_at DESC) 
  WHERE status = 'DRAFT';
  ```

### 2.2 Hospital Portal Query Patterns
- **Incoming Triage Queue:**
  ```sql
  CREATE INDEX idx_referrals_hospital_triage 
  ON referrals(destination_facility_id, priority, created_at DESC) 
  WHERE status IN ('SUBMITTED', 'ACKNOWLEDGED', 'INFO_REQUESTED');
  ```
  *Benefit:* Instant sub-millisecond retrieval of pending triage decisions ordered by priority (Emergency first) and submission time.
- **Awaiting Arrival Check-In:**
  ```sql
  CREATE INDEX idx_referrals_awaiting_arrival 
  ON referrals(destination_facility_id, status) 
  WHERE status IN ('ACCEPTED', 'TRANSPORT_ASSIGNED', 'IN_TRANSIT');
  ```

### 2.3 Transport Coordinator Portal Query Patterns
- **Active Emergency Dispatch Queue:**
  ```sql
  CREATE INDEX idx_transport_active_transfers 
  ON transport_records(status, priority, created_at DESC) 
  WHERE status IN ('REQUESTED', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE');
  ```
- **Ambulance Readiness Lookup:**
  ```sql
  CREATE INDEX idx_transport_available_fleet 
  ON transport_resources(assigned_facility_id, vehicle_type) 
  WHERE status = 'AVAILABLE';
  ```

### 2.4 System Administrator Portal Query Patterns
- **Chronological Audit Trail:**
  ```sql
  CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
  CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
  ```
- **Unread User Alerts:**
  ```sql
  CREATE INDEX idx_notifications_unread_user 
  ON notifications(recipient_user_id, created_at DESC) 
  WHERE is_read = FALSE;
  ```

---

### 2.5 SLA Monitoring & Document Lifecycle Indexes (Part 10 Hardening)

- **SLA Breach Scanners:**
  ```sql
  -- Fast scan for pending SLA acknowledgement breaches
  CREATE INDEX idx_referrals_sla_ack_monitor
  ON referrals (acknowledgement_deadline ASC)
  WHERE status = 'SUBMITTED' AND deleted_at IS NULL;

  -- Fast scan for pending hospital decision breaches
  CREATE INDEX idx_referrals_sla_dec_monitor
  ON referrals (decision_deadline ASC)
  WHERE status IN ('ACKNOWLEDGED', 'INFO_REQUESTED') AND deleted_at IS NULL;
  ```

- **Latest Document Retrieval (Omits historical/superseded records):**
  ```sql
  CREATE INDEX idx_documents_patient_latest
  ON referral_documents (patient_id, created_at DESC)
  WHERE is_latest = TRUE AND deleted_at IS NULL;

  CREATE INDEX idx_documents_referral_latest
  ON referral_documents (referral_id, created_at DESC)
  WHERE is_latest = TRUE AND deleted_at IS NULL;
  ```

- **Background Worker Queues (OCR and Verification):**
  ```sql
  CREATE INDEX idx_documents_pending_verification
  ON referral_documents (facility_id, created_at ASC)
  WHERE verification_status = 'PENDING_REVIEW' AND deleted_at IS NULL;

  CREATE INDEX idx_documents_pending_processing
  ON referral_documents (created_at ASC)
  WHERE processing_status = 'PENDING' AND deleted_at IS NULL;
  ```
