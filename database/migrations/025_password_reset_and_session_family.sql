-- CareConnect Ethiopia - Password Reset & Session Family Schema
-- Version: 025
-- Description: Establishes password_reset_tokens table and adds session family tracking to user_sessions

-- 1. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(50),
    user_agent VARCHAR(300),
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_active ON password_reset_tokens(user_id, is_used, expires_at);

-- 2. Add family_id to user_sessions if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_sessions' AND column_name = 'family_id'
    ) THEN
        ALTER TABLE user_sessions ADD COLUMN family_id UUID DEFAULT gen_random_uuid();
        CREATE INDEX IF NOT EXISTS idx_user_sessions_family ON user_sessions(family_id);
    END IF;
END $$;
