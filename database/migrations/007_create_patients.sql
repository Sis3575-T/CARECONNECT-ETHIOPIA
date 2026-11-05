-- CareConnect Ethiopia - Patients Schema
-- Version: 007
-- Description: Establishes patient demographics, Ethiopian three-name patronymic records, and clinical baseline profile

CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100) NOT NULL,
    grandfather_name VARCHAR(100),
    gender VARCHAR(20) NOT NULL, -- 'MALE', 'FEMALE', 'OTHER'
    date_of_birth DATE,
    age_years INTEGER NOT NULL,
    age_months INTEGER DEFAULT 0,
    national_id VARCHAR(50) UNIQUE, -- Ethiopian Fayda ID
    kebele_id VARCHAR(50),
    phone_number VARCHAR(50),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relation VARCHAR(50),
    region VARCHAR(100) NOT NULL,
    subcity_zone VARCHAR(100),
    woreda VARCHAR(50),
    kebele VARCHAR(50),
    house_number VARCHAR(50),
    blood_type VARCHAR(10), -- 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
    known_allergies TEXT,
    chronic_conditions TEXT,
    registered_facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, father_name);
CREATE INDEX IF NOT EXISTS idx_patients_national_id ON patients(national_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone_number);
CREATE INDEX IF NOT EXISTS idx_patients_facility ON patients(registered_facility_id);
