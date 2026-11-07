-- CareConnect Ethiopia - Data Integrity, Uniqueness & Concurrency Safeguards
-- Version: 032
-- Description: Establishes unique partial constraints, race condition prevention, and explicit foreign key cascades

DO $$
BEGIN
    -- 1. Foreign Key: Ensure Document Parent, Verifier, and Archiver have explicit FK references
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_parent') THEN
        ALTER TABLE referral_documents ADD CONSTRAINT fk_documents_parent
        FOREIGN KEY (parent_document_id) REFERENCES referral_documents(id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_verifier') THEN
        ALTER TABLE referral_documents ADD CONSTRAINT fk_documents_verifier
        FOREIGN KEY (verified_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_archiver') THEN
        ALTER TABLE referral_documents ADD CONSTRAINT fk_documents_archiver
        FOREIGN KEY (archived_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL;
    END IF;

    -- 2. Foreign Key: Ensure Referral Cancelled By and Closed By have explicit FK references
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_referrals_cancelled_by') THEN
        ALTER TABLE referrals ADD CONSTRAINT fk_referrals_cancelled_by
        FOREIGN KEY (cancelled_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_referrals_closed_by') THEN
        ALTER TABLE referrals ADD CONSTRAINT fk_referrals_closed_by
        FOREIGN KEY (closed_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Unique Partial Indexes for Race-Condition & Duplication Prevention

-- Prevent duplicate active staff assignments for the same user and facility
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_facility_staff
ON facility_staff_assignments (user_id, facility_id)
WHERE is_active = TRUE;

-- Prevent duplicate document versions within the same document group
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_group_version
ON referral_documents (document_group_id, version_number);

-- Prevent multiple active response SLA policies for the same facility and priority tier
CREATE UNIQUE INDEX IF NOT EXISTS uq_facility_priority_active_policy
ON referral_response_policies (facility_id, priority)
WHERE is_active = TRUE AND facility_id IS NOT NULL;

-- Prevent concurrent active (PENDING) information requests on the same referral
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_active_pending_info_request
ON referral_information_requests (referral_id)
WHERE request_status = 'PENDING';

-- Prevent concurrent active (PENDING) merge requests on the same source patient
CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_active_merge_request
ON patient_merge_requests (source_patient_id)
WHERE status = 'PENDING';
