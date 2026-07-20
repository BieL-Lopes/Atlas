-- =============================================
-- Migration: CRM Funil + Audit Logs (LGPD)
-- Execute no SQL Editor do dashboard do Supabase
-- =============================================

-- ─────────────────────────────────────────────
-- 1. Coluna status_funil na tabela eleitores
-- ─────────────────────────────────────────────
ALTER TABLE public.eleitores
  ADD COLUMN IF NOT EXISTS status_funil TEXT NOT NULL DEFAULT 'contato'
    CONSTRAINT eleitores_status_funil_check
      CHECK (status_funil IN ('contato', 'interessado', 'simpatizante', 'apoiador', 'multiplicador'));

-- Índice para consultas por funil (relatórios e listagens segmentadas)
CREATE INDEX IF NOT EXISTS eleitores_status_funil_idx ON public.eleitores (status_funil);

-- ─────────────────────────────────────────────
-- 2. Tabela audit_logs — Trilha de Auditoria (LGPD)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name   TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL
    CONSTRAINT audit_action_check
      CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT', 'LOGIN')),
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  details     JSONB DEFAULT '{}',
  deputado_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_idx ON public.audit_logs (deputado_id);

-- Trigger: preenche deputado_id automaticamente
DROP TRIGGER IF EXISTS trigger_audit_logs_tenant ON public.audit_logs;
CREATE TRIGGER trigger_audit_logs_tenant
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas liderança e coordenador_geral podem ler os logs (compliance)
DROP POLICY IF EXISTS "audit_logs_select_gestores" ON public.audit_logs;
CREATE POLICY "audit_logs_select_gestores" ON public.audit_logs
  FOR SELECT USING (
    deputado_id = public.get_my_tenant_id() AND
    get_my_role() IN ('candidato', 'coordenador')
  );

-- Qualquer usuário autenticado pode inserir logs de suas próprias ações
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (
    deputado_id = public.get_my_tenant_id()
  );

-- Ninguém pode atualizar ou deletar logs (imutabilidade LGPD)
-- Sem políticas UPDATE/DELETE = negado por padrão com RLS ativado
