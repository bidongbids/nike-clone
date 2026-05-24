# Database Documentation — Nike Clone

Complete reference for the Supabase Postgres database. Covers every table, column, relationship, trigger, security policy, and ACID guarantee.

---

## Table of Contents

1. [ACID Properties](#acid-properties)
2. [Schema Overview](#schema-overview)
3. [Tables Reference](#tables-reference)
4. [Triggers & Functions](#triggers--functions)
5. [Row Level Security (RLS)](#row-level-security-rls)
6. [Atomic Order Placement](#atomic-order-placement)
7. [Indexes](#indexes)
8. [Realtime](#realtime)

---

## ACID Properties

Postgres (the engine Supabase runs on) is fully ACID-compliant by default. Here's how each property is enforced in this database:

### A — Atomicity
**"All or nothing."** Either every operation in a transaction succeeds, or none of them do.

- The `place_order()` SQL function wraps order creation, line-item insertion, and stock decrement in a single transaction. If stock is insufficient on the third item, the order header AND the first two items are rolled back — the database is never left in a half-finished state.
- All triggers run inside the parent transaction, so a failed stock check rolls back the entire `INSERT`.

### C — Consistency
**The database always moves from one valid state to another.** Constraints catch invalid data before it lands.

- `CHECK` constraints: `price >= 0`, `stock >= 0`, `rating BETWEEN 1 AND 5`, `status IN (...)`, `category IN (...)`, etc.
- `FOREIGN KEY` constraints: orphan rows are impossible — you can't have an `order_item` pointing to a non-existent product.
- `UNIQUE` constraints: one review per `(product_id, user_id)`, one default address per user.
- `NOT NULL` constraints on every required field.

### I — Isolation
**Concurrent transactions don't see each other's half-finished changes.**

- Postgres defaults to `READ COMMITTED` isolation — a transaction only sees committed data.
- The `decrement_stock()` trigger uses `SELECT ... FOR UPDATE` to row-lock the product while updating its stock. Two people buying the last pair of shoes simultaneously will be serialized; the second one gets "Insufficient stock" instead of overselling.

### D — Durability
**Once a transaction commits, the data survives crashes, power failures, anything.**

- Supabase uses Postgres's WAL (Write-Ahead Log) — every commit is written to disk before being acknowledged.
- Supabase performs continuous backups (Point-in-Time Recovery on paid tiers).

---

## Schema Overview

```
auth.users (managed by Supabase Auth)
    │
    └─ profiles (1:1)
         │
         ├─ addresses (1:many)
         │      │
         │      └─ orders (many:1)
         │
         ├─ orders (1:many)
         │      │
         │      └─ order_items (1:many) ──→ products
         │
         ├─ reviews (1:many) ──→ products
         │
         └─ wishlists (1:many) ──→ products
```

---

## Tables Reference

### `profiles`
Extends `auth.users` with app-specific data. Created automatically via trigger when someone signs up.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID, PK | References `auth.users(id)`. Cascades on delete. |
| `email` | TEXT | Mirrored from auth, indexed |
| `full_name` | TEXT | From signup metadata |
| `phone` | TEXT | Optional |
| `avatar_url` | TEXT | Optional |
| `role` | TEXT | One of: `super_admin`, `manager`, `editor`, `viewer`, `customer`. Default: `customer`. Indexed. |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-set by trigger |

---

### `products`
Store catalog.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGSERIAL, PK | Auto-incrementing |
| `name` | TEXT | Required |
| `description` | TEXT | Default empty string |
| `price` | NUMERIC(10,2) | Must be ≥ 0 |
| `sale_price` | NUMERIC(10,2) | Nullable, must be ≥ 0 if set |
| `category` | TEXT | `running`, `lifestyle`, or `basketball`. Indexed. |
| `image` | TEXT | Public URL from Supabase Storage |
| `colors` | TEXT[] | Hex color codes |
| `sizes` | NUMERIC[] | US sizes |
| `badge` | TEXT | `new` or `sale` or NULL. Indexed. |
| `stock` | INTEGER | Must be ≥ 0. Decremented atomically by trigger on order. |
| `is_active` | BOOLEAN | Soft-delete flag. Default TRUE. Indexed. |
| `created_at` / `updated_at` | TIMESTAMPTZ | Auto-managed |

---

### `addresses`
Saved delivery addresses, one default per user enforced by partial unique index.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID, PK | Auto-generated |
| `user_id` | UUID, FK → profiles | Cascades on delete. Indexed. |
| `label` | TEXT | "Home", "Office", "Other" |
| `full_name`, `phone`, `line1`, `line2`, `city`, `province`, `zip`, `country` | TEXT | Address fields |
| `is_default` | BOOLEAN | Only one TRUE per user (enforced by `idx_addresses_one_default_per_user`) |

---

### `orders`
Order header. Maintains totals (denormalized for performance — line items keep their own `unit_price` so historical pricing is preserved even if product price changes).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID, PK | Auto-generated |
| `user_id` | UUID, FK → profiles | RESTRICT (can't delete a user with orders) |
| `address_id` | UUID, FK → addresses | SET NULL if address deleted (preserves order history) |
| `status` | TEXT | `Processing`, `Shipped`, `Delivered`, `Cancelled` |
| `payment_method` | TEXT | `card`, `gcash`, `cod` |
| `subtotal`, `shipping`, `tax`, `total` | NUMERIC(10,2) | All ≥ 0 |
| `created_at` | TIMESTAMPTZ | Indexed DESC for fast recent-orders queries |

---

### `order_items`
Line items.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGSERIAL, PK | |
| `order_id` | UUID, FK → orders | Cascades on delete |
| `product_id` | BIGINT, FK → products | RESTRICT (can't delete product with orders) |
| `size` | NUMERIC | US shoe size at time of purchase |
| `qty` | INTEGER | Must be > 0 |
| `unit_price` | NUMERIC(10,2) | Snapshot of price at time of order (immutable) |

---

### `reviews`
One review per `(product_id, user_id)`. Verified flag is set by trigger based on purchase history.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGSERIAL, PK | |
| `product_id` | BIGINT, FK | Cascades on delete |
| `user_id` | UUID, FK → profiles | Cascades on delete |
| `rating` | SMALLINT | 1 to 5 |
| `title`, `body` | TEXT | Required |
| `verified` | BOOLEAN | Auto-set by trigger if user has purchased the product |

---

### `wishlists`
Saved items per user. Unique on `(user_id, product_id)` to prevent duplicates.

---

## Triggers & Functions

### `handle_new_user()`
Fires AFTER INSERT on `auth.users`. Creates a matching row in `public.profiles` with role `customer`. Uses `ON CONFLICT DO NOTHING` so it's safe to re-run.

### `decrement_stock()`
Fires AFTER INSERT on `order_items`. Locks the product row with `SELECT ... FOR UPDATE`, validates stock, then decrements. **This is the critical ACID Isolation guarantee** — two concurrent buys can't both succeed if there's only one item left.

### `restore_stock_on_cancel()`
Fires AFTER UPDATE on `orders` when status changes to `Cancelled`. Adds quantities back to product stock.

### `set_review_verified()`
Fires BEFORE INSERT on `reviews`. Checks if the reviewer has ever ordered this product (and the order wasn't cancelled) — if yes, marks the review as verified.

### `ensure_single_default_address()`
Fires AFTER INSERT/UPDATE on `addresses` when `is_default = TRUE`. Clears the default flag on all other addresses for the same user. Combined with the partial unique index, this guarantees exactly one default at all times.

### `set_updated_at()`
Generic trigger on `profiles`, `products`, `orders` — auto-updates the `updated_at` timestamp on every modification.

### `get_user_role()` / `is_staff()`
Helper functions used by RLS policies. Run with `SECURITY DEFINER` to bypass RLS during role lookup (otherwise they'd cause infinite recursion).

---

## Row Level Security (RLS)

Every table has RLS enabled. Policies define exactly who can do what:

| Table | Read | Insert | Update | Delete |
|---|---|---|---|---|
| `profiles` | self + staff | (auto via trigger) | self (except role) / super_admin (role) | — |
| `products` | anyone (active only) / staff (all) | editor+ | editor+ | manager+ |
| `addresses` | self + staff | self | self | self |
| `orders` | self + staff | self | manager+ | — |
| `order_items` | self + staff | self (via parent order) | — | — |
| `reviews` | anyone | authenticated self | self | self + manager+ |
| `wishlists` | self | self | self | self |

The anon key is safe to expose — RLS prevents users from reading or modifying data they shouldn't see.

---

## Atomic Order Placement

The `place_order()` SQL function is the most important part of the database. It accepts the cart as JSONB and creates everything inside one transaction:

```sql
SELECT place_order(
  p_address_id    := '...',
  p_payment_method := 'cod',
  p_items         := '[{"product_id":1,"size":9,"qty":2,"unit_price":7500}]'::jsonb,
  p_subtotal      := 15000,
  p_shipping      := 0,
  p_tax           := 1200,
  p_total         := 16200
);
```

**What happens inside one transaction:**

1. Insert into `orders` → get new order ID
2. For each item in the JSONB array → insert into `order_items`
3. Each insert fires `decrement_stock()` → locks product row, validates stock, decrements
4. If ANY step fails (e.g. insufficient stock on the 3rd item), Postgres rolls back the entire transaction — no orphan order, no partial stock decrements

This guarantees you can never sell more inventory than you have, even with hundreds of concurrent buyers.

---

## Indexes

Indexes make common queries fast:

- `idx_profiles_role` — speeds up `is_staff()` lookups in every RLS policy
- `idx_profiles_email` — fast email lookups
- `idx_products_category`, `idx_products_active`, `idx_products_badge` — fast product listing & filtering
- `idx_addresses_user_id` — fast address lookups during checkout
- `idx_addresses_one_default_per_user` — UNIQUE partial index enforcing single default
- `idx_orders_user_id`, `idx_orders_status`, `idx_orders_created_at` — fast order history queries
- `idx_order_items_order_id`, `idx_order_items_product_id` — fast joins
- `idx_reviews_product_id`, `idx_reviews_user_id` — fast review queries
- `idx_wishlists_user_id` — fast wishlist lookups

---

## Realtime

Four tables are added to `supabase_realtime` publication, so the React app receives instant updates when data changes:

- `products` — stock changes broadcast to all open shopping sessions
- `orders` — admin dashboard updates in real time
- `order_items` — admin order detail views update
- `reviews` — new reviews appear instantly on product pages

The client subscribes via `supabase.channel('...').on('postgres_changes', ...)`.

---

## Quick Operations Reference

**Make a user a super_admin:**
```sql
UPDATE profiles SET role = 'super_admin' WHERE email = 'you@example.com';
```

**See all orders with totals:**
```sql
SELECT id, status, total, created_at FROM orders ORDER BY created_at DESC LIMIT 20;
```

**Restock a product:**
```sql
UPDATE products SET stock = stock + 50 WHERE id = 1;
```

**Top selling products:**
```sql
SELECT p.name, SUM(oi.qty) AS sold
FROM order_items oi JOIN products p ON p.id = oi.product_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'Cancelled'
GROUP BY p.id, p.name
ORDER BY sold DESC LIMIT 10;
```

**Revenue this month:**
```sql
SELECT SUM(total) FROM orders
WHERE status != 'Cancelled' AND created_at >= date_trunc('month', NOW());
```
