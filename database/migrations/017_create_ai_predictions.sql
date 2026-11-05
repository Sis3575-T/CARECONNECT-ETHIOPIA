-- CareConnect Ethiopia - AI Predictions Schema
-- Version: 017
-- Description: Establishes AI machine learning predictions log, delay risk scoring, model version audits, and human-in-the-loop review verifications

CREATE TABLE IF NOT EXISTS ai_predictions (
    id SERIAL PRIMARY KEY,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    prediction_type VARCHAR(50) NOT NULL, -- 'DELAY_RISK', 'ADMISSION_LIKELIHOOD', 'SPECIALTY_CLASSIFICATION', 'DUPLICATE_DETECTION', 'ANOMALY_DETECTION'
    predicted_value VARCHAR(100) NOT NULL,
    confidence_score DECIMAL(5, 2) NOT NULL, -- 0.00 to 100.00
    raw_probability DECIMAL(5, 4), -- 0.0000 to 1.0000
    features_used JSONB,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    clinical_review_required BOOLEAN DEFAULT FALSE,
    clinical_review_reason TEXT,
    reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    review_verdict VARCHAR(50), -- 'AGREED', 'DISAGREED', 'OVERRIDDEN'
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_predictions_referral ON ai_predictions(referral_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON ai_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_predictions_model ON ai_predictions(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_predictions_review ON ai_predictions(clinical_review_required);
