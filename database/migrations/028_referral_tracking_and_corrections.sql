-- CareConnect Ethiopia - Referral Tracking, Reference Numbers & Corrections Schema
-- Version: 028
-- Description: Establishes dedicated human-readable referral reference numbers, closure/cancellation metadata, progress tracking notes, and referral corrections history

-- 1. Extend referrals table with reference_number, cancellation, and closure metadata
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'reference_number'
    ) THEN
        ALTER TABLE referrals ADD COLUMN reference_number VARCHAR(100) UNIQUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'current_progress_notes'
    ) THEN
        ALTER TABLE referrals ADD COLUMN current_progress_notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE referrals ADD COLUMN cancellation_reason TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE referrals ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'cancelled_by_user_id'
    ) THEN
        ALTER TABLE referrals ADD COLUMN cancelled_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'closed_at'
    ) THEN
        ALTER TABLE referrals ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'closed_by_user_id'
    ) THEN
        ALTER TABLE referrals ADD COLUMN closed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_referrals_reference_num ON referrals(reference_number);

-- 2. Referral Corrections Table (Immutable audit trail for corrections)
CREATE TABLE IF NOT EXISTS referral_corrections (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT NOT NULL,
    corrected_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_corrections_ref ON referral_corrections(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_corrections_created ON referral_corrections(created_at DESC);
