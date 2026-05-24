-- ============================================================
-- NIKE CLONE — FULL DATABASE SCHEMA (v2, ACID + indexed + safe)
-- Run in Supabase → SQL Editor → New Query
-- Safe to re-run (drops first, then rebuilds)
-- ============================================================

-- ── Drop existing policies ──────────────────────────────────
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS on_order_item_insert ON public.order_items;
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
DROP TRIGGER IF EXISTS set_review_verified_on_insert ON public.reviews;
DROP TRIGGER IF EXISTS on_address_default_change ON public.addresses;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.decrement_stock() CASCADE;
DROP FUNCTION IF EXISTS public.restore_stock_on_cancel() CASCADE;
DROP FUNCTION IF EXISTS public.set_review_verified() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_single_default_address() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_staff() CASCADE;
DROP FUNCTION IF EXISTS public.place_order(JSONB, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.ensure_profile_exists() CASCADE;

DROP TABLE IF EXISTS public.wishlists CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.addresses CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- ── profiles: stores user info & role (linked 1:1 to auth.users)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'customer'
                CHECK (role IN ('super_admin','manager','editor','viewer','customer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profiles_role  ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ── products: store catalog
CREATE TABLE public.products (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  sale_price    NUMERIC(10,2) CHECK (sale_price >= 0),
  category      TEXT NOT NULL CHECK (category IN ('running','lifestyle','basketball')),
  image         TEXT NOT NULL DEFAULT '',
  colors        TEXT[]    NOT NULL DEFAULT '{}',
  sizes         NUMERIC[] NOT NULL DEFAULT '{}',
  badge         TEXT CHECK (badge IN ('new','sale') OR badge IS NULL),
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_active   ON public.products(is_active);
CREATE INDEX idx_products_badge    ON public.products(badge);

-- ── addresses: saved delivery addresses (one default per user)
CREATE TABLE public.addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'Home',
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  line1       TEXT NOT NULL,
  line2       TEXT,
  city        TEXT NOT NULL,
  province    TEXT NOT NULL,
  zip         TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'Philippines',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_addresses_user_id ON public.addresses(user_id);
CREATE UNIQUE INDEX idx_addresses_one_default_per_user
  ON public.addresses(user_id) WHERE is_default = TRUE;

-- ── orders: header table for transactions
CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  address_id      UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'Processing'
                    CHECK (status IN ('Processing','Shipped','Delivered','Cancelled')),
  payment_method  TEXT NOT NULL DEFAULT 'cod'
                    CHECK (payment_method IN ('card','gcash','cod')),
  subtotal        NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  shipping        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (shipping >= 0),
  tax             NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total           NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_user_id    ON public.orders(user_id);
CREATE INDEX idx_orders_status     ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- ── order_items: line items
CREATE TABLE public.order_items (
  id          BIGSERIAL PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  size        NUMERIC NOT NULL,
  qty         INTEGER NOT NULL CHECK (qty > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_items_order_id   ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);

-- ── reviews: one per (user, product)
CREATE TABLE public.reviews (
  id          BIGSERIAL PRIMARY KEY,
  product_id  BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_reviews_user_id    ON public.reviews(user_id);

-- ── wishlists
CREATE TABLE public.wishlists (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX idx_wishlists_user_id ON public.wishlists(user_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current user's role (SECURITY DEFINER bypasses RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('super_admin','manager','editor','viewer');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"       ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"     ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Staff can read all profiles"      ON public.profiles FOR SELECT USING (is_staff());
CREATE POLICY "Super admin can update roles"     ON public.profiles FOR UPDATE USING (get_user_role() = 'super_admin');

CREATE POLICY "Anyone can read active products"  ON public.products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Staff can read all products"      ON public.products FOR SELECT USING (is_staff());
CREATE POLICY "Editor+ can insert products"      ON public.products FOR INSERT WITH CHECK (get_user_role() IN ('super_admin','manager','editor'));
CREATE POLICY "Editor+ can update products"      ON public.products FOR UPDATE USING (get_user_role() IN ('super_admin','manager','editor'));
CREATE POLICY "Manager+ can delete products"     ON public.products FOR DELETE USING (get_user_role() IN ('super_admin','manager'));

CREATE POLICY "Users manage own addresses"       ON public.addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Staff can read addresses"         ON public.addresses FOR SELECT USING (is_staff());

CREATE POLICY "Users can read own orders"        ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders"          ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can read all orders"        ON public.orders FOR SELECT USING (is_staff());
CREATE POLICY "Manager+ can update order status" ON public.orders FOR UPDATE USING (get_user_role() IN ('super_admin','manager'));

CREATE POLICY "Users can read own order items"   ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Users can insert order items"     ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Staff can read all order items"   ON public.order_items FOR SELECT USING (is_staff());

CREATE POLICY "Anyone can read reviews"          ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "Auth users can add reviews"       ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews"     ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews"     ON public.reviews FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Manager+ can delete any review"   ON public.reviews FOR DELETE USING (get_user_role() IN ('super_admin','manager'));

CREATE POLICY "Users manage own wishlist"        ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS — auto-create profile, timestamps, stock control
-- ============================================================

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''), 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any missing profiles for existing users (safety net)
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name',''), 'customer'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_orders_updated_at   BEFORE UPDATE ON public.orders   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Stock decrement on order item insert (atomic with FOR UPDATE lock)
CREATE OR REPLACE FUNCTION public.decrement_stock()
RETURNS TRIGGER AS $$
DECLARE current_stock INTEGER;
BEGIN
  -- Lock the row to prevent concurrent writes (Isolation in ACID)
  SELECT stock INTO current_stock FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF current_stock < NEW.qty THEN
    RAISE EXCEPTION 'Insufficient stock for product %', NEW.product_id USING ERRCODE = '23514';
  END IF;
  UPDATE public.products SET stock = stock - NEW.qty WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_item_insert
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock();

-- Restore stock if order cancelled
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Cancelled' AND OLD.status != 'Cancelled' THEN
    UPDATE public.products p SET stock = p.stock + oi.qty
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_cancel();

-- Mark review as verified if user has bought the product
CREATE OR REPLACE FUNCTION public.set_review_verified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.verified := EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.user_id = NEW.user_id AND oi.product_id = NEW.product_id AND o.status != 'Cancelled'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_review_verified_on_insert
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_review_verified();

-- Ensure at most one default address per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.addresses SET is_default = FALSE WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_address_default_change
  AFTER INSERT OR UPDATE OF is_default ON public.addresses
  FOR EACH ROW WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION public.ensure_single_default_address();

-- ============================================================
-- ACID-compliant ATOMIC ORDER PLACEMENT
-- Single transaction: validates stock, creates order + items,
-- decrements stock. Either everything succeeds or nothing changes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.place_order(
  p_address_id    UUID,
  p_payment_method TEXT,
  p_items         JSONB,         -- [{product_id, size, qty, unit_price}, ...]
  p_subtotal      NUMERIC,
  p_shipping      NUMERIC,
  p_tax           NUMERIC,
  p_total         NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_order_id  UUID;
  v_item      JSONB;
  v_uid       UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Atomic transaction starts here (Postgres function = single transaction)
  INSERT INTO public.orders (user_id, address_id, payment_method, subtotal, shipping, tax, total)
  VALUES (v_uid, p_address_id, p_payment_method, p_subtotal, p_shipping, p_tax, p_total)
  RETURNING id INTO v_order_id;

  -- Insert all items (trigger decrements stock & validates)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.order_items (order_id, product_id, size, qty, unit_price)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::BIGINT,
      (v_item->>'size')::NUMERIC,
      (v_item->>'qty')::INTEGER,
      (v_item->>'unit_price')::NUMERIC
    );
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;

-- ============================================================
-- SEED DATA (prices in PHP)
-- ============================================================

INSERT INTO public.products (name, description, price, sale_price, category, image, colors, sizes, badge, stock) VALUES
('Air Max 270',         'The Nike Air Max 270 delivers unrivaled all-day comfort with a large Air unit in the heel.',         7500.00, NULL,    'running',    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', ARRAY['#111','#fff','#e5ff00'], ARRAY[7,7.5,8,8.5,9,9.5,10,10.5,11,12], 'new',  24),
('Air Force 1 Low',     'The radically innovative Air Force 1 Low gives you iconic style and everyday comfort.',               5500.00, NULL,    'lifestyle',  'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=600&q=80', ARRAY['#fff','#111'],           ARRAY[7,7.5,8,8.5,9,9.5,10,10.5,11,12], NULL,   40),
('React Infinity Run',  'Designed to help reduce injury and keep you on the run. Plush, secure ride.',                        8000.00, 6000.00, 'running',    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80', ARRAY['#2563eb','#111','#f04048'], ARRAY[7,8,8.5,9,9.5,10,11],         'sale', 12),
('Pegasus 40',          'The Nike Pegasus 40 delivers responsive cushioning and energetic performance mile after mile.',       6500.00, NULL,    'running',    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80', ARRAY['#111','#3b82f6','#f04048'], ARRAY[7,7.5,8,8.5,9,9.5,10,11,12],  NULL,   30),
('Jordan 1 Retro High', 'The Air Jordan 1 Retro High OG brings back the classic design that changed basketball forever.',     9000.00, NULL,    'basketball', 'https://images.unsplash.com/photo-1556048219-bb6978360b84?w=600&q=80', ARRAY['#dc2626','#111','#fff'],  ARRAY[8,8.5,9,9.5,10,10.5,11,12,13],    'new',  8),
('Blazer Mid 77',       'Back from the hardwood to the streets, the Blazer Mid 77 brings out your inner street style.',       5000.00, 4000.00, 'lifestyle',  'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=600&q=80', ARRAY['#fff','#f5e6d3','#111'], ARRAY[7,7.5,8,8.5,9,9.5,10,10.5,11],    'sale', 20),
('ZoomX Vaporfly',      'Built for speed on the track and road, the Vaporfly helps you achieve your personal best.',          12500.00, NULL,   'running',    'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&q=80', ARRAY['#e5ff00','#111'],         ARRAY[8,8.5,9,9.5,10,10.5,11],          'new',  5),
('Dunk Low',            'Created for the hardwood but taken to the streets, the Nike Dunk Low is a timeless classic.',        5500.00, NULL,    'lifestyle',  'https://images.unsplash.com/photo-1612015498689-397c85ae3286?w=600&q=80', ARRAY['#22c55e','#fff','#111'],  ARRAY[7,7.5,8,8.5,9,9.5,10,10.5,11,12], NULL,   16);

-- ============================================================
-- AFTER REGISTERING, MAKE YOURSELF SUPER ADMIN:
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'your@email.com';
-- ============================================================
