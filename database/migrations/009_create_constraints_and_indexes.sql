-- CareConnect Ethiopia - Constraints & Performance Indexes
-- Version: 009
-- Description: Establishes cross-table foreign key constraints, domain check constraints, and performance indexes

-- Add foreign key constraint between users and healthcare facilities
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_facility'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT fk_users_facility
        FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Check constraints on referral workflow domain
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_referral_priority') THEN
        ALTER TABLE referrals
        ADD CONSTRAINT chk_referral_priority
        CHECK (priority IN ('ROUTINE', 'URGENT', 'EMERGENCY'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_referral_status') THEN
        ALTER TABLE referrals
        ADD CONSTRAINT chk_referral_status
        CHECK (status IN (
            'DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED',
            'INFO_REQUESTED', 'TRANSPORT_ASSIGNED', 'IN_TRANSIT', 'ARRIVED',
            'COMPLETED', 'CANCELLED'
        ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_patient_gender') THEN
        ALTER TABLE patients
        ADD CONSTRAINT chk_patient_gender
        CHECK (gender IN ('MALE', 'FEMALE', 'OTHER'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_facility_tier') THEN
        ALTER TABLE healthcare_facilities
        ADD CONSTRAINT chk_facility_tier
        CHECK (tier IN ('PRIMARY', 'SECONDARY', 'TERTIARY'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_capacity_beds_non_negative') THEN
        ALTER TABLE facility_capacity_reports
        ADD CONSTRAINT chk_capacity_beds_non_negative
        CHECK (available_beds >= 0 AND available_beds <= total_beds);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_capacity_icu_non_negative') THEN
        ALTER TABLE facility_capacity_reports
        ADD CONSTRAINT chk_capacity_icu_non_negative
        CHECK (available_icu_beds >= 0 AND available_icu_beds <= total_icu_beds);
    END IF;
END $$;

-- High-performance query indexes for hospital and clinic queues
CREATE INDEX IF NOT EXISTS idx_referrals_origin_status ON referrals(origin_facility_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_dest_status ON referrals(destination_facility_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_active_urgent ON referrals(status, priority, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_search ON patients(region, subcity_zone, woreda);
CREATE INDEX IF NOT EXISTS idx_facilities_tier_region ON healthcare_facilities(tier, region);
