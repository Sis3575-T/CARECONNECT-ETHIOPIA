-- CareConnect Ethiopia - Background Jobs, Transactional Outbox & Notification Deliveries Schema
-- Version: 035
-- Description: Establishes durable PostgreSQL job queue, transactional outbox pattern,
--              multi-channel notification delivery tracking, and distributed task leases.

-- 1. Background Jobs Queue Table
CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    locked_by VARCHAR(100),
    locked_at TIMESTAMP WITH TIME ZONE,
    error_summary TEXT,
    execution_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_job_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_job_status CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SCHEDULED'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_claim ON background_jobs (status, scheduled_at ASC, priority DESC) 
    WHERE status IN ('PENDING', 'SCHEDULED');
CREATE INDEX IF NOT EXISTS idx_jobs_locked ON background_jobs (locked_by, locked_at) 
    WHERE status = 'PROCESSING';
CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON background_jobs (job_type, status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON background_jobs (created_at DESC);

-- 2. Transactional Outbox Events Table
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL, -- 'referral', 'document', 'coordination', 'transport', 'patient'
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    idempotency_key VARCHAR(200) UNIQUE,
    error_summary TEXT,
    locked_by VARCHAR(100),
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_outbox_status CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_outbox_claim ON outbox_events (status, created_at ASC) 
    WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox_events (aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_outbox_created ON outbox_events (created_at DESC);

-- 3. Multi-Channel Notification Deliveries Tracking Table
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL, -- 'IN_APP', 'SMS', 'EMAIL'
    recipient_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recipient_address VARCHAR(200), -- E.164 phone or email address
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    deduplication_key VARCHAR(200) UNIQUE,
    error_message TEXT,
    provider_name VARCHAR(50),
    provider_message_id VARCHAR(100),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_notif_delivery_status CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
    CONSTRAINT chk_notif_channel CHECK (channel IN ('IN_APP', 'SMS', 'EMAIL'))
);

CREATE INDEX IF NOT EXISTS idx_deliveries_status ON notification_deliveries (status, channel);
CREATE INDEX IF NOT EXISTS idx_deliveries_user ON notification_deliveries (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_created ON notification_deliveries (created_at DESC);

-- 4. Distributed Scheduled Tasks Lease Table (Multi-Instance Singleton Leader Guard)
CREATE TABLE IF NOT EXISTS scheduled_tasks_lease (
    task_name VARCHAR(100) PRIMARY KEY,
    locked_by VARCHAR(100),
    locked_until TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_lease_locked ON scheduled_tasks_lease (task_name, locked_until);
