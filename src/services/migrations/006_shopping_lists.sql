-- ==============================================================================
-- MIGRACIÓN 006: LISTA DE COMPRAS, ÍTEMS Y CATÁLOGO DE PRODUCTOS
-- ==============================================================================

-- 1. TABLA: shopping_lists (Listas de Compras)
CREATE TABLE IF NOT EXISTS public.shopping_lists (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    store TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'done'
    currency TEXT NOT NULL DEFAULT 'USD',  -- 'USD' | 'VES'
    budget NUMERIC DEFAULT NULL,
    transaction_id TEXT DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

-- 2. TABLA: shopping_items (Artículos de una lista)
CREATE TABLE IF NOT EXISTS public.shopping_items (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    list_id TEXT NOT NULL,
    product_id TEXT DEFAULT NULL,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'und', -- 'und', 'kg', 'g', 'l', 'ml', 'paquete'
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

-- 3. TABLA: shopping_products (Catálogo de productos con historial)
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

-- HABILITACIÓN DE RLS
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_products ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS
DROP POLICY IF EXISTS "Users can manage their own shopping_lists" ON public.shopping_lists;
CREATE POLICY "Users can manage their own shopping_lists"
ON public.shopping_lists FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own shopping_items" ON public.shopping_items;
CREATE POLICY "Users can manage their own shopping_items"
ON public.shopping_items FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own shopping_products" ON public.shopping_products;
CREATE POLICY "Users can manage their own shopping_products"
ON public.shopping_products FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
