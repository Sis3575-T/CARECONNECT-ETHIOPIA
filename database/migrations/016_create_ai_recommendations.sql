-- CareConnect Ethiopia - AI Recommendations Schema
-- Version: 016
-- Description: Establishes stored AI facility recommendation results, weighted matching factor scores, and clinician selection tracking

CREATE TABLE IF NOT EXISTS ai_recommendations (
    id SERIAL PRIMARY KEY,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    recommended_facility_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    rank_order INTEGER NOT NULL, -- 1 = Top recommended
    match_score DECIMAL(5, 2) NOT NULL, -- Composite match percentage (0 - 100)
    service_match_score DECIMAL(5, 2) NOT NULL,
    capacity_score DECIMAL(5, 2) NOT NULL,
    distance_score DECIMAL(5, 2) NOT NULL,
    acceptance_rate_score DECIMAL(5, 2) NOT NULL,
    distance_km DECIMAL(6, 2) NOT NULL,
    estimated_transit_minutes INTEGER,
    explanation_text TEXT NOT NULL,
    model_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    factor_breakdown JSONB,
    was_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommendations_referral ON ai_recommendations(referral_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_facility ON ai_recommendations(recommended_facility_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_rank ON ai_recommendations(referral_id, rank_order);
CREATE INDEX IF NOT EXISTS idx_recommendations_selected ON ai_recommendations(was_selected);
