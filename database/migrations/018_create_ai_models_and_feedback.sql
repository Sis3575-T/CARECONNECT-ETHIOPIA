-- CareConnect Ethiopia - AI Models & User Feedback Schema
-- Version: 018
-- Description: Establishes AI model registry, evaluation metrics tracking, and clinician feedback collection

CREATE TABLE IF NOT EXISTS ai_model_versions (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    training_dataset_size INTEGER,
    accuracy DECIMAL(5, 4),
    f1_score DECIMAL(5, 4),
    precision_score DECIMAL(5, 4),
    recall_score DECIMAL(5, 4),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'TRAINING', 'DEPRECATED', 'STAGING'
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_model_version UNIQUE (model_name, version)
);

CREATE TABLE IF NOT EXISTS ai_feedback (
    id SERIAL PRIMARY KEY,
    prediction_id INTEGER REFERENCES ai_predictions(id) ON DELETE CASCADE,
    recommendation_id INTEGER REFERENCES ai_recommendations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL,
    feedback_type VARCHAR(50) NOT NULL, -- 'RECOMMENDATION_RELEVANCE', 'OCR_ACCURACY', 'DELAY_PREDICTION_ACCURACY', 'GENERAL'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    was_helpful BOOLEAN NOT NULL,
    comments TEXT,
    corrected_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_models_status ON ai_model_versions(model_name, status);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_type ON ai_feedback(feedback_type);

-- Seed Initial AI Subsystem Models
INSERT INTO ai_model_versions (model_name, version, algorithm, training_dataset_size, accuracy, f1_score, precision_score, recall_score, status) VALUES
    ('hospital_recommender', 'v1.0.0', 'Multi-Criteria Weighted Ranking & Haversine Distance', 1200, 0.9450, 0.9380, 0.9500, 0.9260, 'ACTIVE'),
    ('specialty_classifier', 'v1.0.0', 'TF-IDF Vectorizer + Multinomial Naive Bayes / Logistic Regression', 2500, 0.9120, 0.9080, 0.9150, 0.9010, 'ACTIVE'),
    ('delay_predictor', 'v1.0.0', 'Historical Moving-Average Baseline & Gradient Boosting Estimator', 1850, 0.8870, 0.8750, 0.8920, 0.8590, 'ACTIVE'),
    ('tesseract_ocr', 'v5.3.0', 'LSTM Neural Network OCR with OpenCV Bilateral Preprocessing (eng+amh)', 500, 0.8920, 0.8840, 0.9010, 0.8680, 'ACTIVE')
ON CONFLICT (model_name, version) DO NOTHING;
