-- ==============================================================================
-- APP PERSONAL - FINANZAS: SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================
-- Este script crea las tablas necesarias y configura las políticas de seguridad
-- a nivel de fila (Row Level Security - RLS) para que cada usuario solo pueda
-- leer, insertar, modificar y eliminar sus propios datos.
-- ==============================================================================

-- 1. TABLA: ASSETS (Cuentas y Activos)
CREATE TABLE IF NOT EXISTS public.assets (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    initial_amount NUMERIC DEFAULT 0,
    location TEXT NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

-- 2. TABLA: TRANSACTIONS (Movimientos e Historial)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id TEXT,
    dest_asset_id TEXT,
    type TEXT NOT NULL,
    currency TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    origin TEXT,
    destination TEXT,
    dest_currency TEXT,
    dest_amount NUMERIC,
    category TEXT,
    subcategory TEXT,
    category_id TEXT DEFAULT NULL,
    subcategory_id TEXT DEFAULT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    commission NUMERIC DEFAULT 0,
    parent_transfer_id TEXT,
    rate_snapshot NUMERIC,
    usd_equivalent NUMERIC,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

-- 3. TABLA: OBLIGATIONS (Deudas y Cuentas por Cobrar)
CREATE TABLE IF NOT EXISTS public.obligations (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    person TEXT NOT NULL,
    category TEXT,
    category_id TEXT DEFAULT NULL,
    subcategory_id TEXT DEFAULT NULL,
    description TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL,
    due_date TEXT,
    frequency TEXT,
    total_installments INTEGER,
    paid_installments INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    date_created TEXT,
    payments JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

-- 4. TABLA: BUDGETS (Presupuestos Mensuales)
CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    category_id TEXT DEFAULT NULL,
    subcategory_id TEXT DEFAULT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id),
    UNIQUE(user_id, category)
);

-- 5. TABLA: GOALS (Metas de Ahorro)
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

-- 6. TABLA: USER_CATEGORIES (Catálogo Personalizable de Categorías)
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

-- ==============================================================================
-- HABILITACIÓN DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: USER_CATEGORIES
DROP POLICY IF EXISTS "Users can manage their own categories" ON public.user_categories;
CREATE POLICY "Users can manage their own categories"
ON public.user_categories FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS: ASSETS
DROP POLICY IF EXISTS "Users can manage their own assets" ON public.assets;
CREATE POLICY "Users can manage their own assets"
ON public.assets FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS: TRANSACTIONS
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
CREATE POLICY "Users can manage their own transactions"
ON public.transactions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS: OBLIGATIONS
DROP POLICY IF EXISTS "Users can manage their own obligations" ON public.obligations;
CREATE POLICY "Users can manage their own obligations"
ON public.obligations FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS: BUDGETS
DROP POLICY IF EXISTS "Users can manage their own budgets" ON public.budgets;
CREATE POLICY "Users can manage their own budgets"
ON public.budgets FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS: GOALS
DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
CREATE POLICY "Users can manage their own goals"
ON public.goals FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7. TABLA: SHOPPING_LISTS (Listas de Compras)
CREATE TABLE IF NOT EXISTS public.shopping_lists (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    store TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    currency TEXT NOT NULL DEFAULT 'USD',
    budget NUMERIC DEFAULT NULL,
    transaction_id TEXT DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

-- 8. TABLA: SHOPPING_ITEMS (Artículos de la Lista de Compras)
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

-- 9. TABLA: SHOPPING_PRODUCTS (Catálogo de Productos para Autocompletado e Historial)
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

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_products ENABLE ROW LEVEL SECURITY;

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
