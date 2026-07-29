-- =============================================
-- Schema Atlas para Supabase (MULTI-TENANT)
-- Execute no SQL Editor do dashboard do Supabase
-- =============================================

-- ─────────────────────────────────────────────
-- Função: busca email pelo CPF (sem autenticação)
-- Permite login por CPF sem expor dados via RLS
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

-- ─────────────────────────────────────────────
-- Tabela de perfis (extensão de auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.perfis (
  id                       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome                     TEXT NOT NULL,
  email                    TEXT,
  cpf                      TEXT UNIQUE,
  role                     TEXT NOT NULL DEFAULT 'cabo_eleitoral'
    CONSTRAINT perfis_role_check
      CHECK (role IN ('candidato', 'coordenador', 'lideranca', 'colaborador', 'cabo_eleitoral')),
  regiao                   TEXT,
  deputado_id              TEXT,
  coordenador_regional_id  UUID REFERENCES public.perfis(id),
  indicado_por             UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  aceitou_termos           BOOLEAN NOT NULL DEFAULT FALSE,
  data_aceite_termos       TIMESTAMPTZ,
  data_nascimento          DATE,
  sexo                     TEXT,
  estado                   TEXT,
  municipio                TEXT,
  bairro                   TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.perfis.aceitou_termos IS 'LGPD: Registro de consentimento explícito do usuário aos Termos de Uso e Política de Privacidade';
COMMENT ON COLUMN public.perfis.data_aceite_termos IS 'LGPD: Timestamp exato (imutável) do momento em que o usuário aceitou os termos';

-- Funções auxiliares SECURITY DEFINER — bypassam RLS para checar role
-- sem causar recursão infinita nas policies
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.perfis WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT deputado_id FROM public.perfis WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_regiao()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT regiao FROM public.perfis WHERE id = auth.uid();
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

CREATE OR REPLACE FUNCTION public.is_coord_regional_of(captador_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis
    WHERE id = captador_id AND coordenador_regional_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────
-- Tabela de eleitores
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eleitores (
  id                 TEXT PRIMARY KEY,
  nome               TEXT NOT NULL,
  cpf                TEXT,
  whatsapp           TEXT,
  email              TEXT,
  titulo_eleitor     TEXT,
  data_nascimento    TEXT,
  bairro             TEXT,
  cidade             TEXT,
  nivel_voto         TEXT CONSTRAINT eleitores_nivel_voto_check
    CHECK (nivel_voto IN ('forte', 'medio', 'fraco', 'indeciso', 'oposicao')),
  nivel_engajamento  TEXT CONSTRAINT eleitores_nivel_engajamento_check
    CHECK (nivel_engajamento IN ('lideranca', 'cabo_eleitoral', 'eleitor_comum')),
  nichos             TEXT[]   NOT NULL DEFAULT '{}',
  gps_latitude       DOUBLE PRECISION,
  gps_longitude      DOUBLE PRECISION,
  aceita_whatsapp    BOOLEAN  NOT NULL DEFAULT TRUE,
  observacoes        TEXT     NOT NULL DEFAULT '',
  regiao             TEXT,
  atendimentos       JSONB    NOT NULL DEFAULT '[]',
  criado_por         UUID REFERENCES auth.users(id),
  criado_por_nome    TEXT,
  deputado_id        TEXT,
  data_cadastro      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS eleitores_criado_por   ON public.eleitores (criado_por);
CREATE INDEX IF NOT EXISTS eleitores_atualizado_em ON public.eleitores (atualizado_em);
CREATE INDEX IF NOT EXISTS eleitores_regiao        ON public.eleitores (regiao);
CREATE INDEX IF NOT EXISTS eleitores_tenant_idx    ON public.eleitores (deputado_id);

ALTER TABLE public.eleitores DROP CONSTRAINT IF EXISTS eleitores_cpf_unique;
ALTER TABLE public.eleitores DROP CONSTRAINT IF EXISTS eleitores_titulo_unique;

CREATE UNIQUE INDEX IF NOT EXISTS eleitores_cpf_unique ON public.eleitores (deputado_id, cpf) WHERE cpf IS NOT NULL AND cpf <> '';
CREATE UNIQUE INDEX IF NOT EXISTS eleitores_titulo_unique ON public.eleitores (deputado_id, titulo_eleitor) WHERE titulo_eleitor IS NOT NULL AND titulo_eleitor <> '';

DROP TRIGGER IF EXISTS trigger_eleitores_tenant ON public.eleitores;
CREATE TRIGGER trigger_eleitores_tenant
  BEFORE INSERT ON public.eleitores
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- ─────────────────────────────────────────────
-- Trigger: atualiza atualizado_em automaticamente
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_eleitores_atualizado_em ON public.eleitores;
CREATE TRIGGER trigger_eleitores_atualizado_em
  BEFORE UPDATE ON public.eleitores
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- =========================================
-- Trigger: atualiza nome do criador automaticamente
-- =========================================
CREATE OR REPLACE FUNCTION public.set_criado_por_nome()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.criado_por IS NOT NULL THEN
    NEW.criado_por_nome := (SELECT nome FROM public.perfis WHERE id = NEW.criado_por);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_criado_por_nome ON public.eleitores;
CREATE TRIGGER trigger_set_criado_por_nome
  BEFORE INSERT OR UPDATE OF criado_por ON public.eleitores
  FOR EACH ROW EXECUTE FUNCTION public.set_criado_por_nome();

-- ─────────────────────────────────────────────
-- Trigger: cria perfil automaticamente no sign-up
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, role, regiao, deputado_id, indicado_por, aceitou_termos, data_aceite_termos, data_nascimento, sexo, estado, municipio, bairro)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cabo_eleitoral'),
    NEW.raw_user_meta_data->>'regiao',
    NEW.raw_user_meta_data->>'deputado_id',
    (NEW.raw_user_meta_data->>'indicado_por')::UUID,
    COALESCE((NEW.raw_user_meta_data->>'aceitou_termos')::boolean, false),
    CASE
      WHEN NEW.raw_user_meta_data->>'data_aceite_termos' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'data_aceite_termos')::timestamptz
      ELSE NULL
    END,
    CASE
      WHEN NEW.raw_user_meta_data->>'data_nascimento' IS NOT NULL AND NEW.raw_user_meta_data->>'data_nascimento' != ''
      THEN (NEW.raw_user_meta_data->>'data_nascimento')::DATE
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'sexo',
    NEW.raw_user_meta_data->>'estado',
    NEW.raw_user_meta_data->>'municipio',
    NEW.raw_user_meta_data->>'bairro'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────────────

ALTER TABLE public.perfis    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleitores ENABLE ROW LEVEL SECURITY;

-- ── Políticas de perfis ──
DROP POLICY IF EXISTS "perfis_select_proprio"      ON public.perfis;
DROP POLICY IF EXISTS "perfis_update_proprio"      ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert_proprio"      ON public.perfis;
DROP POLICY IF EXISTS "perfis_select_gestores"     ON public.perfis;
DROP POLICY IF EXISTS "perfis_select_equipe_coord" ON public.perfis;

CREATE POLICY "perfis_select_proprio"  ON public.perfis FOR SELECT USING (auth.uid() = id);
CREATE POLICY "perfis_update_proprio"  ON public.perfis FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "perfis_insert_proprio"  ON public.perfis FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "perfis_select_gestores" ON public.perfis FOR SELECT USING (
  deputado_id = public.get_my_tenant_id() AND
  get_my_role() IN ('candidato', 'coordenador')
);

CREATE POLICY "perfis_select_equipe_coord" ON public.perfis FOR SELECT USING (
  deputado_id = public.get_my_tenant_id() AND
  coordenador_regional_id = auth.uid()
);

-- ── Políticas de eleitores ──
DROP POLICY IF EXISTS "eleitores_select_proprio"        ON public.eleitores;
DROP POLICY IF EXISTS "eleitores_select_gestores"       ON public.eleitores;
DROP POLICY IF EXISTS "eleitores_select_coord_regional" ON public.eleitores;
DROP POLICY IF EXISTS "eleitores_insert"                ON public.eleitores;
DROP POLICY IF EXISTS "eleitores_update"                ON public.eleitores;
DROP POLICY IF EXISTS "eleitores_delete"                ON public.eleitores;

CREATE POLICY "eleitores_select_proprio" ON public.eleitores FOR SELECT USING (
  deputado_id = public.get_my_tenant_id() AND criado_por = auth.uid()
);

CREATE POLICY "eleitores_select_gestores" ON public.eleitores FOR SELECT USING (
  deputado_id = public.get_my_tenant_id() AND
  get_my_role() IN ('candidato', 'coordenador')
);

CREATE POLICY "eleitores_select_coord_regional" ON public.eleitores FOR SELECT USING (
  deputado_id = public.get_my_tenant_id()
  AND public.get_my_role() = 'coordenador'
  AND regiao = public.get_my_regiao()
);

DROP POLICY IF EXISTS "eleitores_select_regiao_lideranca" ON public.eleitores;
CREATE POLICY "eleitores_select_regiao_lideranca" ON public.eleitores FOR SELECT USING (
  deputado_id = public.get_my_tenant_id()
  AND public.get_my_role() = 'lideranca'
  AND regiao = public.get_my_regiao()
);

CREATE POLICY "eleitores_insert" ON public.eleitores FOR INSERT WITH CHECK (
  deputado_id = public.get_my_tenant_id() AND criado_por = auth.uid()
);

CREATE POLICY "eleitores_update" ON public.eleitores FOR UPDATE
  USING (
    deputado_id = public.get_my_tenant_id() AND (
      criado_por = auth.uid()
      OR (get_my_role() = 'candidato')
      OR (get_my_role() IN ('coordenador', 'lideranca') AND regiao = public.get_my_regiao())
    )
  )
  WITH CHECK (
    deputado_id = public.get_my_tenant_id() AND (
      criado_por = auth.uid()
      OR (get_my_role() = 'candidato')
      OR (get_my_role() IN ('coordenador', 'lideranca') AND regiao = public.get_my_regiao())
    )
  );

CREATE POLICY "eleitores_delete" ON public.eleitores FOR DELETE USING (
  deputado_id = public.get_my_tenant_id() AND (
    criado_por = auth.uid()
    OR (get_my_role() = 'candidato')
    OR (get_my_role() IN ('coordenador', 'lideranca') AND regiao = public.get_my_regiao())
  )
);

-- ─────────────────────────────────────────────
-- Tabela: agenda_itens (agenda pessoal por usuário)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agenda_itens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT NOT NULL,
  local        TEXT NOT NULL DEFAULT '',
  data         DATE NOT NULL,
  horario      TEXT NOT NULL DEFAULT '',
  tipo         TEXT NOT NULL DEFAULT 'reuniao'
    CHECK (tipo IN ('reuniao', 'visita')),
  eleitor_nome TEXT,
  criado_por   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  deputado_id  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agenda_tenant_idx ON public.agenda_itens (deputado_id);

DROP TRIGGER IF EXISTS trigger_agenda_tenant ON public.agenda_itens;
CREATE TRIGGER trigger_agenda_tenant
  BEFORE INSERT ON public.agenda_itens
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER TABLE public.agenda_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_crud_proprio" ON public.agenda_itens;
CREATE POLICY "agenda_crud_proprio" ON public.agenda_itens
  USING (deputado_id = public.get_my_tenant_id() AND criado_por = auth.uid())
  WITH CHECK (deputado_id = public.get_my_tenant_id() AND criado_por = auth.uid());

-- ─────────────────────────────────────────────
-- Tabela: eventos (eventos públicos para eleitores)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eventos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo     TEXT NOT NULL,
  data       DATE NOT NULL,
  horario    TEXT NOT NULL DEFAULT '',
  local      TEXT NOT NULL DEFAULT '',
  criado_por UUID REFERENCES auth.users(id),
  deputado_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS eventos_tenant_idx ON public.eventos (deputado_id);

DROP TRIGGER IF EXISTS trigger_eventos_tenant ON public.eventos;
CREATE TRIGGER trigger_eventos_tenant
  BEFORE INSERT ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_select_all"      ON public.eventos;
DROP POLICY IF EXISTS "eventos_insert_gestores" ON public.eventos;
DROP POLICY IF EXISTS "eventos_delete_gestores" ON public.eventos;

CREATE POLICY "eventos_select_all"      ON public.eventos FOR SELECT
  USING (deputado_id = public.get_my_tenant_id() AND auth.role() = 'authenticated');
CREATE POLICY "eventos_insert_gestores" ON public.eventos FOR INSERT
  WITH CHECK (deputado_id = public.get_my_tenant_id() AND get_my_role() IN ('candidato', 'coordenador', 'lideranca'));
CREATE POLICY "eventos_delete_gestores" ON public.eventos FOR DELETE
  USING (deputado_id = public.get_my_tenant_id() AND (get_my_role() IN ('candidato', 'coordenador') OR criado_por = auth.uid()));

-- ─────────────────────────────────────────────
-- Tabela: evento_confirmacoes (presença em eventos)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evento_confirmacoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id  UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  eleitor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deputado_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (evento_id, eleitor_id)
);

CREATE INDEX IF NOT EXISTS conf_tenant_idx ON public.evento_confirmacoes (deputado_id);

DROP TRIGGER IF EXISTS trigger_evento_confirmacoes_tenant ON public.evento_confirmacoes;
CREATE TRIGGER trigger_evento_confirmacoes_tenant
  BEFORE INSERT ON public.evento_confirmacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER TABLE public.evento_confirmacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "confirmacoes_select_proprio"  ON public.evento_confirmacoes;
DROP POLICY IF EXISTS "confirmacoes_insert_proprio"  ON public.evento_confirmacoes;
DROP POLICY IF EXISTS "confirmacoes_delete_proprio"  ON public.evento_confirmacoes;
DROP POLICY IF EXISTS "confirmacoes_select_gestores" ON public.evento_confirmacoes;

CREATE POLICY "confirmacoes_select_proprio"  ON public.evento_confirmacoes FOR SELECT
  USING (deputado_id = public.get_my_tenant_id() AND eleitor_id = auth.uid());
CREATE POLICY "confirmacoes_select_gestores" ON public.evento_confirmacoes FOR SELECT
  USING (deputado_id = public.get_my_tenant_id() AND get_my_role() IN ('candidato', 'coordenador', 'lideranca'));
CREATE POLICY "confirmacoes_insert_proprio"  ON public.evento_confirmacoes FOR INSERT
  WITH CHECK (deputado_id = public.get_my_tenant_id() AND eleitor_id = auth.uid());
CREATE POLICY "confirmacoes_delete_proprio"  ON public.evento_confirmacoes FOR DELETE
  USING (deputado_id = public.get_my_tenant_id() AND eleitor_id = auth.uid());

-- ─────────────────────────────────────────────
-- Tabela: enquetes (pesquisas de opinião)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enquetes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo     TEXT NOT NULL,
  opcoes     TEXT[] NOT NULL DEFAULT '{}',
  status     TEXT NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'encerrada')),
  criado_por UUID REFERENCES auth.users(id),
  deputado_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS enquetes_tenant_idx ON public.enquetes (deputado_id);

DROP TRIGGER IF EXISTS trigger_enquetes_tenant ON public.enquetes;
CREATE TRIGGER trigger_enquetes_tenant
  BEFORE INSERT ON public.enquetes
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER TABLE public.enquetes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enquetes_select_all"     ON public.enquetes;
DROP POLICY IF EXISTS "enquetes_insert_gestores" ON public.enquetes;
DROP POLICY IF EXISTS "enquetes_update_gestores" ON public.enquetes;

CREATE POLICY "enquetes_select_all"      ON public.enquetes FOR SELECT
  USING (deputado_id = public.get_my_tenant_id() AND auth.role() = 'authenticated');
CREATE POLICY "enquetes_insert_gestores" ON public.enquetes FOR INSERT
  WITH CHECK (deputado_id = public.get_my_tenant_id() AND get_my_role() IN ('candidato', 'coordenador'));
CREATE POLICY "enquetes_update_gestores" ON public.enquetes FOR UPDATE
  USING (deputado_id = public.get_my_tenant_id() AND get_my_role() IN ('candidato', 'coordenador'));

-- ─────────────────────────────────────────────
-- Tabela: enquete_votos (votos por eleitor)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enquete_votos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquete_id      UUID NOT NULL REFERENCES public.enquetes(id) ON DELETE CASCADE,
  eleitor_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opcao_escolhida TEXT NOT NULL,
  deputado_id     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enquete_id, eleitor_id)
);

CREATE INDEX IF NOT EXISTS votos_tenant_idx ON public.enquete_votos (deputado_id);

DROP TRIGGER IF EXISTS trigger_enquete_votos_tenant ON public.enquete_votos;
CREATE TRIGGER trigger_enquete_votos_tenant
  BEFORE INSERT ON public.enquete_votos
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER TABLE public.enquete_votos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "votos_select_proprio"  ON public.enquete_votos;
DROP POLICY IF EXISTS "votos_insert_proprio"  ON public.enquete_votos;
DROP POLICY IF EXISTS "votos_select_gestores" ON public.enquete_votos;

CREATE POLICY "votos_select_proprio"  ON public.enquete_votos FOR SELECT
  USING (deputado_id = public.get_my_tenant_id() AND eleitor_id = auth.uid());
CREATE POLICY "votos_select_gestores" ON public.enquete_votos FOR SELECT
  USING (deputado_id = public.get_my_tenant_id() AND get_my_role() IN ('candidato', 'coordenador'));
CREATE POLICY "votos_insert_proprio"  ON public.enquete_votos FOR INSERT
  WITH CHECK (deputado_id = public.get_my_tenant_id() AND eleitor_id = auth.uid());

-- ─────────────────────────────────────────────
-- Tabela: comunicados (mensagens da liderança/coord_geral para os demais)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comunicados (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo         TEXT NOT NULL,
  mensagem       TEXT NOT NULL,
  remetente_id   UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  remetente_nome TEXT NOT NULL DEFAULT '',
  destino_roles  TEXT[] NOT NULL DEFAULT '{}',
  deputado_id    TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comunicados_tenant_idx ON public.comunicados (deputado_id);

DROP TRIGGER IF EXISTS trigger_comunicados_tenant ON public.comunicados;
CREATE TRIGGER trigger_comunicados_tenant
  BEFORE INSERT ON public.comunicados
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comunicados_select" ON public.comunicados;
DROP POLICY IF EXISTS "comunicados_insert" ON public.comunicados;

-- Lê se: é o remetente, ou sua role está na lista de destino, ou destino contém 'todos'
CREATE POLICY "comunicados_select" ON public.comunicados FOR SELECT USING (
  deputado_id = public.get_my_tenant_id() AND (
    remetente_id = auth.uid()
    OR get_my_role() = ANY(destino_roles)
    OR 'todos' = ANY(destino_roles)
  )
);

-- Só liderança e coordenador_geral podem enviar
CREATE POLICY "comunicados_insert" ON public.comunicados FOR INSERT
  WITH CHECK (deputado_id = public.get_my_tenant_id() AND get_my_role() IN ('candidato', 'coordenador'));

-- Habilitar Realtime para esta tabela (necessário para atualizações em tempo real no app)
ALTER TABLE public.comunicados REPLICA IDENTITY FULL;
-- PUBLICATION supabase_realtime is managed via Supabase dashboard generally, safe to leave.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela: push_subscriptions (assinaturas Web Push por usuário)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  user_id   UUID PRIMARY KEY REFERENCES public.perfis(id) ON DELETE CASCADE,
  endpoint  TEXT NOT NULL,
  p256dh    TEXT NOT NULL,
  auth      TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_sub_self" ON public.push_subscriptions;
CREATE POLICY "push_sub_self" ON public.push_subscriptions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role pode ler todas as assinaturas (necessário para a Edge Function)
DROP POLICY IF EXISTS "push_sub_service" ON public.push_subscriptions;
CREATE POLICY "push_sub_service" ON public.push_subscriptions
  FOR SELECT USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela: disparos_whatsapp (log de disparos em massa via WhatsApp)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disparos_whatsapp (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem             TEXT NOT NULL,
  template_tipo        TEXT NOT NULL DEFAULT 'livre'
    CONSTRAINT disparo_template_check
      CHECK (template_tipo IN ('livre', 'evento', 'mobilizacao', 'confirmacao')),
  filtros              JSONB NOT NULL DEFAULT '{}',
  total_destinatarios  INTEGER NOT NULL DEFAULT 0,
  total_enviados       INTEGER NOT NULL DEFAULT 0,
  total_falhas         INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'pendente'
    CONSTRAINT disparo_status_check
      CHECK (status IN ('pendente', 'enviando', 'concluido', 'erro')),
  remetente_id         UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  remetente_nome       TEXT NOT NULL DEFAULT '',
  deputado_id          TEXT,
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS disparos_whatsapp_criado_em_idx ON public.disparos_whatsapp (criado_em DESC);
CREATE INDEX IF NOT EXISTS disparos_whatsapp_remetente_idx ON public.disparos_whatsapp (remetente_id);
CREATE INDEX IF NOT EXISTS disparos_whatsapp_tenant_idx ON public.disparos_whatsapp (deputado_id);

DROP TRIGGER IF EXISTS trigger_disparos_tenant ON public.disparos_whatsapp;
CREATE TRIGGER trigger_disparos_tenant
  BEFORE INSERT ON public.disparos_whatsapp
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER TABLE public.disparos_whatsapp ENABLE ROW LEVEL SECURITY;

-- Liderança e Coord. Geral podem ver e criar disparos
DROP POLICY IF EXISTS "disparo_read" ON public.disparos_whatsapp;
CREATE POLICY "disparo_read" ON public.disparos_whatsapp
  FOR SELECT USING (
    deputado_id = public.get_my_tenant_id() AND EXISTS (
      SELECT 1 FROM public.perfis
      WHERE id = auth.uid()
        AND role IN ('candidato', 'coordenador')
    )
  );

DROP POLICY IF EXISTS "disparo_insert" ON public.disparos_whatsapp;
CREATE POLICY "disparo_insert" ON public.disparos_whatsapp
  FOR INSERT WITH CHECK (
    deputado_id = public.get_my_tenant_id() AND EXISTS (
      SELECT 1 FROM public.perfis
      WHERE id = auth.uid()
        AND role IN ('candidato', 'coordenador')
    )
  );

-- Service role pode atualizar status e contadores (Edge Function)
DROP POLICY IF EXISTS "disparo_service_update" ON public.disparos_whatsapp;
CREATE POLICY "disparo_service_update" ON public.disparos_whatsapp
  FOR UPDATE USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- Tabela de Convites para Onboarding Seguro
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_unica           TEXT NOT NULL UNIQUE CHECK (length(chave_unica) = 6),
  role                  TEXT NOT NULL
    CONSTRAINT invites_role_check
      CHECK (role IN ('candidato', 'coordenador', 'lideranca', 'colaborador', 'cabo_eleitoral')),
  codigo_regiao         TEXT,
  usado                 BOOLEAN NOT NULL DEFAULT FALSE,
  usado_por             UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  usado_em              TIMESTAMPTZ,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por            UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  deputado_id           TEXT
);

CREATE INDEX IF NOT EXISTS invites_chave_unica_idx ON public.invites (chave_unica);
CREATE INDEX IF NOT EXISTS invites_usado_idx ON public.invites (usado);
CREATE INDEX IF NOT EXISTS invites_tenant_idx ON public.invites (deputado_id);

DROP TRIGGER IF EXISTS trigger_invites_tenant ON public.invites;
CREATE TRIGGER trigger_invites_tenant
  BEFORE INSERT ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Trigger: Quando um convite for marcado como usado, copia o tenant (deputado_id) para o novo perfil
CREATE OR REPLACE FUNCTION public.handle_invite_used()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.usado = TRUE AND OLD.usado = FALSE AND NEW.usado_por IS NOT NULL THEN
    UPDATE public.perfis
    SET
      deputado_id = COALESCE(NEW.deputado_id, deputado_id),
      regiao = COALESCE(NEW.codigo_regiao, regiao)
    WHERE id = NEW.usado_por;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_invite_used ON public.invites;
CREATE TRIGGER trigger_invite_used
  AFTER UPDATE OF usado_por ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.handle_invite_used();

-- Público pode ler invites não usadas (apenas para validar)
DROP POLICY IF EXISTS "invite_read_public" ON public.invites;
CREATE POLICY "invite_read_public" ON public.invites
  FOR SELECT USING (NOT usado);

-- Liderança e coordenadores gerais podem criar convites
DROP POLICY IF EXISTS "invite_insert_gestores" ON public.invites;
CREATE POLICY "invite_insert_gestores" ON public.invites
  FOR INSERT WITH CHECK (
    deputado_id = public.get_my_tenant_id() AND EXISTS (
      SELECT 1 FROM public.perfis
      WHERE id = auth.uid() AND role IN ('candidato', 'coordenador')
    )
  );

-- Service role pode criar/atualizar (Edge Function ou seed)
DROP POLICY IF EXISTS "invite_insert_service" ON public.invites;
CREATE POLICY "invite_insert_service" ON public.invites
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "invite_update_service" ON public.invites;
CREATE POLICY "invite_update_service" ON public.invites
  FOR UPDATE USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- Gamificação: Retorna stats e ranking dos captadores (Ignorando RLS do captador)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_gamification_stats(p_tenant_id TEXT)
RETURNS TABLE (
  captador_id UUID,
  captador_nome TEXT,
  total_cadastros BIGINT,
  streak INT,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      e.criado_por as id,
      MAX(p.nome) as nome,
      COUNT(e.id) as total_cadastros
    FROM public.eleitores e
    JOIN public.perfis p ON e.criado_por = p.id
    WHERE e.deputado_id = p_tenant_id AND p.role = 'colaborador'
    GROUP BY e.criado_por
  ),
  ranked_stats AS (
    SELECT 
      us.id,
      us.nome,
      us.total_cadastros,
      RANK() OVER (ORDER BY us.total_cadastros DESC) as rank
    FROM user_stats us
  ),
  daily_activity AS (
    SELECT 
      criado_por as id,
      (data_cadastro AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date as active_date
    FROM public.eleitores
    WHERE deputado_id = p_tenant_id
    GROUP BY criado_por, active_date
  ),
  streak_groups AS (
    SELECT 
      id,
      active_date,
      active_date - (DENSE_RANK() OVER (PARTITION BY id ORDER BY active_date))::int as grp
    FROM daily_activity
  ),
  streaks AS (
    SELECT 
      id,
      COUNT(*) as current_streak
    FROM streak_groups
    WHERE grp = (
      SELECT MAX(grp) 
      FROM streak_groups sg2 
      WHERE sg2.id = streak_groups.id 
        AND sg2.active_date >= (CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date - 1
    )
    GROUP BY id, grp
  )
  SELECT 
    rs.id,
    rs.nome,
    rs.total_cadastros,
    COALESCE(s.current_streak, 0)::int as streak,
    rs.rank
  FROM ranked_stats rs
  LEFT JOIN streaks s ON rs.id = s.id;
END;
$$;
