-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    paddle_subscription_id TEXT,
    is_monitoring_active BOOLEAN DEFAULT false,
    plan_tier VARCHAR(50) DEFAULT 'free',
    free_slots INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed Dev User
INSERT INTO users (email, is_monitoring_active)
VALUES ('demo@kibblescan.io', FALSE)
ON CONFLICT (email) DO NOTHING;

-- 1. Magic Links Table for Passwordless Auth
CREATE TABLE IF NOT EXISTS magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. User Monitoring Table (Many-to-Many: Users <-> Formulation Products)
CREATE TABLE IF NOT EXISTS user_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES formulation_products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_checked_at TIMESTAMP DEFAULT NOW(),
    alert_triggered BOOLEAN DEFAULT false,
    UNIQUE(user_id, product_id)
);

-- 3. Monitoring Table (Per Requirements: 'monitoring', active flag, explicit foreign keys)
CREATE TABLE IF NOT EXISTS monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES formulation_products(id) ON DELETE CASCADE,
    monitoring_active BOOLEAN DEFAULT true,
    alert_triggered BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

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

-- -----------------------------------------------------
-- FORMULATION VERSIONING
-- One product = one fingerprint. Versions track changes.
-- No monitoring required — all scans create versions.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS formulation_products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint TEXT UNIQUE NOT NULL,   -- normalised sorted ingredient key
    product_name TEXT NOT NULL DEFAULT 'Unknown Product',
    scan_source  VARCHAR(20) DEFAULT 'Manual',  -- 'OCR' | 'Manual'
    current_status VARCHAR(50) DEFAULT 'stable', -- 'stable', 'drift_detected', 'recall'
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS formulation_versions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id     UUID NOT NULL REFERENCES formulation_products(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    ingredient_list TEXT NOT NULL,          -- raw comma-joined ingredient list
    fingerprint    TEXT NOT NULL,           -- same fingerprint as product for this version
    change_status  VARCHAR(60) NOT NULL DEFAULT 'No Change Detected',
    -- Possible values:
    --   'First Record'
    --   'No Change Detected'
    --   'Updated – Ingredient Change Detected'
    classification_result JSONB,           -- full classifyFormulation output
    scan_source    VARCHAR(20) DEFAULT 'Manual',
    created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fv_product_id  ON formulation_versions(product_id);
CREATE INDEX IF NOT EXISTS idx_fv_created_at  ON formulation_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fp_fingerprint ON formulation_products(fingerprint);
