-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    paddle_subscription_id TEXT,
    is_monitoring_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed Dev User
INSERT INTO users (email, is_monitoring_active)
VALUES ('demo@kibblescan.io', FALSE)
ON CONFLICT (email) DO NOTHING;
