-- CareConnect Ethiopia - Notifications Schema
-- Version: 014
-- Description: Establishes user and facility notification records for real-time referral alerts and workflow updates

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    recipient_role VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'REFERRAL_NEW', 'REFERRAL_ACKNOWLEDGED', 'REFERRAL_ACCEPTED', 'REFERRAL_REJECTED', 'INFO_REQUESTED', 'TRANSPORT_DISPATCHED', 'TRANSPORT_DELAY', 'PATIENT_ARRIVED', 'CAPACITY_ALERT', 'SYSTEM_ALERT'
    entity_type VARCHAR(50), -- 'referral', 'transport', 'facility', 'patient'
    entity_id VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_facility ON notifications(recipient_facility_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
