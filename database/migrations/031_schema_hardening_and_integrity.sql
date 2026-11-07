-- CareConnect Ethiopia - Schema Hardening, Referential Integrity & State Constraints
-- Version: 031
-- Description: Establishes comprehensive domain check constraints, missing foreign keys, and referential integrity protections

DO $$
BEGIN
    -- 1. Hardened Referral Status Check Constraint (covering all 16 lifecycle statuses)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_referral_status') THEN
        ALTER TABLE referrals DROP CONSTRAINT chk_referral_status;
    END IF;

    ALTER TABLE referrals ADD CONSTRAINT chk_referral_status
    CHECK (status IN (
        'DRAFT',
        'SUBMITTED',
        'PENDING_ASSIGNMENT',
        'ASSIGNED',
        'ACKNOWLEDGED',
        'ACCEPTED',
        'REJECTED',
        'INFO_REQUESTED',
        'TRANSPORT_ASSIGNED',
        'IN_TRANSIT',
        'ARRIVED',
        'PATIENT_ARRIVED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'CLOSED'
    ));

    -- 2. Foreign Key from referrals(policy_id) to referral_response_policies(id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_referrals_policy') THEN
        ALTER TABLE referrals ADD CONSTRAINT fk_referrals_policy
        FOREIGN KEY (policy_id) REFERENCES referral_response_policies(id)
        ON DELETE SET NULL;
    END IF;

    -- 3. Patient Status Check Constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_patient_status') THEN
        ALTER TABLE patients ADD CONSTRAINT chk_patient_status
        CHECK (status IN ('ACTIVE', 'DECEASED', 'MERGED', 'SUSPENDED'));
    END IF;

    -- 4. Patient Merge Integrity Constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_merge_different_patients') THEN
        ALTER TABLE patient_merge_requests ADD CONSTRAINT chk_merge_different_patients
        CHECK (source_patient_id <> target_patient_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_merge_status') THEN
        ALTER TABLE patient_merge_requests ADD CONSTRAINT chk_merge_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));
    END IF;

    -- 5. Document State & Verification Constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_document_verification_status') THEN
        ALTER TABLE referral_documents ADD CONSTRAINT chk_document_verification_status
        CHECK (verification_status IN (
            'UPLOADED',
            'PENDING_REVIEW',
            'VERIFIED',
            'REJECTED',
            'REQUIRES_CORRECTION',
            'ARCHIVED'
        ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_document_processing_status') THEN
        ALTER TABLE referral_documents ADD CONSTRAINT chk_document_processing_status
        CHECK (processing_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_document_version_positive') THEN
        ALTER TABLE referral_documents ADD CONSTRAINT chk_document_version_positive
        CHECK (version_number > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_document_file_size_positive') THEN
        ALTER TABLE referral_documents ADD CONSTRAINT chk_document_file_size_positive
        CHECK (file_size IS NULL OR file_size > 0);
    END IF;

    -- 6. Operational Escalation Constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_escalation_level') THEN
        ALTER TABLE referral_escalations ADD CONSTRAINT chk_escalation_level
        CHECK (escalation_level IN (1, 2, 3));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_escalation_status') THEN
        ALTER TABLE referral_escalations ADD CONSTRAINT chk_escalation_status
        CHECK (escalation_status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'));
    END IF;

    -- 7. SLA Policy Deadlines & Versioning Constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sla_ack_positive') THEN
        ALTER TABLE referral_response_policies ADD CONSTRAINT chk_sla_ack_positive
        CHECK (acknowledgement_deadline_minutes > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sla_dec_positive') THEN
        ALTER TABLE referral_response_policies ADD CONSTRAINT chk_sla_dec_positive
        CHECK (decision_deadline_minutes > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sla_version_positive') THEN
        ALTER TABLE referral_response_policies ADD CONSTRAINT chk_sla_version_positive
        CHECK (version > 0);
    END IF;

    -- 8. Referral Information Request Status Constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_info_request_status') THEN
        ALTER TABLE referral_information_requests ADD CONSTRAINT chk_info_request_status
        CHECK (request_status IN ('PENDING', 'RESPONDED', 'CANCELLED'));
    END IF;

    -- 9. Operational Exception Severity Constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exception_severity') THEN
        ALTER TABLE referral_operational_exceptions ADD CONSTRAINT chk_exception_severity
        CHECK (severity IN ('WARNING', 'CRITICAL'));
    END IF;
END $$;

-- Indexes for foreign key relationships and constraint enforcement
CREATE INDEX IF NOT EXISTS idx_referrals_policy_id ON referrals(policy_id);
