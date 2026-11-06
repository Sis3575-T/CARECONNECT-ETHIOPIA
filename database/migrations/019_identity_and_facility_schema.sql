-- CareConnect Ethiopia - Identity & Facility Schema Enhancements
-- Version: 019
-- Description: Establishes facility types, departments, staff assignments, user multi-role mapping, and session tokens

-- 1. Facility Types Catalog Table
CREATE TABLE IF NOT EXISTS facility_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    level_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO facility_types (code, name, description, level_order) VALUES
    ('HEALTH_CENTRE', 'Primary Health Centre', 'Provides primary healthcare, initial triage, and outpatient referral services', 1),
    ('PRIMARY_HOSPITAL', 'Primary Hospital', 'Provides basic emergency obstetric, general medical, and surgical care', 2),
    ('GENERAL_HOSPITAL', 'General Hospital', 'Provides specialized clinical services, surgical theaters, and blood bank', 3),
    ('TERTIARY_HOSPITAL', 'Comprehensive Specialized / Teaching Hospital', 'Provides advanced tertiary clinical care, specialized ICUs, and complex surgeries', 4)
ON CONFLICT (code) DO NOTHING;

-- 2. Enhance Healthcare Facilities with UUID and Soft-delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'healthcare_facilities' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE healthcare_facilities ADD COLUMN uuid UUID DEFAULT gen_random_uuid() UNIQUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'healthcare_facilities' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE healthcare_facilities ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Facility Departments Table
CREATE TABLE IF NOT EXISTS facility_departments (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    facility_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    head_clinician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    phone_extension VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_facility_dept UNIQUE (facility_id, code)
);

CREATE INDEX IF NOT EXISTS idx_facility_depts_fac ON facility_departments(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_depts_code ON facility_departments(code);

-- 4. User Multi-Role Mapping Table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- 5. User Sessions & Refresh Token Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(50),
    user_agent VARCHAR(300),
    is_revoked BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_revoked, expires_at);

-- 6. Facility Staff Assignments
CREATE TABLE IF NOT EXISTS facility_staff_assignments (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facility_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES facility_departments(id) ON DELETE SET NULL,
    assignment_role VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT TRUE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_assign_user ON facility_staff_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_assign_facility ON facility_staff_assignments(facility_id);

-- 7. Enhance Users with UUID, Account Lockout & Soft-delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE users ADD COLUMN uuid UUID DEFAULT gen_random_uuid() UNIQUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'failed_login_attempts'
    ) THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'locked_until'
    ) THEN
        ALTER TABLE users ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
