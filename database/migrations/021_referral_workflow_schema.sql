-- CareConnect Ethiopia - Referral Workflow & Status History Schema
-- Version: 021
-- Description: Establishes referral status transition ledger, clinical decision evaluations, and triage categorization

-- 1. Enhance Referrals Table with UUID, Triage Categories, Allocated Bed and Soft-delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE referrals ADD COLUMN uuid UUID DEFAULT gen_random_uuid() UNIQUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'triage_category'
    ) THEN
        ALTER TABLE referrals ADD COLUMN triage_category VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'triage_notes'
    ) THEN
        ALTER TABLE referrals ADD COLUMN triage_notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'assigned_bed_type'
    ) THEN
        ALTER TABLE referrals ADD COLUMN assigned_bed_type VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'closure_reason'
    ) THEN
        ALTER TABLE referrals ADD COLUMN closure_reason VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE referrals ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Referral Status History (Immutable State Transition Ledger)
CREATE TABLE IF NOT EXISTS referral_status_history (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at_facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL,
    reason_text TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_status_hist_ref ON referral_status_history(referral_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_status_hist_to ON referral_status_history(to_status);
CREATE INDEX IF NOT EXISTS idx_referral_status_hist_user ON referral_status_history(changed_by_user_id);

-- 3. Referral Decisions Table (Authoritative Clinical Triage Decisions)
CREATE TABLE IF NOT EXISTS referral_decisions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    hospital_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE RESTRICT,
    evaluating_clinician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    decision VARCHAR(50) NOT NULL, -- 'ACCEPT', 'REJECT', 'REQUEST_INFO', 'REDIRECT'
    decision_notes TEXT NOT NULL,
    rejection_reason_code VARCHAR(50), -- 'CAPACITY_FULL', 'SPECIALIST_UNAVAILABLE', 'INAPPROPRIATE_CLINICAL_TIER', 'EQUIPMENT_MAINTENANCE', 'OTHER'
    recommended_alternative_facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL,
    bed_allocated BOOLEAN DEFAULT FALSE,
    allocated_ward_department VARCHAR(100),
    decision_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_decisions_ref ON referral_decisions(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_decisions_hosp ON referral_decisions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_referral_decisions_decision ON referral_decisions(decision);
