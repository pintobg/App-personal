-- ==============================================================================
-- MIGRACIÓN 003: Clave primaria compuesta (user_id, id), columnas de activo y saldo inicial
-- ==============================================================================
-- Esta migración cambia la clave primaria global (id) a clave primaria compuesta
-- (user_id, id) en las cuatro tablas. Esto previene que IDs coincidentes entre
-- usuarios distintos colisionen o sean bloqueados por Row Level Security (RLS).
-- Además agrega asset_id, dest_asset_id e initial_amount.

-- 1. TABLA ASSETS
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS initial_amount NUMERIC DEFAULT 0;

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_pkey;
ALTER TABLE public.assets ADD PRIMARY KEY (user_id, id);

-- 2. TABLA TRANSACTIONS
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS asset_id TEXT,
  ADD COLUMN IF NOT EXISTS dest_asset_id TEXT;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_pkey;
ALTER TABLE public.transactions ADD PRIMARY KEY (user_id, id);

-- 3. TABLA OBLIGATIONS
ALTER TABLE public.obligations DROP CONSTRAINT IF EXISTS obligations_pkey;
ALTER TABLE public.obligations ADD PRIMARY KEY (user_id, id);

-- 4. TABLA BUDGETS
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_pkey;
ALTER TABLE public.budgets ADD PRIMARY KEY (user_id, id);
