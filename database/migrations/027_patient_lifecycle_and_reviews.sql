-- CareConnect Ethiopia - Patient Lifecycle, Duplicate Reviews & Clinical Corrections Schema
-- Version: 027
-- Description: Establishes patient status lifecycle, estimated DOB flags, demographic corrections audit trail, duplicate reviews, and merge requests

-- 1. Extend patients table with lifecycle status, dob estimation, and merge pointer
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'status'
    ) THEN
        ALTER TABLE patients ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'is_dob_estimated'
    ) THEN
        ALTER TABLE patients ADD COLUMN is_dob_estimated BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'merged_into_patient_id'
    ) THEN
        ALTER TABLE patients ADD COLUMN merged_into_patient_id VARCHAR(50) REFERENCES patients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Patient Demographic & Clinical Corrections Audit History
CREATE TABLE IF NOT EXISTS patient_corrections (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT NOT NULL,
    corrected_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_corrections_patient ON patient_corrections(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_corrections_created ON patient_corrections(created_at DESC);

-- 3. Patient Duplicate Reviews (Human-in-the-loop clinical review outcomes)
CREATE TABLE IF NOT EXISTS patient_duplicate_reviews (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    target_patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    candidate_patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    review_status VARCHAR(50) NOT NULL, -- 'CONFIRMED_MATCH', 'FALSE_POSITIVE', 'UNDER_INVESTIGATION'
    match_score NUMERIC(5,2),
    match_signals JSONB,
    reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_duplicate_pair UNIQUE (target_patient_id, candidate_patient_id)
);

CREATE INDEX IF NOT EXISTS idx_duplicate_reviews_target ON patient_duplicate_reviews(target_patient_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_reviews_candidate ON patient_duplicate_reviews(candidate_patient_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_reviews_status ON patient_duplicate_reviews(review_status);

-- 4. Patient Merge Requests (Controlled workflow for merging records)
CREATE TABLE IF NOT EXISTS patient_merge_requests (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    source_patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    target_patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    reason TEXT NOT NULL,
    requested_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    merged_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_merge_requests_source ON patient_merge_requests(source_patient_id);
CREATE INDEX IF NOT EXISTS idx_merge_requests_target ON patient_merge_requests(target_patient_id);
CREATE INDEX IF NOT EXISTS idx_merge_requests_status ON patient_merge_requests(status);
