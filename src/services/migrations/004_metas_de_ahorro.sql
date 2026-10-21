-- ==============================================================================
-- MIGRACIÓN 004: Metas de Ahorro (Tabla goals con RLS y clave compuesta)
-- ==============================================================================
-- Crea la tabla public.goals con clave compuesta (user_id, id),
-- columnas para meta de ahorro, fecha límite, cuentas asociadas en JSONB
-- y políticas de seguridad a nivel de fila (RLS).
-- ==============================================================================

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
ON public.goals FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
