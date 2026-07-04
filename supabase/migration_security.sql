-- =============================================
-- Migration: Tabelas de Segurança
-- Execute no SQL Editor do dashboard do Supabase
-- =============================================

-- ─────────────────────────────────────────────
-- Tabela: rate_limits (Rate Limiting server-side)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limits_key_window_idx
  ON public.rate_limits (key, window_start);

-- Limpeza automática: remove entradas com mais de 1 hora
-- (executar via pg_cron ou manualmente)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

-- RLS: apenas service_role pode ler/escrever (Edge Functions)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_service_only" ON public.rate_limits;
CREATE POLICY "rate_limits_service_only" ON public.rate_limits
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- Tabela: revoked_tokens (Blocklist de JWT pós-logout)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.revoked_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS revoked_tokens_user_id_idx
  ON public.revoked_tokens (user_id);

-- Limpeza: tokens revogados com mais de 24h podem ser removidos
-- (JWT expira em ~1h no Supabase por padrão, 24h é margem segura)
CREATE OR REPLACE FUNCTION public.cleanup_revoked_tokens()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.revoked_tokens
  WHERE revoked_at < NOW() - INTERVAL '24 hours';
END;
$$;

ALTER TABLE public.revoked_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revoked_tokens_service_only" ON public.revoked_tokens;
CREATE POLICY "revoked_tokens_service_only" ON public.revoked_tokens
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Usuário autenticado pode inserir (para registrar seu próprio logout)
DROP POLICY IF EXISTS "revoked_tokens_insert_self" ON public.revoked_tokens;
CREATE POLICY "revoked_tokens_insert_self" ON public.revoked_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- Hardening: get_email_by_cpf (sanitização de input)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_email_by_cpf(cpf_input TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  clean_cpf TEXT;
  result_email TEXT;
BEGIN
  -- Sanitização: remove não-dígitos e valida comprimento
  clean_cpf := regexp_replace(cpf_input, '\D', '', 'g');
  
  -- CPF deve ter exatamente 11 dígitos
  IF length(clean_cpf) <> 11 THEN
    RETURN NULL;
  END IF;
  
  -- Rejeita CPFs com todos os dígitos iguais (ex: 00000000000)
  IF clean_cpf ~ '^(\d)\1{10}$' THEN
    RETURN NULL;
  END IF;

  SELECT u.email INTO result_email
  FROM public.perfis p
  JOIN auth.users u ON u.id = p.id
  WHERE p.cpf = clean_cpf
  LIMIT 1;

  RETURN result_email;
END;
$$;
