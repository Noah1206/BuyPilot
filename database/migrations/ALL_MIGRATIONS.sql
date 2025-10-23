-- =============================================================================
-- BuyPilot - All Migrations Combined
-- Run this script in Railway Postgres Data → Query
-- =============================================================================

-- =============================================================================
-- Migration 001: Initial Schema
-- =============================================================================

-- Create custom enum type for order status
CREATE TYPE order_status AS ENUM (
  'PENDING',
  'SUPPLIER_ORDERING',
  'ORDERED_SUPPLIER',
  'BUYER_INFO_SET',
  'FORWARDER_SENDING',
  'SENT_TO_FORWARDER',
  'MANUAL_REVIEW',
  'RETRYING',
  'FAILED',
  'DONE'
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  supplier_id TEXT,
  title TEXT NOT NULL,
  price NUMERIC(12, 2),
  currency TEXT DEFAULT 'USD',
  stock INT,
  image_url TEXT,
  score NUMERIC(5, 2),
  data JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status order_status NOT NULL DEFAULT 'PENDING',
  platform TEXT,
  platform_order_ref TEXT,
  product_id UUID REFERENCES products(id),
  qty INT DEFAULT 1,
  unit_price NUMERIC(12, 2),
  currency TEXT DEFAULT 'USD',
  idempotency_key TEXT UNIQUE,
  supplier_id TEXT,
  supplier_order_id TEXT,
  supplier_status TEXT,
  forwarder_id TEXT,
  forwarder_job_id TEXT,
  forwarder_status TEXT,
  meta JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buyer info table
CREATE TABLE buyer_info (
  order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  address1 TEXT,
  address2 TEXT,
  zip TEXT,
  country TEXT DEFAULT 'KR',
  customs_id TEXT,
  meta JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE products IS 'Product catalog with AI scoring';
COMMENT ON TABLE orders IS 'Order management with state machine';
COMMENT ON TABLE buyer_info IS 'Buyer shipping and customs information';
COMMENT ON TABLE audit_log IS 'Audit trail for all order operations';

COMMENT ON COLUMN products.score IS 'AI evaluation score (0-100) based on price/reviews/quality';
COMMENT ON COLUMN orders.idempotency_key IS 'Unique key for idempotent operations';
COMMENT ON COLUMN buyer_info.customs_id IS 'Korean personal customs clearance ID';

-- =============================================================================
-- Migration 002: Indexes
-- =============================================================================

-- Orders table indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_platform_ref ON orders(platform_order_ref);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_supplier_id ON orders(supplier_order_id);
CREATE INDEX idx_orders_forwarder_id ON orders(forwarder_job_id);

-- Products table indexes
CREATE INDEX idx_products_score ON products(score DESC);
CREATE INDEX idx_products_source ON products(source);
CREATE INDEX idx_products_supplier ON products(supplier_id);

-- Audit log indexes
CREATE INDEX idx_audit_log_order_id ON audit_log(order_id);
CREATE INDEX idx_audit_log_ts ON audit_log(ts DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor);

-- Partial indexes for common queries
CREATE INDEX idx_orders_pending ON orders(created_at DESC) WHERE status = 'PENDING';
CREATE INDEX idx_orders_active ON orders(updated_at DESC)
  WHERE status IN ('SUPPLIER_ORDERING', 'ORDERED_SUPPLIER', 'FORWARDER_SENDING');

-- GIN index for JSONB fields
CREATE INDEX idx_orders_meta ON orders USING GIN(meta);
CREATE INDEX idx_products_data ON products USING GIN(data);

-- Comments
COMMENT ON INDEX idx_orders_status IS 'Fast filtering by order status';
COMMENT ON INDEX idx_products_score IS 'AI score-based product ranking';
COMMENT ON INDEX idx_orders_pending IS 'Partial index for pending orders dashboard';

-- =============================================================================
-- Migration 004: Product Candidates (AI Discovery)
-- =============================================================================

CREATE TYPE candidate_status AS ENUM (
    'discovered',
    'scored',
    'optimized',
    'pending_approval',
    'approved',
    'rejected',
    'registered'
);

CREATE TABLE product_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status candidate_status NOT NULL DEFAULT 'discovered',

    -- Original Taobao data
    source VARCHAR(50) NOT NULL DEFAULT 'taobao',
    source_url TEXT NOT NULL,
    source_item_id VARCHAR(255) NOT NULL,
    original_title TEXT NOT NULL,
    original_price NUMERIC(12, 2),
    original_currency VARCHAR(10) DEFAULT 'CNY',
    original_images JSONB DEFAULT '[]',
    original_data JSONB DEFAULT '{}',

    -- AI scoring results
    ai_score NUMERIC(5, 2),
    score_breakdown JSONB DEFAULT '{}',

    -- Keyword analysis
    discovery_keyword VARCHAR(255),
    keywords JSONB DEFAULT '[]',
    trend_score NUMERIC(5, 2),
    search_volume INTEGER,

    -- AI optimization results
    optimized_title TEXT,
    optimized_description TEXT,
    optimized_images JSONB DEFAULT '[]',
    suggested_price NUMERIC(12, 2),
    suggested_cost NUMERIC(12, 2),
    suggested_margin NUMERIC(12, 2),

    -- Category mapping
    suggested_category VARCHAR(255),
    naver_category_id VARCHAR(100),

    -- Approval info
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Registration info
    registered_platform VARCHAR(50),
    registered_product_id VARCHAR(255),
    registered_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_source_item UNIQUE(source, source_item_id)
);

-- Indexes
CREATE INDEX idx_product_candidates_status ON product_candidates(status);
CREATE INDEX idx_product_candidates_ai_score ON product_candidates(ai_score DESC);
CREATE INDEX idx_product_candidates_discovery_keyword ON product_candidates(discovery_keyword);
CREATE INDEX idx_product_candidates_created_at ON product_candidates(created_at DESC);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_product_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_candidates_updated_at
    BEFORE UPDATE ON product_candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_product_candidates_updated_at();

-- Comments
COMMENT ON TABLE product_candidates IS 'AI-discovered and optimized product candidates';
COMMENT ON COLUMN product_candidates.ai_score IS 'AI comprehensive score (0-100)';
COMMENT ON COLUMN product_candidates.discovery_keyword IS 'Keyword that led to product discovery';
COMMENT ON COLUMN product_candidates.suggested_price IS 'Suggested selling price (KRW)';
COMMENT ON COLUMN product_candidates.suggested_margin IS 'Expected margin (KRW)';

-- =============================================================================
-- Migration Complete!
-- =============================================================================
