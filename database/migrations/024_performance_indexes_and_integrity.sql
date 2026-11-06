-- CareConnect Ethiopia - Performance Indexes, Data Integrity Constraints & Query Optimization
-- Version: 024
-- Description: Establishes portal-specific partial indexes, multi-column search indexes, and workflow integrity check constraints

-- 1. Portal-Specific Partial Indexes for High-Velocity Queries

-- Health Centre Portal: Active referral monitoring and draft lookups
CREATE INDEX IF NOT EXISTS idx_referrals_hc_active 
ON referrals(origin_facility_id, status, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_draft_clinician 
ON referrals(referring_clinician_id, created_at DESC) 
WHERE status = 'DRAFT';

-- Hospital Portal: Incoming triage queue filtered by priority and destination
CREATE INDEX IF NOT EXISTS idx_referrals_hospital_triage 
ON referrals(destination_facility_id, priority, created_at DESC) 
WHERE status IN ('SUBMITTED', 'ACKNOWLEDGED', 'INFO_REQUESTED');

-- Hospital Portal: Accepted referrals awaiting patient physical check-in
CREATE INDEX IF NOT EXISTS idx_referrals_awaiting_arrival 
ON referrals(destination_facility_id, status) 
WHERE status IN ('ACCEPTED', 'TRANSPORT_ASSIGNED', 'IN_TRANSIT');

-- Transport Coordinator Portal: Active emergency dispatch requests
CREATE INDEX IF NOT EXISTS idx_transport_active_transfers 
ON transport_records(status, priority, created_at DESC) 
WHERE status IN ('REQUESTED', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE');

-- Transport Coordinator Portal: Available ambulance resources by facility
CREATE INDEX IF NOT EXISTS idx_transport_available_fleet 
ON transport_resources(assigned_facility_id, vehicle_type) 
WHERE status = 'AVAILABLE';

-- User Notification Bell: Fast unread lookup
CREATE INDEX IF NOT EXISTS idx_notifications_unread_user 
ON notifications(recipient_user_id, created_at DESC) 
WHERE is_read = FALSE;

-- Active Users Tenancy Lookup
CREATE INDEX IF NOT EXISTS idx_users_active_tenancy 
ON users(facility_id, role_id) 
WHERE is_active = TRUE AND deleted_at IS NULL;

-- 2. Data Integrity Domain Check Constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transport_delay_duration') THEN
        ALTER TABLE transport_delays
        ADD CONSTRAINT chk_transport_delay_duration
        CHECK (delay_duration_minutes > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ai_review_verdict') THEN
        ALTER TABLE ai_human_reviews
        ADD CONSTRAINT chk_ai_review_verdict
        CHECK (verdict IN ('ACCEPTED', 'MODIFIED', 'REJECTED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ai_jobs_status') THEN
        ALTER TABLE ai_processing_jobs
        ADD CONSTRAINT chk_ai_jobs_status
        CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_notif_pref_channel') THEN
        ALTER TABLE notification_preferences
        ADD CONSTRAINT chk_notif_pref_channel
        CHECK (channel IN ('IN_APP', 'SMS', 'EMAIL'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_capacity_reporting_bounds') THEN
        ALTER TABLE facility_capacity_reports
        ADD CONSTRAINT chk_capacity_reporting_bounds
        CHECK (
            total_beds >= 0 AND 
            available_beds >= 0 AND 
            occupied_beds >= 0 AND 
            total_icu_beds >= 0 AND 
            available_icu_beds >= 0
        );
    END IF;
END $$;
