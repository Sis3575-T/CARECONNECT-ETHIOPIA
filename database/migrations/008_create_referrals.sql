-- CareConnect Ethiopia - Referrals Schema
-- Version: 008
-- Description: Establishes referral records, clinical parameters, triage priorities, and facility relationships

CREATE TABLE IF NOT EXISTS referrals (
    id VARCHAR(50) PRIMARY KEY, -- e.g. REF-20261105-00042
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    origin_facility_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE RESTRICT,
    destination_facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE RESTRICT,
    referring_clinician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    receiving_clinician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'ROUTINE', -- 'ROUTINE', 'URGENT', 'EMERGENCY'
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'INFO_REQUESTED', 'TRANSPORT_ASSIGNED', 'IN_TRANSIT', 'ARRIVED', 'COMPLETED', 'CANCELLED'
    primary_diagnosis TEXT NOT NULL,
    clinical_summary TEXT NOT NULL,
    reason_for_referral TEXT NOT NULL,
    required_specialty VARCHAR(50) NOT NULL,
    vitals_blood_pressure VARCHAR(30),
    vitals_pulse_rate INTEGER,
    vitals_respiratory_rate INTEGER,
    vitals_temperature DECIMAL(4, 1),
    vitals_spo2 INTEGER,
    provisional_treatment_given TEXT,
    rejection_reason TEXT,
    rejection_category VARCHAR(50),
    info_request_notes TEXT,
    transport_required BOOLEAN DEFAULT FALSE,
    ai_recommended_facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    decision_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_origin ON referrals(origin_facility_id);
CREATE INDEX IF NOT EXISTS idx_referrals_dest ON referrals(destination_facility_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_priority ON referrals(priority);
CREATE INDEX IF NOT EXISTS idx_referrals_submitted ON referrals(submitted_at);
CREATE INDEX IF NOT EXISTS idx_referrals_created ON referrals(created_at DESC);
