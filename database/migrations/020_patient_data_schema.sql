-- CareConnect Ethiopia - Patient Data Schema Enhancements
-- Version: 020
-- Description: Establishes normalized patient identifiers, emergency contacts, medical baseline profile, and confidentiality protection

-- 1. Enhance Patients Table with UUID, MRN, Maternal indicators, and Soft-delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE patients ADD COLUMN uuid UUID DEFAULT gen_random_uuid() UNIQUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'medical_record_number'
    ) THEN
        ALTER TABLE patients ADD COLUMN medical_record_number VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'primary_language'
    ) THEN
        ALTER TABLE patients ADD COLUMN primary_language VARCHAR(50) DEFAULT 'AMHARIC';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'is_pregnant'
    ) THEN
        ALTER TABLE patients ADD COLUMN is_pregnant BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'edd_date'
    ) THEN
        ALTER TABLE patients ADD COLUMN edd_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'confidentiality_level'
    ) THEN
        ALTER TABLE patients ADD COLUMN confidentiality_level VARCHAR(20) DEFAULT 'STANDARD';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE patients ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Normalized Patient Identifiers (Fayda National ID, Kebele Card, Facility MRN)
CREATE TABLE IF NOT EXISTS patient_identifiers (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    identifier_type VARCHAR(50) NOT NULL, -- 'FAYDA_ID', 'KEBELE_ID', 'PASSPORT', 'FACILITY_MRN', 'OTHER'
    identifier_value VARCHAR(100) NOT NULL,
    issuing_authority VARCHAR(150),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_patient_identifier UNIQUE (identifier_type, identifier_value)
);

CREATE INDEX IF NOT EXISTS idx_patient_identifiers_lookup ON patient_identifiers(identifier_type, identifier_value);
CREATE INDEX IF NOT EXISTS idx_patient_identifiers_patient ON patient_identifiers(patient_id);

-- 3. Normalized Emergency Contacts
CREATE TABLE IF NOT EXISTS patient_emergency_contacts (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL, -- 'SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'GUARDIAN', 'NEIGHBOR', 'OTHER'
    phone_number VARCHAR(50) NOT NULL,
    alternate_phone VARCHAR(50),
    address_text TEXT,
    is_primary_contact BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_contacts_patient ON patient_emergency_contacts(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_contacts_phone ON patient_emergency_contacts(phone_number);

-- 4. Patient Medical Baseline Record
CREATE TABLE IF NOT EXISTS patient_medical_baseline (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    patient_id VARCHAR(50) NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
    blood_group VARCHAR(10),
    allergies TEXT,
    chronic_illnesses TEXT,
    current_medications TEXT,
    disabilities TEXT,
    baseline_notes TEXT,
    recorded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_baseline_patient ON patient_medical_baseline(patient_id);
