-- ==============================================================================
-- MIGRACIÓN 007: Reparar sincronización (listas de compras + categorías)
-- ==============================================================================
-- Error que corrige:
--   "No se pudieron subir N cambios: Could not find the table 'public.shopping_items'"
-- Causa: la app ya usa las tablas de Compras (migración 006), pero nunca se
-- crearon en Supabase. Este script es SEGURO de ejecutar varias veces: usa
-- IF NOT EXISTS / DROP POLICY IF EXISTS y no borra ningún dato.
--
-- Cómo ejecutarlo:
--   Supabase → tu proyecto → SQL Editor → New query → pegar todo → Run.
-- ==============================================================================

-- 1. Categorías del usuario (migración 005, por si no se corrió) -----------------
CREATE TABLE IF NOT EXISTS public.user_categories (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    parent_id TEXT DEFAULT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_custom BOOLEAN NOT NULL DEFAULT false,
    base_id TEXT DEFAULT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category_id TEXT DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS subcategory_id TEXT DEFAULT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS category_id TEXT DEFAULT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS subcategory_id TEXT DEFAULT NULL;
ALTER TABLE public.obligations ADD COLUMN IF NOT EXISTS category_id TEXT DEFAULT NULL;
ALTER TABLE public.obligations ADD COLUMN IF NOT EXISTS subcategory_id TEXT DEFAULT NULL;

-- 2. Listas de compras ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_lists (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    store TEXT,
    status TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'done'
    currency TEXT NOT NULL DEFAULT 'USD',    -- 'USD' | 'VES'
    budget NUMERIC DEFAULT NULL,
    transaction_id TEXT DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

-- 3. Artículos de cada lista ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_items (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    list_id TEXT NOT NULL,
    product_id TEXT DEFAULT NULL,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'und',
    estimated_price NUMERIC DEFAULT 0,
    price_currency TEXT NOT NULL DEFAULT 'USD',
    actual_price NUMERIC DEFAULT NULL,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    section TEXT DEFAULT 'otros',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS shopping_items_user_list_idx ON public.shopping_items (user_id, list_id);

-- 4. Catálogo de productos con historial de precios ----------------------------
CREATE TABLE IF NOT EXISTS public.shopping_products (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    default_unit TEXT NOT NULL DEFAULT 'und',
    section TEXT DEFAULT 'otros',
    last_price NUMERIC DEFAULT 0,
    last_price_currency TEXT NOT NULL DEFAULT 'USD',
    last_bought_at TIMESTAMPTZ DEFAULT NULL,
    price_history JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

-- 5. Seguridad por fila (RLS): cada usuario solo ve y edita lo suyo -------------
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own categories" ON public.user_categories;
CREATE POLICY "Users can manage their own categories"
ON public.user_categories FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own shopping_lists" ON public.shopping_lists;
CREATE POLICY "Users can manage their own shopping_lists"
ON public.shopping_lists FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own shopping_items" ON public.shopping_items;
CREATE POLICY "Users can manage their own shopping_items"
ON public.shopping_items FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own shopping_products" ON public.shopping_products;
CREATE POLICY "Users can manage their own shopping_products"
ON public.shopping_products FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Pedirle a la API de Supabase que relea las tablas (quita el error de "schema cache")
NOTIFY pgrst, 'reload schema';

-- Comprobación: debe devolver 4 filas.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_categories', 'shopping_lists', 'shopping_items', 'shopping_products')
ORDER BY table_name;
