-- CareConnect Ethiopia - Document & Transport Schema Enhancements
-- Version: 022
-- Description: Establishes secure storage references, document access logs, transport delay reports, and transit milestone history

-- 1. Enhance Referral Documents with UUID, Storage URI, Checksum, and Encryption
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN uuid UUID DEFAULT gen_random_uuid() UNIQUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'storage_uri'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN storage_uri VARCHAR(500);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'sha256_checksum'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN sha256_checksum VARCHAR(64);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'encryption_status'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN encryption_status VARCHAR(50) DEFAULT 'ENCRYPTED_AT_REST';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Document Access Logs (Confidentiality & Audit Trail)
CREATE TABLE IF NOT EXISTS document_access_logs (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    document_id INTEGER NOT NULL REFERENCES referral_documents(id) ON DELETE CASCADE,
    accessed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    access_type VARCHAR(50) NOT NULL, -- 'VIEW', 'DOWNLOAD', 'OCR_PROCESS', 'DELETE'
    ip_address VARCHAR(50),
    user_agent VARCHAR(300),
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_access_doc ON document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_user ON document_access_logs(accessed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_date ON document_access_logs(accessed_at DESC);

-- 3. Enhance Transport Resources with Equipment and Paramedic Information
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_resources' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE transport_resources ADD COLUMN uuid UUID DEFAULT gen_random_uuid() UNIQUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_resources' AND column_name = 'fuel_level_percent'
    ) THEN
        ALTER TABLE transport_resources ADD COLUMN fuel_level_percent INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_resources' AND column_name = 'has_oxygen'
    ) THEN
        ALTER TABLE transport_resources ADD COLUMN has_oxygen BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_resources' AND column_name = 'has_ventilator'
    ) THEN
        ALTER TABLE transport_resources ADD COLUMN has_ventilator BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_resources' AND column_name = 'has_defibrillator'
    ) THEN
        ALTER TABLE transport_resources ADD COLUMN has_defibrillator BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_resources' AND column_name = 'paramedic_name'
    ) THEN
        ALTER TABLE transport_resources ADD COLUMN paramedic_name VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_resources' AND column_name = 'paramedic_phone'
    ) THEN
        ALTER TABLE transport_resources ADD COLUMN paramedic_phone VARCHAR(50);
    END IF;
END $$;

-- 4. Enhance Transport Records with UUID and Clinical Transit Observations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_records' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE transport_records ADD COLUMN uuid UUID DEFAULT gen_random_uuid() UNIQUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_records' AND column_name = 'escort_staff_name'
    ) THEN
        ALTER TABLE transport_records ADD COLUMN escort_staff_name VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_records' AND column_name = 'patient_condition_at_departure'
    ) THEN
        ALTER TABLE transport_records ADD COLUMN patient_condition_at_departure VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transport_records' AND column_name = 'patient_condition_at_arrival'
    ) THEN
        ALTER TABLE transport_records ADD COLUMN patient_condition_at_arrival VARCHAR(50);
    END IF;
END $$;

-- 5. Dedicated Transport Delays Table
CREATE TABLE IF NOT EXISTS transport_delays (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    transport_record_id VARCHAR(50) NOT NULL REFERENCES transport_records(id) ON DELETE CASCADE,
    delay_type VARCHAR(50) NOT NULL, -- 'TRAFFIC_JAM', 'ROAD_CONSTRUCTION', 'VEHICLE_BREAKDOWN', 'WEATHER_HAZARD', 'PATIENT_RESUSCITATION', 'FUEL_SHORTAGE', 'OTHER'
    delay_duration_minutes INTEGER NOT NULL,
    location_description TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    reported_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transport_delays_rec ON transport_delays(transport_record_id);
CREATE INDEX IF NOT EXISTS idx_transport_delays_type ON transport_delays(delay_type);

-- 6. Transport Status Milestone History
CREATE TABLE IF NOT EXISTS transport_status_history (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    transport_record_id VARCHAR(50) NOT NULL REFERENCES transport_records(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    current_lat DECIMAL(10, 7),
    current_lng DECIMAL(10, 7),
    notes TEXT,
    recorded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    milestone_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transport_hist_rec ON transport_status_history(transport_record_id, milestone_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transport_hist_status ON transport_status_history(to_status);
