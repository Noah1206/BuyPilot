# BuyPilot Database Schema

## Overview
PostgreSQL database schema for BuyPilot order management system, designed for Supabase.

## Running Migrations

### On Supabase
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run migrations in order:
   - `001_initial_schema.sql` - Creates tables and types
   - `002_indexes.sql` - Creates performance indexes

### Locally (for development)
```bash
# Connect to Supabase DB
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Run migrations
\i database/migrations/001_initial_schema.sql
\i database/migrations/002_indexes.sql
```

## Schema Overview

### Tables

#### `products`
Product catalog with AI scoring system.
- **Columns**: id, source, source_url, supplier_id, title, price, currency, stock, image_url, score, data
- **Purpose**: Store supplier products with AI evaluation scores

#### `orders`
Main order management table with state machine.
- **Columns**: id, status, platform, platform_order_ref, product_id, qty, unit_price, currency, supplier_order_id, forwarder_job_id, meta
- **Purpose**: Track orders through purchase and shipping lifecycle

#### `buyer_info`
Buyer shipping and customs information.
- **Columns**: order_id, name, phone, address1, address2, zip, country, customs_id
- **Purpose**: Store buyer details for shipping and customs clearance

#### `audit_log`
Audit trail for all order operations.
- **Columns**: id, order_id, actor, action, meta, ts
- **Purpose**: Compliance and debugging

### Order Status Flow
```
PENDING
  → SUPPLIER_ORDERING (purchase initiated)
  → ORDERED_SUPPLIER (supplier confirmed)
  → BUYER_INFO_SET (ready for shipping)
  → FORWARDER_SENDING (shipping initiated)
  → SENT_TO_FORWARDER (in transit)
  → DONE (delivered)

Error states:
  → MANUAL_REVIEW (policy violation, stock issues)
  → RETRYING (temporary failure)
  → FAILED (permanent failure)
```

## Indexes

### Performance Indexes
- `idx_orders_status` - Fast status filtering
- `idx_orders_platform_ref` - Quick platform order lookup
- `idx_products_score` - AI score-based ranking

### Partial Indexes
- `idx_orders_pending` - Optimized for pending orders dashboard
- `idx_orders_active` - Optimized for in-progress orders

## Sample Queries

### Get pending orders
```sql
SELECT * FROM orders WHERE status = 'PENDING' ORDER BY created_at DESC;
```

### Get order with buyer info
```sql
SELECT o.*, b.*
FROM orders o
LEFT JOIN buyer_info b ON o.id = b.order_id
WHERE o.id = 'order-uuid-here';
```

### Audit trail for order
```sql
SELECT * FROM audit_log WHERE order_id = 'order-uuid-here' ORDER BY ts DESC;
```

### Top-scored products
```sql
SELECT * FROM products WHERE score > 80 ORDER BY score DESC LIMIT 10;
```

## Security

### RLS (Row Level Security)
For multi-tenant setup, enable RLS and create policies:

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);
```

### Environment Variables
- `SUPABASE_DB_URL` - PostgreSQL connection string
- Store in Railway environment variables for backend

## Maintenance

### Cleanup old audit logs
```sql
DELETE FROM audit_log WHERE ts < NOW() - INTERVAL '90 days';
```

### Update timestamps trigger (optional)
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```
