-- CareConnect Ethiopia - Critical Query Optimization & Partial Performance Indexes
-- Version: 033
-- Description: Establishes targeted partial and composite indexes for queue triage, SLA breach monitoring, patient search, and latest-document retrieval

-- 1. Patient Name Prefix & Full-Text Search Optimization
CREATE INDEX IF NOT EXISTS idx_patients_search_names
ON patients (first_name, father_name, grandfather_name)
WHERE deleted_at IS NULL;

-- 2. Pending Assignment Referral Pool (Hospital allocation triage queue)
CREATE INDEX IF NOT EXISTS idx_referrals_pending_assignment
ON referrals (priority, created_at ASC)
WHERE status = 'PENDING_ASSIGNMENT' AND deleted_at IS NULL;

-- 3. SLA Acknowledgement Deadline Monitor (Fast scan for pending breaches)
CREATE INDEX IF NOT EXISTS idx_referrals_sla_ack_monitor
ON referrals (acknowledgement_deadline ASC)
WHERE status = 'SUBMITTED' AND deleted_at IS NULL;

-- 4. SLA Decision Deadline Monitor (Fast scan for pending hospital decision breaches)
CREATE INDEX IF NOT EXISTS idx_referrals_sla_dec_monitor
ON referrals (decision_deadline ASC)
WHERE status IN ('ACKNOWLEDGED', 'INFO_REQUESTED') AND deleted_at IS NULL;

-- 5. Latest Document Retrieval by Patient (Omits superseded document versions)
CREATE INDEX IF NOT EXISTS idx_documents_patient_latest
ON referral_documents (patient_id, created_at DESC)
WHERE is_latest = TRUE AND deleted_at IS NULL;

-- 6. Latest Document Retrieval by Referral
CREATE INDEX IF NOT EXISTS idx_documents_referral_latest
ON referral_documents (referral_id, created_at DESC)
WHERE is_latest = TRUE AND deleted_at IS NULL;

-- 7. Document Verification Worklist (Pending review filter)
CREATE INDEX IF NOT EXISTS idx_documents_pending_verification
ON referral_documents (facility_id, created_at ASC)
WHERE verification_status = 'PENDING_REVIEW' AND deleted_at IS NULL;

-- 8. Document Processing Queue (OCR and AI background worker polling)
CREATE INDEX IF NOT EXISTS idx_documents_pending_processing
ON referral_documents (created_at ASC)
WHERE processing_status = 'PENDING' AND deleted_at IS NULL;

-- 9. Referral Public Tracking Lookup
CREATE INDEX IF NOT EXISTS idx_referrals_tracking_lookup
ON referrals (reference_number)
WHERE deleted_at IS NULL;

-- 10. Audit & System Event High-Velocity Filter
CREATE INDEX IF NOT EXISTS idx_system_events_entity_lookup
ON system_events (source_service, event_category, created_at DESC);
