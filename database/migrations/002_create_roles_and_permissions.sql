-- CareConnect Ethiopia - Roles & Permissions Schema
-- Version: 002
-- Description: Establishes role-based authorization tables and foundational system roles

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    portal_access VARCHAR(50) NOT NULL, -- 'HEALTH_CENTRE', 'HOSPITAL', 'TRANSPORT', 'ADMINISTRATOR'
    is_system_role BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL, -- 'referral', 'patient', 'facility', 'transport', 'ai', 'admin'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

-- Seed Foundational Roles
INSERT INTO roles (name, display_name, description, portal_access) VALUES
    ('HEALTH_CENTRE_STAFF', 'Health Centre Clinician', 'Creates patient referrals, reviews OCR data, and selects destination hospitals', 'HEALTH_CENTRE'),
    ('HOSPITAL_STAFF', 'Hospital Admissions & Triage Staff', 'Reviews incoming referrals, confirms bed availability, and admits patients', 'HOSPITAL'),
    ('HOSPITAL_TRIAGE', 'Hospital Specialist Triage Doctor', 'Clinical authority for accepting, requesting info, or routing referrals', 'HOSPITAL'),
    ('TRANSPORT_COORDINATOR', 'Emergency Transport Dispatcher', 'Dispatches ambulance units and coordinates patient transportation', 'TRANSPORT'),
    ('AMBULANCE_DRIVER', 'Ambulance EMT / Driver', 'Reports departure, telemetry delays, and patient hospital arrival', 'TRANSPORT'),
    ('SYSTEM_ADMINISTRATOR', 'National / Regional System Administrator', 'Full platform governance, facility registry management, and security oversight', 'ADMINISTRATOR'),
    ('REGIONAL_OFFICER', 'Regional Health Bureau Officer', 'Monitors regional referral trends, delay bottlenecks, and hospital workloads', 'ADMINISTRATOR')
ON CONFLICT (name) DO NOTHING;

-- Seed Foundational Permissions
INSERT INTO permissions (code, name, module, description) VALUES
    ('patient:create', 'Create Patient Records', 'patient', 'Register new patients at health facility'),
    ('patient:view', 'View Patient Details', 'patient', 'View authorized patient medical summaries'),
    ('referral:create', 'Draft Referral', 'referral', 'Create and draft outpatient/emergency referrals'),
    ('referral:submit', 'Submit Referral', 'referral', 'Formally dispatch referral to target hospital'),
    ('referral:accept', 'Accept Referral', 'referral', 'Accept incoming referral and reserve bed/triage'),
    ('referral:reject', 'Reject Referral', 'referral', 'Decline incoming referral with structured clinical justification'),
    ('referral:request_info', 'Request More Clinical Info', 'referral', 'Request clarifying diagnostics or lab results'),
    ('transport:request', 'Request Transport', 'transport', 'Create ambulance transport request for referral'),
    ('transport:dispatch', 'Dispatch Ambulance', 'transport', 'Assign ambulance vehicle and driver'),
    ('transport:update_status', 'Update Transport Milestones', 'transport', 'Record departure, delays, and arrival'),
    ('facility:manage', 'Manage Healthcare Facilities', 'facility', 'Create and modify facility and services catalog'),
    ('capacity:report', 'Report Facility Capacity', 'facility', 'Update live bed, ICU, and ventilator availability'),
    ('user:manage', 'Manage User Accounts', 'admin', 'Create, activate, and deactivate user credentials'),
    ('ai:run_ocr', 'Execute Document OCR', 'ai', 'Trigger optical character recognition on paper referral scans'),
    ('ai:view_recommendations', 'View AI Recommendations', 'ai', 'View ranked hospital facilities and scoring weights'),
    ('audit:view', 'View Security Audit Logs', 'admin', 'Review sensitive access and compliance trail')
ON CONFLICT (code) DO NOTHING;
