-- CareConnect Ethiopia - Referral Coordination, SLA Policies, Escalation & Delay Tracking Schema
-- Version: 029
-- Description: Establishes response policies, follow-ups, information requests, reassignments, operational escalations, and delay exceptions

-- 1. Extend referrals table with policy reference, deadlines, and coordination metadata
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'policy_id'
    ) THEN
        ALTER TABLE referrals ADD COLUMN policy_id INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'policy_version'
    ) THEN
        ALTER TABLE referrals ADD COLUMN policy_version INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'acknowledgement_deadline'
    ) THEN
        ALTER TABLE referrals ADD COLUMN acknowledgement_deadline TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'decision_deadline'
    ) THEN
        ALTER TABLE referrals ADD COLUMN decision_deadline TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'escalation_level'
    ) THEN
        ALTER TABLE referrals ADD COLUMN escalation_level INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'last_followup_at'
    ) THEN
        ALTER TABLE referrals ADD COLUMN last_followup_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'followup_count'
    ) THEN
        ALTER TABLE referrals ADD COLUMN followup_count INTEGER DEFAULT 0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_referrals_ack_deadline ON referrals(acknowledgement_deadline);
CREATE INDEX IF NOT EXISTS idx_referrals_decision_deadline ON referrals(decision_deadline);
CREATE INDEX IF NOT EXISTS idx_referrals_escalation_level ON referrals(escalation_level);

-- 2. Configurable Referral Response Policies (SLAs)
CREATE TABLE IF NOT EXISTS referral_response_policies (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    name VARCHAR(100) NOT NULL,
    facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    facility_type VARCHAR(50),
    priority VARCHAR(20), -- 'ROUTINE', 'URGENT', 'EMERGENCY', or NULL for all
    service_code VARCHAR(50),
    acknowledgement_deadline_minutes INTEGER NOT NULL DEFAULT 60,
    decision_deadline_minutes INTEGER NOT NULL DEFAULT 120,
    follow_up_interval_minutes INTEGER NOT NULL DEFAULT 180,
    escalation_threshold_minutes INTEGER NOT NULL DEFAULT 240,
    working_hours_only BOOLEAN DEFAULT FALSE,
    working_hours_start TIME DEFAULT '08:30:00',
    working_hours_end TIME DEFAULT '17:30:00',
    operating_days VARCHAR(50) DEFAULT 'MON,TUE,WED,THU,FRI,SAT,SUN',
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP WITH TIME ZONE,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_response_policies_active ON referral_response_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_response_policies_fac ON referral_response_policies(facility_id);
CREATE INDEX IF NOT EXISTS idx_response_policies_priority ON referral_response_policies(priority);

-- 3. Referral Follow-up Records
CREATE TABLE IF NOT EXISTS referral_follow_ups (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responsible_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL,
    communication_channel VARCHAR(50) NOT NULL, -- 'PHONE_CALL', 'SMS', 'EMAIL', 'IN_PLATFORM', 'MANUAL'
    channel_delivery_status VARCHAR(50) DEFAULT 'MANUAL_RECORD', -- 'MANUAL_RECORD', 'DELIVERED', 'FAILED', 'PENDING_PROVIDER'
    outcome VARCHAR(100) NOT NULL, -- 'CONTACTED_STAFF', 'NO_ANSWER', 'LINE_BUSY', 'WRONG_NUMBER', 'MESSAGE_LEFT', 'INFO_RECEIVED', 'TRANSIT_EXPEDITED'
    reason_or_notes TEXT NOT NULL,
    scheduled_next_follow_up TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_ref ON referral_follow_ups(referral_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_created ON referral_follow_ups(created_at DESC);

-- 4. Additional Information Requests & Responses
CREATE TABLE IF NOT EXISTS referral_information_requests (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    requesting_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    requesting_facility_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE RESTRICT,
    requested_information TEXT NOT NULL,
    clinical_reason TEXT NOT NULL,
    request_status VARCHAR(30) DEFAULT 'PENDING', -- 'PENDING', 'RESPONDED', 'CANCELLED'
    response_notes TEXT,
    responding_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    responding_facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL,
    supporting_document_ids JSONB DEFAULT '[]'::jsonb,
    deadline TIMESTAMP WITH TIME ZONE,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_info_req_ref ON referral_information_requests(referral_id);
CREATE INDEX IF NOT EXISTS idx_info_req_status ON referral_information_requests(request_status);

-- 5. Human-Managed Referral Reassignments
CREATE TABLE IF NOT EXISTS referral_reassignments (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    previous_facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL,
    new_facility_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE RESTRICT,
    reassignment_reason VARCHAR(100) NOT NULL, -- 'SERVICE_UNAVAILABLE', 'INSUFFICIENT_CAPACITY', 'INCORRECT_ASSIGNMENT', 'CLINICAL_ESCALATION', 'OPERATIONAL_DIRECTIVE'
    reassignment_notes TEXT NOT NULL,
    authorized_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reassigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reassignments_ref ON referral_reassignments(referral_id);
CREATE INDEX IF NOT EXISTS idx_reassignments_new_fac ON referral_reassignments(new_facility_id);

-- 6. Operational Escalation Records
CREATE TABLE IF NOT EXISTS referral_escalations (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    escalation_level INTEGER NOT NULL DEFAULT 1, -- 1: Staff, 2: Supervisor, 3: Administrator
    escalation_condition VARCHAR(100) NOT NULL, -- 'ACKNOWLEDGEMENT_DEADLINE_EXCEEDED', 'DECISION_DEADLINE_EXCEEDED', 'REPEATED_UNSUCCESSFUL_FOLLOWUP', 'UNANSWERED_INFO_REQUEST', 'UNASSIGNED_TIMEOUT', 'MANUAL_OPERATIONAL_REPORT'
    escalation_reason TEXT NOT NULL,
    responsible_facility_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE RESTRICT,
    assigned_recipient_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    escalation_status VARCHAR(30) DEFAULT 'OPEN', -- 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'
    resolution_explanation TEXT,
    resolved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_escalations_ref ON referral_escalations(referral_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON referral_escalations(escalation_status);
CREATE INDEX IF NOT EXISTS idx_escalations_level ON referral_escalations(escalation_level);

-- 7. Referral Operational Exceptions & Overdue Tracker
CREATE TABLE IF NOT EXISTS referral_operational_exceptions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    exception_type VARCHAR(100) NOT NULL, -- 'ACKNOWLEDGEMENT_OVERDUE', 'DECISION_OVERDUE', 'INFO_REQUEST_OVERDUE', 'UNASSIGNED_OVERDUE', 'UNRESOLVED_ESCALATION'
    severity VARCHAR(30) DEFAULT 'WARNING', -- 'WARNING', 'CRITICAL'
    target_deadline TIMESTAMP WITH TIME ZONE,
    elapsed_minutes INTEGER,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    resolved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exceptions_ref ON referral_operational_exceptions(referral_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_unresolved ON referral_operational_exceptions(is_resolved) WHERE is_resolved = FALSE;
