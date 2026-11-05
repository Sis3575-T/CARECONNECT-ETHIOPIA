-- CareConnect Ethiopia - Healthcare Facilities Schema
-- Version: 004
-- Description: Establishes healthcare facilities directory for health centres, general hospitals, and tertiary teaching referral centers

CREATE TABLE IF NOT EXISTS healthcare_facilities (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    amharic_name VARCHAR(200),
    facility_type VARCHAR(50) NOT NULL, -- 'HEALTH_CENTRE', 'PRIMARY_HOSPITAL', 'GENERAL_HOSPITAL', 'TERTIARY_HOSPITAL'
    tier VARCHAR(50) NOT NULL, -- 'PRIMARY', 'SECONDARY', 'TERTIARY'
    ownership VARCHAR(50) DEFAULT 'PUBLIC', -- 'PUBLIC', 'PRIVATE', 'NGO'
    region VARCHAR(100) NOT NULL,
    subcity VARCHAR(100),
    woreda VARCHAR(50),
    kebele VARCHAR(50),
    phone_number VARCHAR(50),
    emergency_phone VARCHAR(50),
    email VARCHAR(100),
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    altitude_meters INTEGER,
    total_beds INTEGER DEFAULT 0,
    total_icu_beds INTEGER DEFAULT 0,
    has_emergency_department BOOLEAN DEFAULT TRUE,
    has_blood_bank BOOLEAN DEFAULT FALSE,
    has_ct_scan BOOLEAN DEFAULT FALSE,
    has_mri BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facilities_type ON healthcare_facilities(facility_type);
CREATE INDEX IF NOT EXISTS idx_facilities_tier ON healthcare_facilities(tier);
CREATE INDEX IF NOT EXISTS idx_facilities_region ON healthcare_facilities(region);
CREATE INDEX IF NOT EXISTS idx_facilities_location ON healthcare_facilities(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_facilities_is_active ON healthcare_facilities(is_active);
