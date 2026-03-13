-- ============================================================
-- Reasonable Store — Migration v3
-- Adds: customer accounts, orders, order_items, product image_url
-- Run once:
--   kubectl exec -it postgres-0 -n reasonable-store -- \
--     psql -U postgres -d reasonablestore -f /migration-v3.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Categories ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  icon        VARCHAR(10)  NOT NULL DEFAULT '🛍️',
  description TEXT,
  color_class VARCHAR(10)  DEFAULT 'c1',
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  category_id   INTEGER      REFERENCES categories(id) ON DELETE SET NULL,
  emoji         VARCHAR(10)  DEFAULT '📦',
  badge         VARCHAR(30),
  bg_color      VARCHAR(30)  DEFAULT '#f5ece0',
  stock         INTEGER      DEFAULT 100,
  is_featured   BOOLEAN      DEFAULT FALSE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Gallery Photos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_photos (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename    VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  url         TEXT         NOT NULL,
  label       VARCHAR(200),
  is_featured BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Customer Queries ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_queries (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name    VARCHAR(200) NOT NULL,
  email        VARCHAR(200) NOT NULL,
  phone        VARCHAR(30),
  category     VARCHAR(100),
  message      TEXT         NOT NULL,
  status       VARCHAR(30)  DEFAULT 'new',   -- new | read | replied
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Cart Items (session-based, no auth required) ─────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  VARCHAR(100) NOT NULL,
  product_id  UUID         REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER      DEFAULT 1,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Update trigger for products ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Seed Data
-- ============================================================

INSERT INTO categories (name, slug, icon, description, color_class) VALUES
  ('Toiletries',          'toiletries',   '🧴', 'Soaps, Shampoos, Skincare & more',   'c1'),
  ('Makeup & Beauty',     'makeup',       '💄', 'Lipstick, Foundation, Kohl & more',  'c2'),
  ('Men''s Clothing',     'mensfashion',  '👔', 'Shirts, Trousers, Jackets & more',   'c3'),
  ('Women''s Lingerie',   'lingerie',     '👙', 'Bras, Briefs, Nightwear & more',     'c4'),
  ('Toys & Games',        'toys',         '🧸', 'For all ages',                       'c5'),
  ('Bags & Accessories',  'accessories',  '👜', 'Handbags, Wallets, Belts & more',    'c6'),
  ('Home & Kitchen',      'homecare',     '🏠', 'Cleaners, Organizers & more',        'c7'),
  ('Health & Wellness',   'wellness',     '💊', 'Vitamins, First Aid & more',         'c8')
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, price, original_price, category_id, emoji, badge, bg_color, is_featured) VALUES
  ('Rose Glow Face Wash',      'Gentle rose-infused face wash for all skin types',     320,  450,  1, '🧴', 'SALE',  '#fde8e8', true),
  ('Herbal Shampoo 400ml',     'Natural herbal blend for strong healthy hair',         280,  NULL, 1, '🧼', NULL,    '#e8f4fd', false),
  ('Moisturising Body Lotion', 'Deep moisture for soft silky skin',                    450,  NULL, 1, '🫧', 'NEW',   '#e8fdf0', true),
  ('Matte Lipstick Set',       'Long-lasting 6-shade matte lipstick collection',       699,  900,  2, '💄', 'SALE',  '#fde8f4', true),
  ('HD Foundation SPF 30',     'Full coverage foundation with sun protection',         1200, NULL, 2, '✨', 'HOT',   '#fff8e8', true),
  ('Kohl Kajal Pen',           'Smudge-proof intense black kajal',                     199,  NULL, 2, '👁️', NULL,    '#ede8f9', false),
  ('Men''s Linen Formal Shirt','Premium linen shirt perfect for office & events',      1800, 2500, 3, '👔', 'SALE',  '#e8edf9', true),
  ('Slim Fit Chino Trousers',  'Modern slim fit chinos in multiple colours',           2200, NULL, 3, '👖', 'NEW',   '#f9ece8', false),
  ('Branded Bomber Jacket',    'Genuine branded bomber jacket, premium quality',       5500, 7000, 3, '🧥', 'SALE',  '#e8f9f5', true),
  ('Cotton Lace Bra Set',      'Comfortable everyday cotton with elegant lace trim',   850,  NULL, 4, '👙', NULL,    '#fde8f4', false),
  ('Silk Nightdress',          'Luxuriously soft silk nightdress',                     1200, 1600, 4, '🌙', 'SALE',  '#f4e8fd', true),
  ('Colourful Building Blocks','60-piece educational building block set',              550,  NULL, 5, '🧱', NULL,    '#fff8e8', false),
  ('Plush Teddy Bear XL',      'Super soft extra-large teddy bear',                    900,  1200, 5, '🧸', 'SALE',  '#fde8e8', true),
  ('Remote Control Car',       'Fast RC car with rechargeable battery',                1600, NULL, 5, '🚗', 'HOT',   '#e8f0fd', true),
  ('Tote Bag – Floral Print',  'Eco-friendly canvas tote with floral design',          750,  NULL, 6, '👜', 'NEW',   '#fdf4e8', false),
  ('Leather Belt – Men',       'Genuine leather belt, multiple sizes',                 600,  NULL, 6, '🪢', NULL,    '#e8fde9', false),
  ('All-Purpose Floor Cleaner','Concentrated formula, fresh lemon scent',              220,  NULL, 7, '🫙', NULL,    '#e8f9fd', false),
  ('Vitamin C Effervescent',   '1000mg Vitamin C with zinc, 20 tablets',               380,  NULL, 8, '💊', NULL,    '#fff8e8', false)
ON CONFLICT DO NOTHING;

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
