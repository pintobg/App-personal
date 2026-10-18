-- ==============================================================================
-- APP PERSONAL - FINANZAS: SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================
-- Este script crea las tablas necesarias y configura las políticas de seguridad
-- a nivel de fila (Row Level Security - RLS) para que cada usuario solo pueda
-- leer, insertar, modificar y eliminar sus propios datos.
-- ==============================================================================

-- 1. TABLA: ASSETS (Cuentas y Activos)
CREATE TABLE IF NOT EXISTS public.assets (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABLA: TRANSACTIONS (Movimientos e Historial)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    currency TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    origin TEXT,
    destination TEXT,
    category TEXT,
    subcategory TEXT,
    date TEXT NOT NULL,
    notes TEXT,
    commission NUMERIC DEFAULT 0,
    rate_snapshot NUMERIC,
    usd_equivalent NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA: OBLIGATIONS (Deudas y Cuentas por Cobrar)
CREATE TABLE IF NOT EXISTS public.obligations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    person TEXT NOT NULL,
    description TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL,
    due_date TEXT,
    frequency TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    date_created TEXT,
    payments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA: BUDGETS (Presupuestos Mensuales)
CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, category)
);

-- ==============================================================================
-- HABILITACIÓN DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

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
