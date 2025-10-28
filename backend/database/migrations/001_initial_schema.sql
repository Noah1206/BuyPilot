-- BuyPilot Database Schema
-- Initial migration for Supabase PostgreSQL

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
  source TEXT NOT NULL,                           -- 'alimall', '1688', 'custom'
  source_url TEXT NOT NULL,
  supplier_id TEXT,
  title TEXT NOT NULL,
  price NUMERIC(12, 2),
  currency TEXT DEFAULT 'USD',
  stock INT,
  image_url TEXT,
  score NUMERIC(5, 2),                            -- AI evaluation score
  data JSONB DEFAULT '{}'::JSONB,                 -- Original snapshot data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status order_status NOT NULL DEFAULT 'PENDING',
  platform TEXT,                                  -- 'smartstore', 'shopee', 'own'
  platform_order_ref TEXT,                        -- Platform order reference
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
  meta JSONB DEFAULT '{}'::JSONB,                 -- Additional metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buyer info table (one-to-one with orders)
CREATE TABLE buyer_info (
  order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  address1 TEXT,
  address2 TEXT,
  zip TEXT,
  country TEXT DEFAULT 'KR',
  customs_id TEXT,                                -- 개인통관고유부호
  meta JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  actor TEXT NOT NULL,                            -- 'system', 'user', 'webhook'
  action TEXT NOT NULL,                           -- 'state_change', 'call_supplier', etc.
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
