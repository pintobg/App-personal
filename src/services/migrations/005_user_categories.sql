-- ==============================================================================
-- MIGRACIÓN 005: Catálogo de Categorías y Subcategorías (user_categories)
-- ==============================================================================
-- 1. Crea la tabla public.user_categories con clave primaria (user_id, id),
--    RLS por user_id, deleted_at para borrado suave, updated_at.
--    Campos: id, kind, parent_id, name, icon, color, sort_order, is_active, is_custom, base_id.
-- 2. Agrega las columnas category_id y subcategory_id en transactions, budgets y obligations.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_categories (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL, -- 'expense' | 'income'
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

ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own categories" ON public.user_categories;
CREATE POLICY "Users can manage their own categories"
ON public.user_categories FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Agregar category_id y subcategory_id en transacciones, presupuestos y obligaciones
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category_id TEXT DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS subcategory_id TEXT DEFAULT NULL;

ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS category_id TEXT DEFAULT NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS subcategory_id TEXT DEFAULT NULL;

ALTER TABLE public.obligations ADD COLUMN IF NOT EXISTS category_id TEXT DEFAULT NULL;
ALTER TABLE public.obligations ADD COLUMN IF NOT EXISTS subcategory_id TEXT DEFAULT NULL;
