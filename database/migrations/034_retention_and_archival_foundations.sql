-- CareConnect Ethiopia - Data Retention Policies & Archival Catalog Schema
-- Version: 034
-- Description: Establishes configurable retention policies, cold-storage archival registry, and retention execution audit logging

-- 1. Configurable Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    entity_type VARCHAR(50) NOT NULL UNIQUE,
    retention_period_days INTEGER NOT NULL CHECK (retention_period_days > 0),
    action_type VARCHAR(50) NOT NULL DEFAULT 'ARCHIVE' CHECK (action_type IN ('ARCHIVE', 'SOFT_DELETE', 'PURGE_EXPIRED')),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Archived Referrals Cold Storage Registry
CREATE TABLE IF NOT EXISTS archived_referrals_catalog (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    referral_id VARCHAR(50) NOT NULL UNIQUE REFERENCES referrals(id) ON DELETE RESTRICT,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    archive_tier VARCHAR(50) DEFAULT 'COLD_STORAGE' CHECK (archive_tier IN ('COLD_STORAGE', 'PARTITION_ARCHIVE', 'OFFLINE_BLOB')),
    archive_location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archived_referrals_date ON archived_referrals_catalog(archived_at DESC);

-- 3. Data Retention Execution Audit Log
CREATE TABLE IF NOT EXISTS data_retention_executions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    policy_id INTEGER REFERENCES data_retention_policies(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    eligible_records_count INTEGER DEFAULT 0 CHECK (eligible_records_count >= 0),
    processed_records_count INTEGER DEFAULT 0 CHECK (processed_records_count >= 0),
    status VARCHAR(30) DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'FAILED', 'DRY_RUN')),
    executed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    execution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_retention_exec_entity ON data_retention_executions(entity_type, executed_at DESC);

-- 4. Seed Standard Operational Retention Policies (Baseline operational targets)
INSERT INTO data_retention_policies (entity_type, retention_period_days, action_type, description)
VALUES 
    ('AUDIT_LOGS', 2555, 'ARCHIVE', 'Standard 7-year operational retention baseline for clinical audit trails'),
    ('SYSTEM_EVENTS', 2555, 'ARCHIVE', '7-year operational retention baseline for system and security event records'),
    ('CLOSED_REFERRALS', 365, 'ARCHIVE', 'Eligibility window for archiving completed/closed referrals to cold storage after 1 year'),
    ('CANCELLED_REFERRALS', 180, 'ARCHIVE', 'Eligibility window for archiving cancelled referrals after 180 days'),
    ('SUPERSEDED_DOCUMENTS', 365, 'ARCHIVE', 'Eligibility window for archiving historical superseded document versions'),
    ('EXPIRED_SESSIONS', 30, 'PURGE_EXPIRED', 'Purging expired and revoked user authentication session tokens after 30 days')
ON CONFLICT (entity_type) DO NOTHING;
