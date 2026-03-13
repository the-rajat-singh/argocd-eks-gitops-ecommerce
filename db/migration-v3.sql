-- ============================================================
-- Reasonable Store — Migration v3
-- Adds: customer accounts, orders, order_items, product image_url
-- Run once:
--   kubectl exec -it postgres-0 -n reasonable-store -- \
--     psql -U postgres -d reasonablestore -f /migration-v3.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add image_url to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Customer accounts
CREATE TABLE IF NOT EXISTS customers (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       VARCHAR(200) NOT NULL,
  email           VARCHAR(200) NOT NULL UNIQUE,
  phone           VARCHAR(30),
  password_hash   VARCHAR(200) NOT NULL,
  -- address (all optional — filled after login)
  address_line1   VARCHAR(300),
  address_line2   VARCHAR(300),
  city            VARCHAR(100),
  province        VARCHAR(100),
  postal_code     VARCHAR(20),
  country         VARCHAR(100) DEFAULT 'Pakistan',
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- 3. Session tokens (30-day login)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token        VARCHAR(200) NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number     VARCHAR(50)  NOT NULL UNIQUE,
  customer_id      UUID         REFERENCES customers(id) ON DELETE SET NULL,
  session_id       VARCHAR(100),
  -- delivery snapshot
  delivery_name    VARCHAR(200) NOT NULL,
  delivery_phone   VARCHAR(30)  NOT NULL,
  delivery_address TEXT         NOT NULL,
  delivery_city    VARCHAR(100) NOT NULL,
  -- payment
  payment_method   VARCHAR(20)  NOT NULL DEFAULT 'cod',   -- cod | upi
  payment_status   VARCHAR(30)  DEFAULT 'pending',         -- pending | verified | failed
  upi_txn_id       VARCHAR(200),
  upi_screenshot   TEXT,                                   -- filename if uploaded
  -- amounts
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- status
  status           VARCHAR(30)  DEFAULT 'placed',          -- placed|confirmed|shipped|delivered|cancelled
  notes            TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- 5. Order line items
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID         REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  quantity     INTEGER       NOT NULL DEFAULT 1,
  emoji        VARCHAR(10),
  image_url    TEXT
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_customers_email   ON customers(email);
CREATE INDEX IF NOT EXISTS idx_auth_token        ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_orders_customer   ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_session    ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 7. Triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_upd ON customers;
CREATE TRIGGER trg_customers_upd BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_orders_upd ON orders;
CREATE TRIGGER trg_orders_upd BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

SELECT 'Migration v3 complete ✅' AS result;
