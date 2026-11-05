-- CareConnect Ethiopia - Referral Documents Schema
-- Version: 010
-- Description: Establishes referral document attachments, upload metadata, and OCR extraction tracking

CREATE TABLE IF NOT EXISTS referral_documents (
    id SERIAL PRIMARY KEY,
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL DEFAULT 'PAPER_REFERRAL_SLIP', -- 'PAPER_REFERRAL_SLIP', 'LAB_RESULT', 'RADIOLOGY_SCAN', 'CLINICAL_SUMMARY', 'DISCHARGE_NOTE'
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ocr_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'NOT_APPLICABLE'
    ocr_extracted_text TEXT,
    ocr_confidence DECIMAL(5, 2),
    ocr_processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_referral ON referral_documents(referral_id);
CREATE INDEX IF NOT EXISTS idx_documents_ocr_status ON referral_documents(ocr_status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON referral_documents(document_type);
