-- CareConnect Ethiopia - In-App Notification Center & Preferences Hardening Schema
-- Version: 036
-- Description: Extends notifications with UUIDs, categories, dismissals, deduplication keys,
--              metadata payloads, and optimizes user preference matrices.

-- 1. Upgrade 'notifications' table with operational and classification attributes
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'REFERRAL_UPDATE',
    ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS deduplication_key VARCHAR(255),
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Constraints and Indexes for 'notifications'
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_uuid ON notifications (uuid);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_user_dedup 
    ON notifications (recipient_user_id, deduplication_key) 
    WHERE deduplication_key IS NOT NULL;

-- High-performance partial index for unread notification badge count and active inbox querying
CREATE INDEX IF NOT EXISTS idx_notifications_unread_active 
    ON notifications (recipient_user_id, created_at DESC) 
    WHERE is_read = FALSE AND is_dismissed = FALSE;

-- Category filtering index
CREATE INDEX IF NOT EXISTS idx_notifications_user_category 
    ON notifications (recipient_user_id, category, created_at DESC);

-- Facility-level scoped notifications query index
CREATE INDEX IF NOT EXISTS idx_notifications_facility_active 
    ON notifications (recipient_facility_id, is_read, created_at DESC) 
    WHERE is_dismissed = FALSE;

-- 3. Upgrade 'notification_preferences' with category JSONB configuration
ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS categories_config JSONB DEFAULT '{
        "REFERRAL_UPDATE": true,
        "COORDINATION": true,
        "TRANSPORT": true,
        "ESCALATION": true,
        "SECURITY": true,
        "SYSTEM": true
    }'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notif_pref_user_active 
    ON notification_preferences (user_id, is_enabled);
