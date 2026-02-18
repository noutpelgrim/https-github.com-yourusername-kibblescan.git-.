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

-- -----------------------------------------------------
-- INGREDIENT REGISTRY
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    classification VARCHAR(50) NOT NULL, -- 'VIOLATION', 'NON-SPECIFIC', 'UNRESTRICTED'
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup by slug
CREATE INDEX IF NOT EXISTS idx_ingredients_slug ON ingredients(slug);

-- -----------------------------------------------------
-- SCAN HISTORY
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    verdict VARCHAR(50),
    raw_text TEXT,
    ingredients_found JSONB DEFAULT '[]', -- Stores array of found ingredients
    confidence NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
);
