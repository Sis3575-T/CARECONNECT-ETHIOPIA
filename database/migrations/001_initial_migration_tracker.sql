-- CareConnect Ethiopia - Initial Migration Tracker Table
-- Version: 001
-- Description: Establishes version-controlled migrations log

CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
