-- CareConnect Ethiopia - Security & Administrative Audit Logs Schema
-- Version: 015
-- Description: Establishes immutable security audit logs for patient access, credential operations, and administrative actions

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'USER_LOGIN', 'USER_LOGOUT', 'PATIENT_RECORD_VIEWED', 'REFERRAL_CREATED', 'REFERRAL_ACCEPTED', 'REFERRAL_REJECTED', 'CAPACITY_UPDATED', 'DOCUMENT_DOWNLOADED', 'CONFIG_CHANGED'
    resource_type VARCHAR(50) NOT NULL, -- 'user', 'patient', 'referral', 'facility', 'transport', 'ai_model', 'system'
    resource_id VARCHAR(50),
    ip_address VARCHAR(50),
    user_agent VARCHAR(300),
    details JSONB,
    severity VARCHAR(20) DEFAULT 'INFO', -- 'INFO', 'WARNING', 'SECURITY_ALERT', 'ERROR'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_facility ON audit_logs(facility_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
