-- CareConnect Ethiopia - Secure Document Management Schema
-- Version: 030
-- Description: Establishes patient/referral document associations, versioning, verification workflow, lifecycle, and AI processing preparation

DO $$
BEGIN
    -- 1. Ensure referral_id is optional so standalone patient documents are supported
    ALTER TABLE referral_documents ALTER COLUMN referral_id DROP NOT NULL;

    -- 2. Associate with Patient
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'patient_id'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN patient_id VARCHAR(50) REFERENCES patients(id) ON DELETE SET NULL;
    END IF;

    -- 3. Associate with Facility
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'facility_id'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL;
    END IF;

    -- 4. Document Category
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'document_category'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN document_category VARCHAR(50) DEFAULT 'REFERRAL_LETTER';
    END IF;

    -- 5. Versioning
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'version_number'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN version_number INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'parent_document_id'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN parent_document_id INTEGER REFERENCES referral_documents(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'document_group_id'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN document_group_id UUID DEFAULT gen_random_uuid();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'is_latest'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN is_latest BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'replacement_reason'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN replacement_reason TEXT;
    END IF;

    -- 6. Verification Workflow
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN verification_status VARCHAR(50) DEFAULT 'UPLOADED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'verified_by_user_id'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN verified_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'verification_notes'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN verification_notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN rejection_reason TEXT;
    END IF;

    -- 7. Document Lifecycle & Archival
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'archived_at'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'archived_by_user_id'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN archived_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'deletion_reason'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN deletion_reason TEXT;
    END IF;

    -- 8. Preparation for AI & OCR Processing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'processing_status'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN processing_status VARCHAR(50) DEFAULT 'PENDING';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'processing_attempts'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN processing_attempts INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'processing_error'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN processing_error TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'processing_metadata'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN processing_metadata JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referral_documents' AND column_name = 'last_processed_at'
    ) THEN
        ALTER TABLE referral_documents ADD COLUMN last_processed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Indexes for performance and isolation queries
CREATE INDEX IF NOT EXISTS idx_documents_patient ON referral_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_facility ON referral_documents(facility_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON referral_documents(document_category);
CREATE INDEX IF NOT EXISTS idx_documents_verification ON referral_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_documents_group ON referral_documents(document_group_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_latest ON referral_documents(is_latest);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON referral_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_deleted ON referral_documents(deleted_at) WHERE deleted_at IS NULL;
