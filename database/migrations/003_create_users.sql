-- CareConnect Ethiopia - Users Schema
-- Version: 003
-- Description: Establishes users table for authenticated system operators

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50),
    role_id INTEGER REFERENCES roles(id) ON DELETE RESTRICT,
    facility_id VARCHAR(50), -- Links to healthcare_facilities.id
    department VARCHAR(100),
    job_title VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_facility_id ON users(facility_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
