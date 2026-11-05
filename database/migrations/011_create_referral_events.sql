-- CareConnect Ethiopia - Referral Events Schema
-- Version: 011
-- Description: Establishes immutable referral lifecycle audit trail, state machine event transitions, and chronological event logging

CREATE TABLE IF NOT EXISTS referral_events (
    id SERIAL PRIMARY KEY,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'CREATED', 'SUBMITTED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'INFO_REQUESTED', 'TRANSPORT_ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED'
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    actor_facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL,
    notes TEXT,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_events_ref ON referral_events(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_created ON referral_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_events_action ON referral_events(action);
