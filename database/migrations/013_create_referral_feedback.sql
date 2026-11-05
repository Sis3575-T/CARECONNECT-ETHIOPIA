-- CareConnect Ethiopia - Referral Feedback Schema
-- Version: 013
-- Description: Establishes post-referral clinical feedback from receiving hospitals to referring health centres

CREATE TABLE IF NOT EXISTS referral_feedback (
    id SERIAL PRIMARY KEY,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    hospital_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE RESTRICT,
    provider_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    patient_outcome VARCHAR(50) NOT NULL, -- 'ADMITTED_STABLE', 'ADMITTED_CRITICAL', 'DISCHARGED_IMPROVED', 'TRANSFERRED_OUT', 'EXPIRED', 'OUTPATIENT_FOLLOW_UP'
    appropriateness_rating INTEGER CHECK (appropriateness_rating >= 1 AND appropriateness_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    completeness_rating INTEGER CHECK (completeness_rating >= 1 AND completeness_rating <= 5),
    clinical_feedback_notes TEXT,
    recommended_further_training TEXT,
    final_diagnosis TEXT,
    admission_ward VARCHAR(100),
    length_of_stay_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_referral ON referral_feedback(referral_id);
CREATE INDEX IF NOT EXISTS idx_feedback_hospital ON referral_feedback(hospital_id);
CREATE INDEX IF NOT EXISTS idx_feedback_outcome ON referral_feedback(patient_outcome);
