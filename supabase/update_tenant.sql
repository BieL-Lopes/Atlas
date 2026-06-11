-- 1. Adicionar coluna deputado_id (tenant_id) nas tabelas que faltam
ALTER TABLE public.eleitores ADD COLUMN IF NOT EXISTS deputado_id TEXT;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS deputado_id TEXT;
ALTER TABLE public.enquetes ADD COLUMN IF NOT EXISTS deputado_id TEXT;
ALTER TABLE public.comunicados ADD COLUMN IF NOT EXISTS deputado_id TEXT;
ALTER TABLE public.disparos_whatsapp ADD COLUMN IF NOT EXISTS deputado_id TEXT;
ALTER TABLE public.agenda_itens ADD COLUMN IF NOT EXISTS deputado_id TEXT;
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS deputado_id TEXT;
ALTER TABLE public.evento_confirmacoes ADD COLUMN IF NOT EXISTS deputado_id TEXT;
ALTER TABLE public.enquete_votos ADD COLUMN IF NOT EXISTS deputado_id TEXT;

-- 2. (Opcional) Se você já tem dados, preencher com um ID de deputado padrão. 
-- Descomente a linha abaixo e coloque o ID do deputado principal se quiser preservar dados já inseridos
-- UPDATE public.eleitores SET deputado_id = 'ID_DO_DEPUTADO_AQUI' WHERE deputado_id IS NULL;

-- 3. Criar índices para performance nas buscas por Tenant
CREATE INDEX IF NOT EXISTS eleitores_tenant_idx    ON public.eleitores (deputado_id);
CREATE INDEX IF NOT EXISTS eventos_tenant_idx      ON public.eventos (deputado_id);
CREATE INDEX IF NOT EXISTS enquetes_tenant_idx     ON public.enquetes (deputado_id);
CREATE INDEX IF NOT EXISTS comunicados_tenant_idx  ON public.comunicados (deputado_id);
CREATE INDEX IF NOT EXISTS disparos_whatsapp_tenant_idx ON public.disparos_whatsapp (deputado_id);
CREATE INDEX IF NOT EXISTS agenda_tenant_idx       ON public.agenda_itens (deputado_id);
CREATE INDEX IF NOT EXISTS invites_tenant_idx      ON public.invites (deputado_id);
CREATE INDEX IF NOT EXISTS conf_tenant_idx         ON public.evento_confirmacoes (deputado_id);
CREATE INDEX IF NOT EXISTS votos_tenant_idx        ON public.enquete_votos (deputado_id);

-- 4. Criar Funções e Triggers Auxiliares
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT deputado_id FROM public.perfis WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.deputado_id IS NULL THEN
    NEW.deputado_id := public.get_my_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Aplica os triggers em todas as tabelas
DROP TRIGGER IF EXISTS trigger_eleitores_tenant ON public.eleitores;
CREATE TRIGGER trigger_eleitores_tenant BEFORE INSERT ON public.eleitores FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS trigger_agenda_tenant ON public.agenda_itens;
CREATE TRIGGER trigger_agenda_tenant BEFORE INSERT ON public.agenda_itens FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS trigger_eventos_tenant ON public.eventos;
CREATE TRIGGER trigger_eventos_tenant BEFORE INSERT ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS trigger_evento_confirmacoes_tenant ON public.evento_confirmacoes;
CREATE TRIGGER trigger_evento_confirmacoes_tenant BEFORE INSERT ON public.evento_confirmacoes FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS trigger_enquetes_tenant ON public.enquetes;
CREATE TRIGGER trigger_enquetes_tenant BEFORE INSERT ON public.enquetes FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS trigger_enquete_votos_tenant ON public.enquete_votos;
CREATE TRIGGER trigger_enquete_votos_tenant BEFORE INSERT ON public.enquete_votos FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS trigger_comunicados_tenant ON public.comunicados;
CREATE TRIGGER trigger_comunicados_tenant BEFORE INSERT ON public.comunicados FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS trigger_disparos_tenant ON public.disparos_whatsapp;
CREATE TRIGGER trigger_disparos_tenant BEFORE INSERT ON public.disparos_whatsapp FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS trigger_invites_tenant ON public.invites;
CREATE TRIGGER trigger_invites_tenant BEFORE INSERT ON public.invites FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Trigger especial para Invites: copia o deputado_id do invite pro usuário recém cadastrado
CREATE OR REPLACE FUNCTION public.handle_invite_used()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.usado = TRUE AND OLD.usado = FALSE AND NEW.usado_por IS NOT NULL AND NEW.deputado_id IS NOT NULL THEN
    UPDATE public.perfis 
    SET deputado_id = NEW.deputado_id
    WHERE id = NEW.usado_por;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_invite_used ON public.invites;
CREATE TRIGGER trigger_invite_used AFTER UPDATE OF usado_por ON public.invites FOR EACH ROW EXECUTE FUNCTION public.handle_invite_used();

-- Agora é preciso deletar as Policies antigas e aplicar o script todo de schema.sql para recriar as Policies.
-- Para simplificar, rodar todo o schema.sql substitui as políticas e resolve!
