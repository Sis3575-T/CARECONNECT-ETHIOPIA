-- CareConnect Ethiopia - Notification Preferences, AI Subsystem Governance & System Events Schema
-- Version: 023
-- Description: Establishes notification user preferences, AI processing jobs, clinician human-in-the-loop oversight, and system observability events

-- 1. User Notification Delivery Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL, -- 'IN_APP', 'SMS', 'EMAIL'
    notify_referral_created BOOLEAN DEFAULT TRUE,
    notify_referral_decided BOOLEAN DEFAULT TRUE,
    notify_transport_dispatched BOOLEAN DEFAULT TRUE,
    notify_delay_alert BOOLEAN DEFAULT TRUE,
    notify_capacity_surge BOOLEAN DEFAULT TRUE,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_pref_channel UNIQUE (user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON notification_preferences(user_id);

-- 2. AI Processing Jobs (Asynchronous Pipeline Tracking & Model Telemetry)
CREATE TABLE IF NOT EXISTS ai_processing_jobs (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    job_type VARCHAR(50) NOT NULL, -- 'OCR_EXTRACTION', 'FACILITY_RECOMMENDATION', 'DELAY_PREDICTION', 'SPECIALTY_CLASSIFICATION'
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED', -- 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING'
    referral_id VARCHAR(50) REFERENCES referrals(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES referral_documents(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    input_parameters JSONB, -- Sanitized clinical parameters (no unnecessary PII)
    execution_duration_ms INTEGER,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_referral ON ai_processing_jobs(referral_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_type ON ai_processing_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created ON ai_processing_jobs(created_at DESC);

-- 3. AI Human Review Records (Mandatory Clinician Oversight Tracking)
-- Enforces the ethical mandate that AI never autonomously diagnoses or dispatches
CREATE TABLE IF NOT EXISTS ai_human_reviews (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    job_id BIGINT REFERENCES ai_processing_jobs(id) ON DELETE CASCADE,
    referral_id VARCHAR(50) REFERENCES referrals(id) ON DELETE CASCADE,
    reviewing_clinician_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    ai_suggestion_type VARCHAR(50) NOT NULL, -- 'HOSPITAL_RECOMMENDATION', 'TRIAGE_CLASSIFICATION', 'OCR_EXTRACTION'
    verdict VARCHAR(50) NOT NULL, -- 'ACCEPTED', 'MODIFIED', 'REJECTED'
    clinician_rationale TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_referral ON ai_human_reviews(referral_id);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_clinician ON ai_human_reviews(reviewing_clinician_id);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_verdict ON ai_human_reviews(verdict);

-- 4. System Diagnostics & Observability Events
CREATE TABLE IF NOT EXISTS system_events (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    event_category VARCHAR(50) NOT NULL, -- 'SECURITY', 'INTEGRATION', 'DATABASE', 'PERFORMANCE', 'AI_SERVICE'
    event_name VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO', -- 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
    source_service VARCHAR(50) NOT NULL, -- 'EXPRESS_API', 'FASTAPI_AI', 'DB_MIGRATOR', 'PORTAL_GATEWAY'
    details JSONB,
    triggered_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_events_cat ON system_events(event_category, severity);
CREATE INDEX IF NOT EXISTS idx_system_events_source ON system_events(source_service);
CREATE INDEX IF NOT EXISTS idx_system_events_created ON system_events(created_at DESC);
