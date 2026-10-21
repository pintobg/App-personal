-- ==============================================================================
-- MIGRACIÓN 001: Columnas faltantes para transferencias y cuotas de obligaciones
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase para permitir
-- la sincronización correcta de transferencias multimoneda y detalles de cuotas.

-- 1. COLUMNAS FALTANTES EN TRANSACTIONS
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS dest_currency TEXT,
  ADD COLUMN IF NOT EXISTS dest_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS parent_transfer_id TEXT;

-- 2. COLUMNAS FALTANTES EN OBLIGATIONS
ALTER TABLE public.obligations
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS total_installments INTEGER,
  ADD COLUMN IF NOT EXISTS paid_installments INTEGER DEFAULT 0;
