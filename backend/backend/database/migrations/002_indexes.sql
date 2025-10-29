-- BuyPilot Database Indexes
-- Performance optimization indexes

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

-- GIN index for JSONB fields (for metadata queries)
CREATE INDEX idx_orders_meta ON orders USING GIN(meta);
CREATE INDEX idx_products_data ON products USING GIN(data);

-- Comments
COMMENT ON INDEX idx_orders_status IS 'Fast filtering by order status';
COMMENT ON INDEX idx_products_score IS 'AI score-based product ranking';
COMMENT ON INDEX idx_orders_pending IS 'Partial index for pending orders dashboard';
