-- ==============================================================================
-- MIGRACIÓN 008: Revisión completa de la base de datos (metas + columnas)
-- ==============================================================================
-- Error que corrige:
--   "No se pudo subir 1 cambio: falta crear la tabla goals en Supabase"
-- Causa: la migración 004 (metas de ahorro) nunca se ejecutó. Este script crea
-- la tabla goals y además revisa que TODAS las tablas tengan todas las columnas
-- que usa la app, para no ir descubriendo faltantes de una en una.
-- Es SEGURO ejecutarlo varias veces: no borra ni modifica datos existentes.
--
-- Cómo ejecutarlo:
--   Supabase → tu proyecto → SQL Editor → New query → pegar todo → Run.
-- ==============================================================================

-- 1. Metas de ahorro ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    deadline TEXT,
    account_ids JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
CREATE POLICY "Users can manage their own goals"
ON public.goals FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Cuentas (assets): columnas que usa la app ------------------------------------
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS initial_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- 3. Movimientos (transactions) ---------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS asset_id TEXT,
  ADD COLUMN IF NOT EXISTS dest_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS destination TEXT,
  ADD COLUMN IF NOT EXISTS dest_currency TEXT,
  ADD COLUMN IF NOT EXISTS dest_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS category_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS rate_snapshot NUMERIC,
  ADD COLUMN IF NOT EXISTS usd_equivalent NUMERIC,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- 4. Deudas y cobros (obligations) ------------------------------------------------
ALTER TABLE public.obligations
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS category_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS due_date TEXT,
  ADD COLUMN IF NOT EXISTS frequency TEXT,
  ADD COLUMN IF NOT EXISTS total_installments INTEGER,
  ADD COLUMN IF NOT EXISTS paid_installments INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created TEXT,
  ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- 5. Presupuestos (budgets) -------------------------------------------------------
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS category_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- 6. Pedirle a la API de Supabase que relea las tablas --------------------------
NOTIFY pgrst, 'reload schema';

-- Comprobación: debe devolver 9 filas (todas las tablas de la app).
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('assets', 'transactions', 'obligations', 'budgets', 'goals',
                     'user_categories', 'shopping_lists', 'shopping_items', 'shopping_products')
ORDER BY table_name;
