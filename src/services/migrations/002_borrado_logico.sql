-- ==============================================================================
-- MIGRACIÓN 002: Borrado lógico (deleted_at) para sincronización bidireccional
-- ==============================================================================
-- Permite que los borrados en un dispositivo se propaguen a otros dispositivos
-- sin destruir el historial de sincronización ni causar conflictos de merge.

-- 1. TABLA ASSETS
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. TABLA TRANSACTIONS
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. TABLA OBLIGATIONS
ALTER TABLE public.obligations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 4. TABLA BUDGETS
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
