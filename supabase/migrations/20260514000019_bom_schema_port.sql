-- 20260514000019_bom_schema_port.sql
--
-- Phase 2-B: BOM schema port — 19 tables + 5 enums + 25 functions + 20 triggers + 42 RLS policies → bom.*
--
-- 參照：https://github.com/chahababa/hoochuu-internal-docs/blob/main/merge-plan-curried-brewing-fog.md §A.1, §B Phase 2
--
-- 來源：Hoochuu-Bom-System repo 的 17 支 migration（跳過 _2_stores_users / _11_auth_hook_rls_fix / _12_sync_user_role_to_auth_metadata）
--
-- Rewrites applied:
--   - All BOM-local tables → bom.<table>
--   - All BOM enums → bom.<enum>
--   - All BOM functions → bom.<fn>
--   - auth.jwt()->'app_metadata'->>'role' → public.current_user_role()
--   - auth.jwt()->'app_metadata'->>'store_id' → public.current_user_store_id()
--   - 'area_manager' → 'manager'; 'staff' → 'leader'
--   - REFERENCES auth.users for created_by/updated_by/deleted_by → REFERENCES public.users
--   - Every RLS policy appends AND public.current_user_can_access_bom()
--
-- DEFERRED to Phase 5 (BOM Infra):
--   - All cron.schedule() calls (留 stubs as comments)
--   - All pg_net.http_post() Edge Function dispatches
--   - All vault.decrypted_secrets lookups
--
-- fn_recalc_current_price uses M16 final form (precision 2→4 + variance detection from M15)
--
-- Idempotent: CREATE OR REPLACE / IF NOT EXISTS / DROP TRIGGER IF EXISTS patterns throughout.

-- ============================================================
-- Ported from BOM M01: init.sql — extensions + util trigger
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE OR REPLACE FUNCTION bom.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Ported from BOM M03: ingredients_products.sql
-- ============================================================

-- ingredients（食材層）
CREATE TABLE IF NOT EXISTS bom.ingredients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted      boolean NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delete_reason   text,

  name            text NOT NULL,
  category        text NOT NULL CHECK (category IN ('food', 'packaging', 'other')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'merged')),
  merged_into_id  uuid REFERENCES bom.ingredients(id)
);

DROP TRIGGER IF EXISTS trg_ingredients_updated_at ON bom.ingredients;
CREATE TRIGGER trg_ingredients_updated_at
  BEFORE UPDATE ON bom.ingredients
  FOR EACH ROW EXECUTE FUNCTION bom.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm
  ON bom.ingredients USING gin (name public.gin_trgm_ops);

-- products（品項層）
CREATE TABLE IF NOT EXISTS bom.products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted      boolean NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delete_reason   text,

  ingredient_id   uuid NOT NULL REFERENCES bom.ingredients(id),
  name            text NOT NULL,
  brand           text,
  spec            text,
  unit            text NOT NULL CHECK (unit IN ('g', 'ml', '個', '包')),
  purchase_type   text NOT NULL CHECK (purchase_type IN ('collective', 'regional', 'individual', 'temporary')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'merged')),
  merged_into_id  uuid REFERENCES bom.products(id)
);

DROP TRIGGER IF EXISTS trg_products_updated_at ON bom.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON bom.products
  FOR EACH ROW EXECUTE FUNCTION bom.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON bom.products USING gin (name public.gin_trgm_ops);

-- RLS: ingredients
ALTER TABLE bom.ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingredients_select" ON bom.ingredients;
CREATE POLICY "ingredients_select" ON bom.ingredients
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_bom());

DROP POLICY IF EXISTS "ingredients_insert" ON bom.ingredients;
CREATE POLICY "ingredients_insert" ON bom.ingredients
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_can_access_bom());

DROP POLICY IF EXISTS "ingredients_update_manager" ON bom.ingredients;
CREATE POLICY "ingredients_update_manager" ON bom.ingredients
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('manager', 'owner')
    AND public.current_user_can_access_bom()
  )
  WITH CHECK (
    public.current_user_role() IN ('manager', 'owner')
    AND public.current_user_can_access_bom()
  );

-- RLS: products
ALTER TABLE bom.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select" ON bom.products;
CREATE POLICY "products_select" ON bom.products
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_bom());

DROP POLICY IF EXISTS "products_insert" ON bom.products;
CREATE POLICY "products_insert" ON bom.products
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_can_access_bom());

DROP POLICY IF EXISTS "products_update_manager" ON bom.products;
CREATE POLICY "products_update_manager" ON bom.products
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('manager', 'owner')
    AND public.current_user_can_access_bom()
  )
  WITH CHECK (
    public.current_user_role() IN ('manager', 'owner')
    AND public.current_user_can_access_bom()
  );

-- BEFORE INSERT triggers：強制 status = 'pending'（非管理層）
CREATE OR REPLACE FUNCTION bom.fn_force_pending_status_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (
    coalesce(public.current_user_role()::text, '') IN ('manager', 'owner')
  ) THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_force_pending_ingredients ON bom.ingredients;
CREATE TRIGGER trg_force_pending_ingredients
  BEFORE INSERT ON bom.ingredients
  FOR EACH ROW EXECUTE FUNCTION bom.fn_force_pending_status_ingredients();

CREATE OR REPLACE FUNCTION bom.fn_force_pending_status_products()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (
    coalesce(public.current_user_role()::text, '') IN ('manager', 'owner')
  ) THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_force_pending_products ON bom.products;
CREATE TRIGGER trg_force_pending_products
  BEFORE INSERT ON bom.products
  FOR EACH ROW EXECUTE FUNCTION bom.fn_force_pending_status_products();

-- 查重 RPC functions
CREATE OR REPLACE FUNCTION bom.suggest_similar_ingredients(query text)
RETURNS TABLE(id uuid, name text, category text, similarity_score real)
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.name, i.category, public.similarity(i.name, query) AS similarity_score
  FROM bom.ingredients i
  WHERE public.similarity(i.name, query) >= 0.3
    AND i.is_deleted = false
    AND i.status != 'merged'
  ORDER BY similarity_score DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION bom.suggest_similar_products(query text)
RETURNS TABLE(id uuid, name text, brand text, spec text, ingredient_id uuid, similarity_score real)
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.brand, p.spec, p.ingredient_id, public.similarity(p.name, query) AS similarity_score
  FROM bom.products p
  WHERE public.similarity(p.name, query) >= 0.3
    AND p.is_deleted = false
    AND p.status != 'merged'
  ORDER BY similarity_score DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Ported from BOM M04: purchase_records.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS bom.purchase_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted        boolean NOT NULL DEFAULT false,
  deleted_at        timestamptz,
  deleted_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delete_reason     text,

  product_id        uuid NOT NULL REFERENCES bom.products(id),
  store_id          uuid NOT NULL REFERENCES public.stores(id),
  purchase_date     date NOT NULL,
  quantity          numeric NOT NULL,
  unit_price        numeric NOT NULL,
  total_amount      numeric NOT NULL,
  supplier          text,
  receipt_image_url text,
  is_temporary      boolean NOT NULL DEFAULT false
);

DROP TRIGGER IF EXISTS trg_purchase_records_updated_at ON bom.purchase_records;
CREATE TRIGGER trg_purchase_records_updated_at
  BEFORE UPDATE ON bom.purchase_records
  FOR EACH ROW EXECUTE FUNCTION bom.fn_set_updated_at();

-- total_amount 自動計算 trigger
CREATE OR REPLACE FUNCTION bom.fn_calc_total_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_total_amount ON bom.purchase_records;
CREATE TRIGGER trg_calc_total_amount
  BEFORE INSERT OR UPDATE ON bom.purchase_records
  FOR EACH ROW EXECUTE FUNCTION bom.fn_calc_total_amount();

ALTER TABLE bom.purchase_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_records_select" ON bom.purchase_records;
CREATE POLICY "purchase_records_select" ON bom.purchase_records
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_bom());

-- INSERT：leader 限當日自店（Asia/Taipei）；管理層可任意店
DROP POLICY IF EXISTS "purchase_records_insert" ON bom.purchase_records;
CREATE POLICY "purchase_records_insert" ON bom.purchase_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_can_access_bom()
    AND (
      public.current_user_role() IN ('manager', 'owner')
      OR (
        store_id = public.current_user_store_id()
        AND purchase_date = DATE(now() AT TIME ZONE 'Asia/Taipei')
      )
    )
  );

-- UPDATE：leader 限當日自店；管理層全權
DROP POLICY IF EXISTS "purchase_records_update" ON bom.purchase_records;
CREATE POLICY "purchase_records_update" ON bom.purchase_records
  FOR UPDATE TO authenticated
  USING (
    public.current_user_can_access_bom()
    AND (
      public.current_user_role() IN ('manager', 'owner')
      OR (
        store_id = public.current_user_store_id()
        AND purchase_date = DATE(now() AT TIME ZONE 'Asia/Taipei')
      )
    )
  )
  WITH CHECK (
    public.current_user_can_access_bom()
    AND (
      public.current_user_role() IN ('manager', 'owner')
      OR (
        store_id = public.current_user_store_id()
        AND purchase_date = DATE(now() AT TIME ZONE 'Asia/Taipei')
      )
    )
  );

-- ============================================================
-- Ported from BOM M05: current_prices_engine.sql (table defs only)
-- fn_recalc_current_price 改用 M16 終版（含 M15 variance + M16 precision fix）
-- ============================================================

CREATE TABLE IF NOT EXISTS bom.system_config (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES public.users(id) ON DELETE SET NULL
);

INSERT INTO bom.system_config (key, value) VALUES
  ('n_value', '3'),
  ('variance_threshold', '0.15'),
  ('weekly_digest_day', '1'),
  ('weekly_digest_hour', '9')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE bom.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_select" ON bom.system_config;
CREATE POLICY "system_config_select" ON bom.system_config
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_bom());

DROP POLICY IF EXISTS "system_config_update_owner" ON bom.system_config;
CREATE POLICY "system_config_update_owner" ON bom.system_config
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'owner'
    AND public.current_user_can_access_bom()
  )
  WITH CHECK (
    public.current_user_role() = 'owner'
    AND public.current_user_can_access_bom()
  );

-- current_prices（現行單價物化表）
CREATE TABLE IF NOT EXISTS bom.current_prices (
  product_id            uuid NOT NULL REFERENCES bom.products(id),
  scope_key             text NOT NULL,
  weighted_avg_price    numeric NOT NULL,
  based_on_purchase_ids uuid[] NOT NULL,
  calculated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, scope_key)
);

ALTER TABLE bom.current_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "current_prices_select" ON bom.current_prices;
CREATE POLICY "current_prices_select" ON bom.current_prices
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_bom());

-- price_change_log
CREATE TABLE IF NOT EXISTS bom.price_change_log (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               timestamptz NOT NULL DEFAULT now(),
  product_id               uuid NOT NULL REFERENCES bom.products(id),
  scope_key                text NOT NULL,
  old_price                numeric,
  new_price                numeric NOT NULL,
  change_pct               numeric,
  change_reason            text NOT NULL CHECK (change_reason IN ('purchase', 'manual_override', 'merge', 'recalc')),
  triggered_by_purchase_id uuid REFERENCES bom.purchase_records(id),
  triggered_by_user        uuid REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE bom.price_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_change_log_select" ON bom.price_change_log;
CREATE POLICY "price_change_log_select" ON bom.price_change_log
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_bom());

-- ============================================================
-- Ported from BOM M06: semi_products.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS bom.semi_products (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted            boolean NOT NULL DEFAULT false,
  deleted_at            timestamptz,
  deleted_by            uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delete_reason         text,

  name                  text NOT NULL,
  standard_output_qty   numeric NOT NULL,
  standard_output_unit  text NOT NULL,
  current_version_id    uuid
);

DROP TRIGGER IF EXISTS trg_semi_products_updated_at ON bom.semi_products;
CREATE TRIGGER trg_semi_products_updated_at
  BEFORE UPDATE ON bom.semi_products
  FOR EACH ROW EXECUTE FUNCTION bom.fn_set_updated_at();

CREATE TABLE IF NOT EXISTS bom.semi_product_versions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted        boolean NOT NULL DEFAULT false,
  deleted_at        timestamptz,
  deleted_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delete_reason     text,

  semi_product_id   uuid NOT NULL REFERENCES bom.semi_products(id),
  version_number    int NOT NULL,
  effective_from    timestamptz NOT NULL DEFAULT now(),
  bom_items         jsonb NOT NULL
    CHECK (
      jsonb_typeof(bom_items) = 'array'
      AND NOT (bom_items @? '$[*].semi_product_id')
    ),
  notes             text
);

DROP TRIGGER IF EXISTS trg_semi_product_versions_updated_at ON bom.semi_product_versions;
CREATE TRIGGER trg_semi_product_versions_updated_at
  BEFORE UPDATE ON bom.semi_product_versions
  FOR EACH ROW EXECUTE FUNCTION bom.fn_set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_semi_products_current_version'
      AND conrelid = 'bom.semi_products'::regclass
  ) THEN
    ALTER TABLE bom.semi_products
      ADD CONSTRAINT fk_semi_products_current_version
      FOREIGN KEY (current_version_id) REFERENCES bom.semi_product_versions(id);
  END IF;
END$$;

ALTER TABLE bom.semi_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "semi_products_select" ON bom.semi_products;
CREATE POLICY "semi_products_select" ON bom.semi_products
  FOR SELECT TO authenticated USING (public.current_user_can_access_bom());
DROP POLICY IF EXISTS "semi_products_insert" ON bom.semi_products;
CREATE POLICY "semi_products_insert" ON bom.semi_products
  FOR INSERT TO authenticated WITH CHECK (public.current_user_can_access_bom());
DROP POLICY IF EXISTS "semi_products_update" ON bom.semi_products;
CREATE POLICY "semi_products_update" ON bom.semi_products
  FOR UPDATE TO authenticated
  USING (public.current_user_can_access_bom())
  WITH CHECK (public.current_user_can_access_bom());

ALTER TABLE bom.semi_product_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "semi_product_versions_select" ON bom.semi_product_versions;
CREATE POLICY "semi_product_versions_select" ON bom.semi_product_versions
  FOR SELECT TO authenticated USING (public.current_user_can_access_bom());
DROP POLICY IF EXISTS "semi_product_versions_insert" ON bom.semi_product_versions;
CREATE POLICY "semi_product_versions_insert" ON bom.semi_product_versions
  FOR INSERT TO authenticated WITH CHECK (public.current_user_can_access_bom());
DROP POLICY IF EXISTS "semi_product_versions_update" ON bom.semi_product_versions;
CREATE POLICY "semi_product_versions_update" ON bom.semi_product_versions
  FOR UPDATE TO authenticated
  USING (public.current_user_can_access_bom())
  WITH CHECK (public.current_user_can_access_bom());

-- ============================================================
-- Ported from BOM M07: dishes.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS bom.takeout_pack_combos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted  boolean NOT NULL DEFAULT false,
  deleted_at  timestamptz,
  deleted_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delete_reason text,

  name  text NOT NULL,
  items jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array')
);

DROP TRIGGER IF EXISTS trg_takeout_pack_combos_updated_at ON bom.takeout_pack_combos;
CREATE TRIGGER trg_takeout_pack_combos_updated_at
  BEFORE UPDATE ON bom.takeout_pack_combos
  FOR EACH ROW EXECUTE FUNCTION bom.fn_set_updated_at();

-- 預設外帶組合
INSERT INTO bom.takeout_pack_combos (name, items)
SELECT '標準外帶組合', '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM bom.takeout_pack_combos WHERE name = '標準外帶組合');

-- dishes（餐點主檔）
-- 注意：原 BOM M07 有 baseline_tier 欄位，M10 又把它 drop 換成 cost_baseline_id。
-- 此處直接走 M10 後的最終 shape：不建 baseline_tier，直接建 cost_baseline_id（M10 後段才加，
-- 但 cost_baselines 表晚於 dishes 建立，所以這裡先不加 FK，等 cost_baselines 建好後再 ALTER）。
CREATE TABLE IF NOT EXISTS bom.dishes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted          boolean NOT NULL DEFAULT false,
  deleted_at          timestamptz,
  deleted_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delete_reason       text,

  name                text NOT NULL,
  category            text,
  service_mode        text NOT NULL CHECK (service_mode IN ('dine_in', 'takeout', 'both')),
  price               numeric,
  cost_baseline_id    uuid,
  current_version_id  uuid
);

DROP TRIGGER IF EXISTS trg_dishes_updated_at ON bom.dishes;
CREATE TRIGGER trg_dishes_updated_at
  BEFORE UPDATE ON bom.dishes
  FOR EACH ROW EXECUTE FUNCTION bom.fn_set_updated_at();

CREATE TABLE IF NOT EXISTS bom.dish_versions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  created_by              uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  updated_by              uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted              boolean NOT NULL DEFAULT false,
  deleted_at              timestamptz,
  deleted_by              uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delete_reason           text,

  dish_id                 uuid NOT NULL REFERENCES bom.dishes(id),
  version_number          int NOT NULL,
  effective_from          timestamptz NOT NULL DEFAULT now(),
  bom_items               jsonb NOT NULL CHECK (jsonb_typeof(bom_items) = 'array'),
  takeout_pack_combo_id   uuid REFERENCES bom.takeout_pack_combos(id),
  notes                   text
);

DROP TRIGGER IF EXISTS trg_dish_versions_updated_at ON bom.dish_versions;
CREATE TRIGGER trg_dish_versions_updated_at
  BEFORE UPDATE ON bom.dish_versions
  FOR EACH ROW EXECUTE FUNCTION bom.fn_set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_dishes_current_version'
      AND conrelid = 'bom.dishes'::regclass
  ) THEN
    ALTER TABLE bom.dishes
      ADD CONSTRAINT fk_dishes_current_version
      FOREIGN KEY (current_version_id) REFERENCES bom.dish_versions(id);
  END IF;
END$$;

ALTER TABLE bom.takeout_pack_combos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "takeout_pack_combos_select" ON bom.takeout_pack_combos;
CREATE POLICY "takeout_pack_combos_select" ON bom.takeout_pack_combos
  FOR SELECT TO authenticated USING (public.current_user_can_access_bom());
DROP POLICY IF EXISTS "takeout_pack_combos_insert" ON bom.takeout_pack_combos;
CREATE POLICY "takeout_pack_combos_insert" ON bom.takeout_pack_combos
  FOR INSERT TO authenticated WITH CHECK (public.current_user_can_access_bom());
DROP POLICY IF EXISTS "takeout_pack_combos_update" ON bom.takeout_pack_combos;
CREATE POLICY "takeout_pack_combos_update" ON bom.takeout_pack_combos
  FOR UPDATE TO authenticated
  USING (public.current_user_can_access_bom())
  WITH CHECK (public.current_user_can_access_bom());

ALTER TABLE bom.dishes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dishes_select" ON bom.dishes;
CREATE POLICY "dishes_select" ON bom.dishes
  FOR SELECT TO authenticated USING (public.current_user_can_access_bom());
DROP POLICY IF EXISTS "dishes_insert" ON bom.dishes;
CREATE POLICY "dishes_insert" ON bom.dishes
  FOR INSERT TO authenticated WITH CHECK (public.current_user_can_access_bom());
DROP POLICY IF EXISTS "dishes_update" ON bom.dishes;
CREATE POLICY "dishes_update" ON bom.dishes
  FOR UPDATE TO authenticated
  USING (public.current_user_can_access_bom())
  WITH CHECK (public.current_user_can_access_bom());

ALTER TABLE bom.dish_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dish_versions_select" ON bom.dish_versions;
CREATE POLICY "dish_versions_select" ON bom.dish_versions
  FOR SELECT TO authenticated USING (public.current_user_can_access_bom());
DROP POLICY IF EXISTS "dish_versions_insert" ON bom.dish_versions;
CREATE POLICY "dish_versions_insert" ON bom.dish_versions
  FOR INSERT TO authenticated WITH CHECK (public.current_user_can_access_bom());
DROP POLICY IF EXISTS "dish_versions_update" ON bom.dish_versions;
CREATE POLICY "dish_versions_update" ON bom.dish_versions
  FOR UPDATE TO authenticated
  USING (public.current_user_can_access_bom())
  WITH CHECK (public.current_user_can_access_bom());

-- ============================================================
-- Ported from BOM M08: cost_engine.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS bom.cost_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  dish_id             uuid NOT NULL REFERENCES bom.dishes(id),
  dish_version_id     uuid NOT NULL REFERENCES bom.dish_versions(id),
  store_id            uuid NOT NULL REFERENCES public.stores(id),
  dine_in_cost        numeric,
  takeout_cost        numeric,
  dine_in_rate        numeric,
  takeout_rate        numeric,
  based_on_prices     jsonb,
  calculated_at       timestamptz NOT NULL DEFAULT now(),
  is_locked           boolean NOT NULL DEFAULT false,
  locked_by_report_id uuid
);

ALTER TABLE bom.cost_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cost_snapshots_select" ON bom.cost_snapshots;
CREATE POLICY "cost_snapshots_select" ON bom.cost_snapshots
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_bom());

-- fn_get_scope_key：根據 product 的 purchase_type 和 store 決定 scope_key
CREATE OR REPLACE FUNCTION bom.fn_get_scope_key(p_product_id uuid, p_store_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE
AS $fn$
DECLARE
  v_purchase_type text;
  v_region text;
BEGIN
  SELECT purchase_type INTO v_purchase_type FROM bom.products WHERE id = p_product_id;
  SELECT region INTO v_region FROM public.stores WHERE id = p_store_id;

  CASE v_purchase_type
    WHEN 'collective' THEN RETURN 'global';
    WHEN 'regional' THEN RETURN 'region:' || v_region;
    WHEN 'individual' THEN RETURN 'store:' || p_store_id::text;
    WHEN 'temporary' THEN RETURN 'store:' || p_store_id::text;
    ELSE RETURN 'global';
  END CASE;
END;
$fn$;

-- fn_calc_dish_cost：成本計算主函式
CREATE OR REPLACE FUNCTION bom.fn_calc_dish_cost(p_dish_id uuid, p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_dish record;
  v_bom_item jsonb;
  v_total_cost numeric := 0;
  v_takeout_pack_cost numeric := 0;
  v_dine_in_cost numeric;
  v_takeout_cost numeric;
  v_dine_in_rate numeric;
  v_takeout_rate numeric;
  v_price numeric;
  v_scope_key text;
  v_based_on jsonb := '[]'::jsonb;
  v_semi record;
  v_semi_item jsonb;
  v_semi_total_cost numeric;
  v_semi_unit_cost numeric;
  v_combo record;
  v_combo_item jsonb;
  v_existing_locked boolean;
BEGIN
  SELECT d.*, dv.bom_items, dv.takeout_pack_combo_id, dv.id as ver_id
  INTO v_dish
  FROM bom.dishes d
  JOIN bom.dish_versions dv ON dv.id = d.current_version_id
  WHERE d.id = p_dish_id AND d.current_version_id IS NOT NULL;

  IF v_dish IS NULL THEN RETURN; END IF;

  SELECT is_locked INTO v_existing_locked
  FROM bom.cost_snapshots
  WHERE dish_id = p_dish_id AND store_id = p_store_id
  ORDER BY calculated_at DESC LIMIT 1;

  IF v_existing_locked = true THEN RETURN; END IF;

  FOR v_bom_item IN SELECT * FROM jsonb_array_elements(v_dish.bom_items)
  LOOP
    IF v_bom_item->>'type' = 'product' THEN
      v_scope_key := bom.fn_get_scope_key((v_bom_item->>'ref_id')::uuid, p_store_id);
      SELECT weighted_avg_price INTO v_price
      FROM bom.current_prices
      WHERE product_id = (v_bom_item->>'ref_id')::uuid AND scope_key = v_scope_key;

      IF v_price IS NOT NULL THEN
        v_total_cost := v_total_cost + (v_bom_item->>'quantity')::numeric * v_price;
        v_based_on := v_based_on || jsonb_build_array(jsonb_build_object(
          'product_id', v_bom_item->>'ref_id', 'scope_key', v_scope_key, 'price_used', v_price
        ));
      END IF;

    ELSIF v_bom_item->>'type' = 'semi' THEN
      SELECT sp.*, spv.bom_items as semi_bom
      INTO v_semi
      FROM bom.semi_products sp
      JOIN bom.semi_product_versions spv ON spv.id = sp.current_version_id
      WHERE sp.id = (v_bom_item->>'ref_id')::uuid AND sp.current_version_id IS NOT NULL;

      IF v_semi IS NOT NULL THEN
        v_semi_total_cost := 0;
        FOR v_semi_item IN SELECT * FROM jsonb_array_elements(v_semi.semi_bom)
        LOOP
          v_scope_key := bom.fn_get_scope_key((v_semi_item->>'product_id')::uuid, p_store_id);
          SELECT weighted_avg_price INTO v_price
          FROM bom.current_prices
          WHERE product_id = (v_semi_item->>'product_id')::uuid AND scope_key = v_scope_key;

          IF v_price IS NOT NULL THEN
            v_semi_total_cost := v_semi_total_cost + (v_semi_item->>'quantity')::numeric * v_price;
            v_based_on := v_based_on || jsonb_build_array(jsonb_build_object(
              'product_id', v_semi_item->>'product_id', 'scope_key', v_scope_key, 'price_used', v_price
            ));
          END IF;
        END LOOP;

        IF v_semi.standard_output_qty > 0 THEN
          v_semi_unit_cost := v_semi_total_cost / v_semi.standard_output_qty;
        ELSE
          v_semi_unit_cost := 0;
        END IF;

        v_total_cost := v_total_cost + (v_bom_item->>'quantity')::numeric * v_semi_unit_cost;
      END IF;
    END IF;
  END LOOP;

  v_dine_in_cost := ROUND(v_total_cost, 2);

  IF v_dish.takeout_pack_combo_id IS NOT NULL THEN
    SELECT * INTO v_combo FROM bom.takeout_pack_combos WHERE id = v_dish.takeout_pack_combo_id;
    IF v_combo IS NOT NULL AND jsonb_typeof(v_combo.items) = 'array' THEN
      FOR v_combo_item IN SELECT * FROM jsonb_array_elements(v_combo.items)
      LOOP
        v_scope_key := bom.fn_get_scope_key((v_combo_item->>'product_id')::uuid, p_store_id);
        SELECT weighted_avg_price INTO v_price
        FROM bom.current_prices
        WHERE product_id = (v_combo_item->>'product_id')::uuid AND scope_key = v_scope_key;

        IF v_price IS NOT NULL THEN
          v_takeout_pack_cost := v_takeout_pack_cost + (v_combo_item->>'quantity')::numeric * v_price;
        END IF;
      END LOOP;
    END IF;
  END IF;

  v_takeout_cost := ROUND(v_dine_in_cost + v_takeout_pack_cost, 2);

  IF v_dish.price IS NOT NULL AND v_dish.price > 0 THEN
    v_dine_in_rate := ROUND(v_dine_in_cost / v_dish.price, 4);
    v_takeout_rate := ROUND(v_takeout_cost / v_dish.price, 4);
  END IF;

  INSERT INTO bom.cost_snapshots (
    dish_id, dish_version_id, store_id,
    dine_in_cost, takeout_cost, dine_in_rate, takeout_rate,
    based_on_prices, calculated_at
  ) VALUES (
    p_dish_id, v_dish.ver_id, p_store_id,
    v_dine_in_cost, v_takeout_cost, v_dine_in_rate, v_takeout_rate,
    v_based_on, now()
  );
END;
$fn$;

-- fn_trigger_recalc_costs_for_product
CREATE OR REPLACE FUNCTION bom.fn_trigger_recalc_costs_for_product(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_dish_id uuid;
  v_store record;
BEGIN
  FOR v_dish_id IN
    SELECT DISTINCT d.id
    FROM bom.dishes d
    JOIN bom.dish_versions dv ON dv.id = d.current_version_id
    WHERE dv.bom_items @> jsonb_build_array(jsonb_build_object('type', 'product'))
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(dv.bom_items) elem
        WHERE elem->>'type' = 'product' AND elem->>'ref_id' = p_product_id::text
      )
  LOOP
    FOR v_store IN SELECT id FROM public.stores WHERE is_deleted = false
    LOOP
      PERFORM bom.fn_calc_dish_cost(v_dish_id, v_store.id);
    END LOOP;
  END LOOP;

  FOR v_dish_id IN
    SELECT DISTINCT d.id
    FROM bom.dishes d
    JOIN bom.dish_versions dv ON dv.id = d.current_version_id
    WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements(dv.bom_items) elem
      WHERE elem->>'type' = 'semi'
        AND EXISTS (
          SELECT 1 FROM bom.semi_products sp
          JOIN bom.semi_product_versions spv ON spv.id = sp.current_version_id
          WHERE sp.id = (elem->>'ref_id')::uuid
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(spv.bom_items) si
              WHERE si->>'product_id' = p_product_id::text
            )
        )
    )
  LOOP
    FOR v_store IN SELECT id FROM public.stores WHERE is_deleted = false
    LOOP
      PERFORM bom.fn_calc_dish_cost(v_dish_id, v_store.id);
    END LOOP;
  END LOOP;
END;
$fn$;

-- ============================================================
-- Ported from BOM M09: import_errors.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS bom.import_errors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  import_batch_id uuid NOT NULL,
  sheet_name      text,
  row_number      int,
  error_message   text NOT NULL,
  raw_data        jsonb
);

ALTER TABLE bom.import_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_errors_select" ON bom.import_errors;
CREATE POLICY "import_errors_select" ON bom.import_errors
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_bom());

DROP POLICY IF EXISTS "import_errors_insert" ON bom.import_errors;
CREATE POLICY "import_errors_insert" ON bom.import_errors
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_can_access_bom());

-- ============================================================
-- Ported from BOM M10 + M13: cost_baselines + softdelete select fix
-- ============================================================

CREATE TABLE IF NOT EXISTS bom.cost_baselines (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted         boolean NOT NULL DEFAULT false,
  deleted_at         timestamptz,
  deleted_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delete_reason      text,

  name               text NOT NULL,
  category           text,
  target_cost_rate   numeric NOT NULL CHECK (target_cost_rate >= 0 AND target_cost_rate <= 1),
  warning_cost_rate  numeric NOT NULL CHECK (warning_cost_rate >= 0 AND warning_cost_rate <= 1),
  scope_key          text NOT NULL DEFAULT 'global',
  notes              text,

  CHECK (warning_cost_rate >= target_cost_rate)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_baselines_name_active
  ON bom.cost_baselines (name)
  WHERE is_deleted = false;

DROP TRIGGER IF EXISTS trg_cost_baselines_updated_at ON bom.cost_baselines;
CREATE TRIGGER trg_cost_baselines_updated_at
  BEFORE UPDATE ON bom.cost_baselines
  FOR EACH ROW EXECUTE FUNCTION bom.fn_set_updated_at();

ALTER TABLE bom.cost_baselines ENABLE ROW LEVEL SECURITY;

-- SELECT (M13 final form)：所有人可讀未刪 + manager/owner 可讀已刪
DROP POLICY IF EXISTS "cost_baselines_select" ON bom.cost_baselines;
CREATE POLICY "cost_baselines_select" ON bom.cost_baselines
  FOR SELECT TO authenticated
  USING (
    public.current_user_can_access_bom()
    AND (
      is_deleted = false
      OR public.current_user_role() IN ('manager', 'owner')
    )
  );

DROP POLICY IF EXISTS "cost_baselines_insert" ON bom.cost_baselines;
CREATE POLICY "cost_baselines_insert" ON bom.cost_baselines
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('manager', 'owner')
    AND public.current_user_can_access_bom()
  );

DROP POLICY IF EXISTS "cost_baselines_update" ON bom.cost_baselines;
CREATE POLICY "cost_baselines_update" ON bom.cost_baselines
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('manager', 'owner')
    AND public.current_user_can_access_bom()
  )
  WITH CHECK (
    public.current_user_role() IN ('manager', 'owner')
    AND public.current_user_can_access_bom()
  );

-- 在 cost_baselines 建好之後補 dishes.cost_baseline_id FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_dishes_cost_baseline'
      AND conrelid = 'bom.dishes'::regclass
  ) THEN
    ALTER TABLE bom.dishes
      ADD CONSTRAINT fk_dishes_cost_baseline
      FOREIGN KEY (cost_baseline_id) REFERENCES bom.cost_baselines(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ============================================================
-- Ported from BOM M14: alerts_schema.sql
-- ============================================================

-- pg_net 在 Phase 5 才需要；這裡保留 schema 但 pg_net extension 延後（M14 原本 idempotent 啟用，這裡略過）
-- 註：如果未來要在 BOM port 之後就跑 immediate dispatch trigger，需先啟用 pg_net。Phase 5 處理。

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'alert_type' AND n.nspname = 'bom') THEN
    CREATE TYPE bom.alert_type AS ENUM ('variance', 'absolute');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'alert_severity' AND n.nspname = 'bom') THEN
    CREATE TYPE bom.alert_severity AS ENUM ('immediate', 'weekly_digest');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'alert_status' AND n.nspname = 'bom') THEN
    CREATE TYPE bom.alert_status AS ENUM ('open', 'acknowledged', 'resolved');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS bom.alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_deleted        boolean NOT NULL DEFAULT false,
  deleted_at        timestamptz,
  deleted_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delete_reason     text,

  alert_type        bom.alert_type NOT NULL,
  severity          bom.alert_severity NOT NULL,
  product_id        uuid REFERENCES bom.products(id),
  dish_id           uuid REFERENCES bom.dishes(id),
  store_id          uuid REFERENCES public.stores(id),
  trigger_value     numeric NOT NULL,
  threshold_value   numeric NOT NULL,
  baseline_snapshot jsonb,
  context_data      jsonb,
  status            bom.alert_status NOT NULL DEFAULT 'open',
  email_sent_at     timestamptz
);

DROP TRIGGER IF EXISTS trg_alerts_updated_at ON bom.alerts;
CREATE TRIGGER trg_alerts_updated_at
  BEFORE UPDATE ON bom.alerts
  FOR EACH ROW EXECUTE FUNCTION bom.fn_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_alerts_immediate_unsent
  ON bom.alerts (severity, email_sent_at)
  WHERE email_sent_at IS NULL AND severity = 'immediate' AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_alerts_severity_created
  ON bom.alerts (severity, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_alerts_product_created
  ON bom.alerts (product_id, created_at DESC)
  WHERE is_deleted = false AND product_id IS NOT NULL;

ALTER TABLE bom.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_select_owner_manager" ON bom.alerts;
CREATE POLICY "alerts_select_owner_manager" ON bom.alerts
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager')
    AND public.current_user_can_access_bom()
  );

DROP POLICY IF EXISTS "alerts_insert_denied" ON bom.alerts;
CREATE POLICY "alerts_insert_denied" ON bom.alerts
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "alerts_update_owner_manager" ON bom.alerts;
CREATE POLICY "alerts_update_owner_manager" ON bom.alerts
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager')
    AND public.current_user_can_access_bom()
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager')
    AND public.current_user_can_access_bom()
  );

-- ============================================================
-- Ported from BOM M15 + M16: fn_recalc_current_price 終版
--   - variance 偵測（M15）
--   - ROUND 精度 4 位小數（M16 BUG-001 fix）
-- ============================================================

CREATE OR REPLACE FUNCTION bom.fn_recalc_current_price(
  p_product_id uuid,
  p_scope_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_n_value         int;
  v_new_price       numeric;
  v_old_price       numeric;
  v_purchase_ids    uuid[];
  v_change_pct      numeric;

  v_variance_pct    numeric;
  v_threshold       numeric;
  v_severity        bom.alert_severity;
  v_product_name    text;
  v_store_id        uuid;
  v_store_name      text;
  v_context         jsonb;
BEGIN
  SELECT (value::text)::int INTO v_n_value
  FROM bom.system_config WHERE key = 'n_value';
  IF v_n_value IS NULL THEN v_n_value := 3; END IF;

  SELECT weighted_avg_price INTO v_old_price
  FROM bom.current_prices
  WHERE product_id = p_product_id AND scope_key = p_scope_key;

  WITH recent_purchases AS (
    SELECT pr.id, pr.quantity, pr.unit_price
    FROM bom.purchase_records pr
    JOIN bom.products p ON p.id = pr.product_id
    LEFT JOIN public.stores s ON s.id = pr.store_id
    WHERE pr.product_id = p_product_id
      AND pr.is_temporary = false
      AND pr.is_deleted = false
      AND (
        (p_scope_key = 'global')
        OR (p_scope_key = 'region:' || s.region)
        OR (p_scope_key = 'store:' || pr.store_id::text)
      )
    ORDER BY pr.purchase_date DESC, pr.created_at DESC
    LIMIT v_n_value
  )
  SELECT
    CASE WHEN SUM(quantity) > 0
      THEN ROUND(SUM(quantity * unit_price) / SUM(quantity), 4)  -- M16: 2 → 4 位
      ELSE NULL
    END,
    array_agg(id)
  INTO v_new_price, v_purchase_ids
  FROM recent_purchases;

  IF v_new_price IS NULL THEN RETURN; END IF;

  INSERT INTO bom.current_prices (product_id, scope_key, weighted_avg_price, based_on_purchase_ids, calculated_at)
  VALUES (p_product_id, p_scope_key, v_new_price, v_purchase_ids, now())
  ON CONFLICT (product_id, scope_key) DO UPDATE SET
    weighted_avg_price = v_new_price,
    based_on_purchase_ids = v_purchase_ids,
    calculated_at = now();

  IF v_old_price IS DISTINCT FROM v_new_price THEN
    v_change_pct := CASE
      WHEN v_old_price IS NOT NULL AND v_old_price > 0
      THEN ROUND((v_new_price - v_old_price) / v_old_price * 100, 4)  -- M16: 2 → 4 位
      ELSE NULL
    END;

    INSERT INTO bom.price_change_log (product_id, scope_key, old_price, new_price, change_pct, change_reason)
    VALUES (p_product_id, p_scope_key, v_old_price, v_new_price, v_change_pct, 'purchase');
  END IF;

  -- ==========================================================
  -- 變動率警報偵測（M15）
  -- ==========================================================
  IF v_old_price IS NOT NULL AND v_old_price > 0 AND v_new_price > v_old_price THEN
    v_variance_pct := (v_new_price - v_old_price) / v_old_price;

    SELECT (value::text)::numeric INTO v_threshold
    FROM bom.system_config WHERE key = 'variance_threshold';
    IF v_threshold IS NULL THEN v_threshold := 0.15; END IF;

    v_severity := CASE
      WHEN v_variance_pct >= v_threshold THEN 'immediate'::bom.alert_severity
      WHEN v_variance_pct >= 0.01        THEN 'weekly_digest'::bom.alert_severity
      ELSE NULL
    END;

    IF v_severity IS NOT NULL THEN
      SELECT name INTO v_product_name FROM bom.products WHERE id = p_product_id;

      IF v_purchase_ids IS NOT NULL AND array_length(v_purchase_ids, 1) > 0 THEN
        SELECT pr.store_id, s.name
          INTO v_store_id, v_store_name
        FROM bom.purchase_records pr
        LEFT JOIN public.stores s ON s.id = pr.store_id
        WHERE pr.id = v_purchase_ids[1];
      END IF;

      v_context := jsonb_build_object(
        'product_name',          v_product_name,
        'store_name',            v_store_name,
        'scope_key',             p_scope_key,
        'old_price',             v_old_price,
        'new_price',             v_new_price,
        'triggered_at_taipei',   to_char(now() AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD"T"HH24:MI:SSOF')
      );

      INSERT INTO bom.alerts (
        alert_type,
        severity,
        product_id,
        store_id,
        trigger_value,
        threshold_value,
        context_data,
        status,
        created_by
      ) VALUES (
        'variance',
        v_severity,
        p_product_id,
        v_store_id,
        ROUND(v_variance_pct, 4),
        CASE WHEN v_severity = 'immediate' THEN v_threshold ELSE 0.01 END,
        v_context,
        'open',
        auth.uid()
      );
    END IF;
  END IF;

  -- M08: 價格變動時觸發成本重算
  IF v_old_price IS DISTINCT FROM v_new_price THEN
    PERFORM bom.fn_trigger_recalc_costs_for_product(p_product_id);
  END IF;
END;
$$;

-- AFTER INSERT/UPDATE trigger on bom.purchase_records (from M05)
CREATE OR REPLACE FUNCTION bom.fn_trigger_recalc_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchase_type text;
  v_region text;
  v_scope_key text;
BEGIN
  SELECT purchase_type INTO v_purchase_type
  FROM bom.products WHERE id = NEW.product_id;

  SELECT region INTO v_region
  FROM public.stores WHERE id = NEW.store_id;

  CASE v_purchase_type
    WHEN 'collective' THEN
      v_scope_key := 'global';
    WHEN 'regional' THEN
      v_scope_key := 'region:' || v_region;
    WHEN 'individual' THEN
      v_scope_key := 'store:' || NEW.store_id::text;
    WHEN 'temporary' THEN
      v_scope_key := 'store:' || NEW.store_id::text;
    ELSE
      v_scope_key := 'global';
  END CASE;

  PERFORM bom.fn_recalc_current_price(NEW.product_id, v_scope_key);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_price_on_purchase ON bom.purchase_records;
CREATE TRIGGER trg_recalc_price_on_purchase
  AFTER INSERT OR UPDATE ON bom.purchase_records
  FOR EACH ROW EXECUTE FUNCTION bom.fn_trigger_recalc_price();

-- alerts immediate dispatch trigger function（保留 INSERT 行為，pg_net 部分 Phase 5 補回）
CREATE OR REPLACE FUNCTION bom.fn_alerts_immediate_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Phase 5: dispatch via pg_net to Edge Function send-alert
  --   原 BOM M15 在此呼叫 net.http_post 並從 vault 讀 SUPABASE_URL / SERVICE_ROLE_KEY。
  --   現階段只保留 trigger 殼，HTTP dispatch 留待 Phase 5 BOM Infra 一併補回。
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_alerts_immediate_send ON bom.alerts;
CREATE TRIGGER tg_alerts_immediate_send
  AFTER INSERT ON bom.alerts
  FOR EACH ROW
  WHEN (NEW.severity = 'immediate')
  EXECUTE FUNCTION bom.fn_alerts_immediate_dispatch();

-- ============================================================
-- Ported from BOM M17: dish_cost_autocalc_trigger.sql
-- ============================================================

CREATE OR REPLACE FUNCTION bom.fn_trigger_recalc_costs_on_dish_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store record;
  v_should_run boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_should_run := (NEW.current_version_id IS NOT NULL);
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_run := (
      NEW.current_version_id IS NOT NULL
      AND NEW.current_version_id IS DISTINCT FROM OLD.current_version_id
    );
  END IF;

  IF NOT v_should_run THEN
    RETURN NEW;
  END IF;

  FOR v_store IN
    SELECT id FROM public.stores WHERE is_deleted = false
  LOOP
    BEGIN
      PERFORM bom.fn_calc_dish_cost(NEW.id, v_store.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'fn_trigger_recalc_costs_on_dish_version failed for dish=% store=%: %',
        NEW.id, v_store.id, SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_dish_version_recalc ON bom.dishes;
CREATE TRIGGER tg_dish_version_recalc
  AFTER INSERT OR UPDATE ON bom.dishes
  FOR EACH ROW
  EXECUTE FUNCTION bom.fn_trigger_recalc_costs_on_dish_version();

-- ============================================================
-- Ported from BOM M18: monthly_close_lock.sql
--   pg_cron 排程 → Phase 5
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'monthly_lock_status' AND n.nspname = 'bom') THEN
    CREATE TYPE bom.monthly_lock_status AS ENUM ('locked', 'unlocked');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'monthly_lock_event_type' AND n.nspname = 'bom') THEN
    -- 含 M20 後加的 system_restore
    CREATE TYPE bom.monthly_lock_event_type AS ENUM ('lock', 'unlock', 'lock_noop', 'auto_lock', 'system_restore');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS bom.monthly_locks (
  year                int NOT NULL CHECK (year BETWEEN 2024 AND 2099),
  month               int NOT NULL CHECK (month BETWEEN 1 AND 12),
  status              bom.monthly_lock_status NOT NULL DEFAULT 'locked',
  locked_at           timestamptz NOT NULL DEFAULT now(),
  locked_by           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  last_unlocked_at    timestamptz,
  last_unlocked_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  last_unlock_reason  text,
  PRIMARY KEY (year, month)
);

ALTER TABLE bom.monthly_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_locks_select_authenticated" ON bom.monthly_locks;
CREATE POLICY "monthly_locks_select_authenticated" ON bom.monthly_locks
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_bom());

CREATE TABLE IF NOT EXISTS bom.monthly_lock_audit (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   bom.monthly_lock_event_type NOT NULL,
  year         int NOT NULL,
  month        int NOT NULL,
  actor_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason       text,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monthly_lock_audit_period
  ON bom.monthly_lock_audit (year DESC, month DESC, created_at DESC);

ALTER TABLE bom.monthly_lock_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_lock_audit_select_authenticated" ON bom.monthly_lock_audit;
CREATE POLICY "monthly_lock_audit_select_authenticated" ON bom.monthly_lock_audit
  FOR SELECT TO authenticated
  USING (public.current_user_can_access_bom());

INSERT INTO bom.system_config (key, value) VALUES ('monthly_lock_auto_day', '5')
  ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION bom.fn_is_month_locked(p_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, bom
AS $$
DECLARE
  v_status bom.monthly_lock_status;
BEGIN
  IF p_date IS NULL THEN
    RETURN false;
  END IF;
  SELECT status INTO v_status
  FROM bom.monthly_locks
  WHERE year = EXTRACT(YEAR FROM p_date)::int
    AND month = EXTRACT(MONTH FROM p_date)::int;
  RETURN COALESCE(v_status = 'locked', false);
END;
$$;

CREATE OR REPLACE FUNCTION bom.fn_is_month_locked(p_ts timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, bom
AS $$
  SELECT bom.fn_is_month_locked((p_ts AT TIME ZONE 'Asia/Taipei')::date);
$$;

-- 共用 trigger function
CREATE OR REPLACE FUNCTION bom.trg_fn_check_monthly_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_bypass        text;
  v_col_name      text := TG_ARGV[0];
  v_col_type      text := TG_ARGV[1];
  v_new_date      date;
  v_old_date      date;
  v_target_date   date;
  v_target_year   int;
  v_target_month  int;
BEGIN
  BEGIN
    v_bypass := current_setting('spectra.bypass_lock', true);
  EXCEPTION WHEN OTHERS THEN
    v_bypass := NULL;
  END;
  IF v_bypass = 'true' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF v_col_type = 'date' THEN
      v_new_date := (to_jsonb(NEW) ->> v_col_name)::date;
    ELSE
      v_new_date := ((to_jsonb(NEW) ->> v_col_name)::timestamptz AT TIME ZONE 'Asia/Taipei')::date;
    END IF;
    IF v_new_date IS NOT NULL AND bom.fn_is_month_locked(v_new_date) THEN
      v_target_date := v_new_date;
    END IF;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') AND v_target_date IS NULL THEN
    IF v_col_type = 'date' THEN
      v_old_date := (to_jsonb(OLD) ->> v_col_name)::date;
    ELSE
      v_old_date := ((to_jsonb(OLD) ->> v_col_name)::timestamptz AT TIME ZONE 'Asia/Taipei')::date;
    END IF;
    IF v_old_date IS NOT NULL AND bom.fn_is_month_locked(v_old_date) THEN
      v_target_date := v_old_date;
    END IF;
  END IF;

  IF v_target_date IS NOT NULL THEN
    v_target_year := EXTRACT(YEAR FROM v_target_date)::int;
    v_target_month := EXTRACT(MONTH FROM v_target_date)::int;
    RAISE EXCEPTION '%-% 已封存，無法新增/修改/刪除此筆紀錄。請聯絡老闆解鎖。',
      v_target_year, lpad(v_target_month::text, 2, '0')
      USING ERRCODE = 'P0001',
            HINT = format('違反月結鎖（monthly_close_lock）。表：%s 欄位：%s', TG_TABLE_NAME, v_col_name);
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- 套用 trigger 到 4 張表
DROP TRIGGER IF EXISTS trg_check_monthly_lock_purchase_records ON bom.purchase_records;
CREATE TRIGGER trg_check_monthly_lock_purchase_records
  BEFORE INSERT OR UPDATE OR DELETE ON bom.purchase_records
  FOR EACH ROW EXECUTE FUNCTION bom.trg_fn_check_monthly_lock('purchase_date', 'date');

DROP TRIGGER IF EXISTS trg_check_monthly_lock_cost_snapshots ON bom.cost_snapshots;
CREATE TRIGGER trg_check_monthly_lock_cost_snapshots
  BEFORE INSERT OR UPDATE OR DELETE ON bom.cost_snapshots
  FOR EACH ROW EXECUTE FUNCTION bom.trg_fn_check_monthly_lock('calculated_at', 'timestamptz');

DROP TRIGGER IF EXISTS trg_check_monthly_lock_price_change_log ON bom.price_change_log;
CREATE TRIGGER trg_check_monthly_lock_price_change_log
  BEFORE INSERT OR UPDATE OR DELETE ON bom.price_change_log
  FOR EACH ROW EXECUTE FUNCTION bom.trg_fn_check_monthly_lock('created_at', 'timestamptz');

DROP TRIGGER IF EXISTS trg_check_monthly_lock_alerts ON bom.alerts;
CREATE TRIGGER trg_check_monthly_lock_alerts
  BEFORE INSERT OR UPDATE OR DELETE ON bom.alerts
  FOR EACH ROW EXECUTE FUNCTION bom.trg_fn_check_monthly_lock('created_at', 'timestamptz');

-- fn_send_monthly_lock_notification — pg_net dispatch stub
CREATE OR REPLACE FUNCTION bom.fn_send_monthly_lock_notification(
  p_action       text,
  p_year         int,
  p_month        int,
  p_actor_email  text,
  p_reason       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, bom
AS $$
BEGIN
  -- Phase 5: dispatch via pg_net to Edge Function send-alert
  --   原 BOM M18 在此從 vault.decrypted_secrets 讀 SUPABASE_URL / SERVICE_ROLE_KEY 並呼叫 net.http_post。
  --   現階段保留函式殼，HTTP dispatch 留待 Phase 5 BOM Infra。
  RAISE NOTICE 'fn_send_monthly_lock_notification stub: action=%, year=%, month=%, actor=%, reason=%',
    p_action, p_year, p_month, p_actor_email, p_reason;
END;
$$;

-- fn_lock_month
CREATE OR REPLACE FUNCTION bom.fn_lock_month(p_year int, p_month int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, bom
AS $$
DECLARE
  v_role         text;
  v_actor        uuid;
  v_actor_email  text;
  v_existing     bom.monthly_lock_status;
BEGIN
  v_role := public.current_user_role()::text;
  v_actor := auth.uid();

  IF v_role IS NULL OR v_role <> 'owner' THEN
    RAISE EXCEPTION '只有老闆（owner）可以鎖定月份'
      USING ERRCODE = '42501';
  END IF;

  IF p_year < 2024 OR p_year > 2099 OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION '無效的年月參數: %-%', p_year, p_month
      USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('spectra.bypass_lock', 'true', true);

  SELECT status INTO v_existing
  FROM bom.monthly_locks
  WHERE year = p_year AND month = p_month;

  IF v_existing = 'locked' THEN
    INSERT INTO bom.monthly_lock_audit (event_type, year, month, actor_id, reason)
    VALUES ('lock_noop', p_year, p_month, v_actor, 'already locked');
    RETURN;
  END IF;

  INSERT INTO bom.monthly_locks (year, month, status, locked_at, locked_by)
  VALUES (p_year, p_month, 'locked', now(), v_actor)
  ON CONFLICT (year, month) DO UPDATE SET
    status = 'locked',
    locked_at = now(),
    locked_by = v_actor;

  INSERT INTO bom.monthly_lock_audit (event_type, year, month, actor_id)
  VALUES ('lock', p_year, p_month, v_actor);

  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;

  PERFORM bom.fn_send_monthly_lock_notification('locked', p_year, p_month, v_actor_email, NULL);
END;
$$;

-- fn_unlock_month
CREATE OR REPLACE FUNCTION bom.fn_unlock_month(p_year int, p_month int, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, bom
AS $$
DECLARE
  v_role         text;
  v_actor        uuid;
  v_actor_email  text;
  v_existing     bom.monthly_lock_status;
  v_clean_reason text;
BEGIN
  v_role := public.current_user_role()::text;
  v_actor := auth.uid();

  IF v_role IS NULL OR v_role <> 'owner' THEN
    RAISE EXCEPTION '只有老闆（owner）可以解鎖月份'
      USING ERRCODE = '42501';
  END IF;

  v_clean_reason := trim(coalesce(p_reason, ''));
  IF length(v_clean_reason) = 0 THEN
    RAISE EXCEPTION '解鎖原因不可為空'
      USING ERRCODE = '22023';
  END IF;

  IF p_year < 2024 OR p_year > 2099 OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION '無效的年月參數: %-%', p_year, p_month
      USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('spectra.bypass_lock', 'true', true);

  SELECT status INTO v_existing
  FROM bom.monthly_locks
  WHERE year = p_year AND month = p_month;

  IF v_existing IS NULL OR v_existing = 'unlocked' THEN
    RAISE EXCEPTION '%-% 並未處於鎖定狀態，無需解鎖', p_year, lpad(p_month::text, 2, '0')
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO bom.monthly_lock_audit (event_type, year, month, actor_id, reason)
  VALUES ('unlock', p_year, p_month, v_actor, v_clean_reason);

  UPDATE bom.monthly_locks SET
    status              = 'unlocked',
    last_unlocked_at    = now(),
    last_unlocked_by    = v_actor,
    last_unlock_reason  = v_clean_reason
  WHERE year = p_year AND month = p_month;

  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;
  PERFORM bom.fn_send_monthly_lock_notification('unlocked', p_year, p_month, v_actor_email, v_clean_reason);
END;
$$;

-- fn_auto_lock_previous_month — cron 用
CREATE OR REPLACE FUNCTION bom.fn_auto_lock_previous_month()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, bom
AS $$
DECLARE
  v_taipei_now   date;
  v_target_date  date;
  v_target_year  int;
  v_target_month int;
  v_existing     bom.monthly_lock_status;
BEGIN
  v_taipei_now   := (now() AT TIME ZONE 'Asia/Taipei')::date;
  v_target_date  := (date_trunc('month', v_taipei_now) - interval '1 day')::date;
  v_target_year  := EXTRACT(YEAR FROM v_target_date)::int;
  v_target_month := EXTRACT(MONTH FROM v_target_date)::int;

  PERFORM set_config('spectra.bypass_lock', 'true', true);

  SELECT status INTO v_existing
  FROM bom.monthly_locks
  WHERE year = v_target_year AND month = v_target_month;

  IF v_existing = 'locked' THEN
    INSERT INTO bom.monthly_lock_audit (event_type, year, month, actor_id, reason)
    VALUES ('lock_noop', v_target_year, v_target_month, NULL, 'auto cron: already locked');
    RETURN;
  END IF;

  INSERT INTO bom.monthly_locks (year, month, status, locked_at, locked_by)
  VALUES (v_target_year, v_target_month, 'locked', now(), NULL)
  ON CONFLICT (year, month) DO UPDATE SET
    status = 'locked',
    locked_at = now(),
    locked_by = NULL;

  INSERT INTO bom.monthly_lock_audit (event_type, year, month, actor_id, reason)
  VALUES ('auto_lock', v_target_year, v_target_month, NULL, 'cron: monthly auto lock');

  PERFORM bom.fn_send_monthly_lock_notification('auto_locked', v_target_year, v_target_month, NULL, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION bom.fn_is_month_locked(date)         TO authenticated;
GRANT EXECUTE ON FUNCTION bom.fn_is_month_locked(timestamptz)  TO authenticated;
GRANT EXECUTE ON FUNCTION bom.fn_lock_month(int, int)          TO authenticated;
GRANT EXECUTE ON FUNCTION bom.fn_unlock_month(int, int, text)  TO authenticated;

-- Phase 5: cron.schedule('auto_lock_previous_month', '0 19 4 * *', ...)
--   原 BOM M18 在此排程每月 5 號 03:00 Asia/Taipei (= 4 號 19:00 UTC) 自動鎖上月。
--   現階段延後到 Phase 5 BOM Infra。

-- ============================================================
-- Ported from BOM M19: query_audit_log.sql
--   pg_cron purge 排程 → Phase 5
-- ============================================================

CREATE TABLE IF NOT EXISTS bom.query_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  user_id         uuid NOT NULL REFERENCES auth.users(id),   -- 設計上的 direct auth ref
  user_role       text NOT NULL,
  user_store_id   uuid,
  resource        text NOT NULL,
  action          text NOT NULL,
  params          jsonb
);

CREATE INDEX IF NOT EXISTS idx_query_audit_log_user_time
  ON bom.query_audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_query_audit_log_resource_time
  ON bom.query_audit_log (resource, created_at DESC);

ALTER TABLE bom.query_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "query_audit_log_insert_authenticated" ON bom.query_audit_log;
CREATE POLICY "query_audit_log_insert_authenticated" ON bom.query_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_can_access_bom());

DROP POLICY IF EXISTS "query_audit_log_select_owner_manager" ON bom.query_audit_log;
CREATE POLICY "query_audit_log_select_owner_manager" ON bom.query_audit_log
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager')
    AND public.current_user_can_access_bom()
  );

INSERT INTO bom.system_config (key, value) VALUES ('query_audit_retention_days', '365')
  ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION bom.fn_record_query_audit(
  p_resource text,
  p_action   text,
  p_params   jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, bom, auth
AS $$
DECLARE
  v_user_id   uuid;
  v_role      text;
  v_store_id  uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  v_role := COALESCE(public.current_user_role()::text, 'unknown');

  BEGIN
    v_store_id := public.current_user_store_id();
  EXCEPTION WHEN OTHERS THEN
    v_store_id := NULL;
  END;

  INSERT INTO bom.query_audit_log (user_id, user_role, user_store_id, resource, action, params)
  VALUES (v_user_id, v_role, v_store_id, p_resource, p_action, p_params);
END;
$$;

GRANT EXECUTE ON FUNCTION bom.fn_record_query_audit(text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION bom.fn_purge_query_audit_old()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, bom
AS $$
DECLARE
  v_deleted_count bigint;
BEGIN
  WITH deleted AS (
    DELETE FROM bom.query_audit_log
    WHERE created_at < now() - interval '365 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  RAISE NOTICE 'fn_purge_query_audit_old: deleted % rows older than 365 days', v_deleted_count;
END;
$$;

-- Phase 5: cron.schedule('query_audit_purge', '0 18 * * *', ...)
--   原 BOM M19 排程每日 02:00 Asia/Taipei (= 18:00 UTC) 清除超過 365 天舊資料。

-- ============================================================
-- Ported from BOM M20: triple_backup.sql
--   pg_cron 三個排程 + 所有 vault / pg_net 呼叫都 → Phase 5
-- ============================================================

-- 注意：原 M20 用 ALTER TYPE ADD VALUE 'system_restore'，
-- 此處 bom.monthly_lock_event_type 已在前面 enum 建立時直接含 'system_restore'，故略過。

CREATE TABLE IF NOT EXISTS bom.backup_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  triggered_by    text NOT NULL CHECK (triggered_by IN ('cron', 'manual', 'pre_restore')),
  target          text NOT NULL CHECK (target IN ('r2', 'gdrive')),
  status          text NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'purged')),
  object_key      text,
  size_bytes      bigint,
  error_message   text,
  actor_id        uuid REFERENCES auth.users(id),   -- 設計上的 direct auth ref
  metadata        jsonb
);

CREATE INDEX IF NOT EXISTS idx_backup_history_created ON bom.backup_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON bom.backup_history (status, created_at DESC);

ALTER TABLE bom.backup_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "backup_history_select_owner" ON bom.backup_history;
CREATE POLICY "backup_history_select_owner" ON bom.backup_history
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'owner'
    AND public.current_user_can_access_bom()
  );

INSERT INTO bom.system_config (key, value) VALUES
  ('backup_l2_retention_days',  '30'),
  ('backup_l3_retention_months', '12')
ON CONFLICT (key) DO NOTHING;

-- fn_trigger_backup — vault + pg_net 部分 → Phase 5
CREATE OR REPLACE FUNCTION bom.fn_trigger_backup(p_target text, p_triggered_by text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, bom
AS $$
DECLARE
  v_role         text;
  v_actor        uuid;
BEGIN
  IF p_target NOT IN ('r2', 'gdrive') THEN
    RAISE EXCEPTION 'invalid p_target: %', p_target USING ERRCODE = '22023';
  END IF;
  IF p_triggered_by NOT IN ('cron', 'manual', 'pre_restore') THEN
    RAISE EXCEPTION 'invalid p_triggered_by: %', p_triggered_by USING ERRCODE = '22023';
  END IF;

  v_actor := auth.uid();
  IF v_actor IS NOT NULL AND p_triggered_by = 'manual' THEN
    v_role := public.current_user_role()::text;
    IF v_role IS NULL OR v_role <> 'owner' THEN
      RAISE EXCEPTION '只有老闆（owner）可以手動觸發備份' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Phase 5: dispatch via pg_net to Edge Function backup-export
  --   原 BOM M20 在此從 vault.decrypted_secrets 讀 SUPABASE_URL / SERVICE_ROLE_KEY
  --   並 PERFORM net.http_post(...) 呼叫 /functions/v1/backup-export。
  --   現階段保留 owner 檢查與參數驗證，HTTP dispatch 留待 Phase 5。
  RAISE NOTICE 'fn_trigger_backup stub: target=%, triggered_by=%, actor=%',
    p_target, p_triggered_by, v_actor;

  RETURN gen_random_uuid();
END;
$$;

GRANT EXECUTE ON FUNCTION bom.fn_trigger_backup(text, text) TO authenticated;

-- fn_exec_restore_sql：Edge Function backup-restore 用
CREATE OR REPLACE FUNCTION bom.fn_exec_restore_sql(p_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, bom
AS $$
BEGIN
  EXECUTE p_sql;
END;
$$;

REVOKE EXECUTE ON FUNCTION bom.fn_exec_restore_sql(text) FROM PUBLIC;

-- fn_call_backup_purge：vault + pg_net 部分 → Phase 5
CREATE OR REPLACE FUNCTION bom.fn_call_backup_purge()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, bom
AS $$
BEGIN
  -- Phase 5: dispatch via pg_net to Edge Function backup-purge
  --   原 BOM M20 從 vault.decrypted_secrets 讀 SUPABASE_URL / SERVICE_ROLE_KEY 並呼叫
  --   /functions/v1/backup-purge。現階段保留函式殼，HTTP dispatch 留待 Phase 5。
  RAISE NOTICE 'fn_call_backup_purge stub';
END;
$$;

-- Phase 5: 三個 cron.schedule()
--   - backup_daily_r2:       '30 19 * * *'  → fn_trigger_backup('r2', 'cron')
--   - backup_monthly_gdrive: '0 20 1 * *'   → fn_trigger_backup('gdrive', 'cron')
--   - backup_purge_daily:    '0 4 * * *'    → fn_call_backup_purge()

-- ============================================================
-- 結束：BOM schema port 完成
-- ============================================================
