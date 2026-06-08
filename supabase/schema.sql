-- =============================================
-- Schema Atlas para Supabase
-- Execute no SQL Editor do dashboard do Supabase
-- =============================================

-- ─────────────────────────────────────────────
-- Função: busca email pelo CPF (sem autenticação)
-- Permite login por CPF sem expor dados via RLS
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_email_by_cpf(cpf_input TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result_email TEXT;
BEGIN
  SELECT u.email INTO result_email
  FROM public.perfis p
  JOIN auth.users u ON u.id = p.id
  WHERE p.cpf = regexp_replace(cpf_input, '\D', '', 'g')
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
  role                     TEXT NOT NULL DEFAULT 'eleitor'
    CONSTRAINT perfis_role_check
      CHECK (role IN ('lideranca', 'coordenador_geral', 'coordenador_regional', 'captador_votos', 'eleitor')),
  regiao                   TEXT,
  deputado_id              TEXT,
  coordenador_regional_id  UUID REFERENCES public.perfis(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Tabela de eleitores
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eleitores (
  id                 TEXT PRIMARY KEY,
  nome               TEXT NOT NULL,
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
  data_cadastro      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS eleitores_criado_por   ON public.eleitores (criado_por);
CREATE INDEX IF NOT EXISTS eleitores_atualizado_em ON public.eleitores (atualizado_em);
CREATE INDEX IF NOT EXISTS eleitores_regiao        ON public.eleitores (regiao);

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

-- ─────────────────────────────────────────────
-- Trigger: cria perfil automaticamente no sign-up
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'eleitor')
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

-- Funções auxiliares SECURITY DEFINER — bypassam RLS para checar role
-- sem causar recursão infinita nas policies
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.perfis WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_coord_regional_of(captador_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis
    WHERE id = captador_id AND coordenador_regional_id = auth.uid()
  );
$$;

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

-- Usa get_my_role() para evitar recursão
CREATE POLICY "perfis_select_gestores" ON public.perfis FOR SELECT USING (
  get_my_role() IN ('lideranca', 'coordenador_geral')
);

CREATE POLICY "perfis_select_equipe_coord" ON public.perfis FOR SELECT USING (
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
  criado_por = auth.uid()
);

-- Usa get_my_role() para evitar recursão via perfis
CREATE POLICY "eleitores_select_gestores" ON public.eleitores FOR SELECT USING (
  get_my_role() IN ('lideranca', 'coordenador_geral')
);

-- Usa is_coord_regional_of() para evitar recursão via perfis
CREATE POLICY "eleitores_select_coord_regional" ON public.eleitores FOR SELECT USING (
  is_coord_regional_of(criado_por)
);

CREATE POLICY "eleitores_insert" ON public.eleitores FOR INSERT WITH CHECK (
  criado_por = auth.uid()
);

CREATE POLICY "eleitores_update" ON public.eleitores FOR UPDATE USING (
  criado_por = auth.uid()
  OR get_my_role() IN ('lideranca', 'coordenador_geral', 'coordenador_regional')
);

CREATE POLICY "eleitores_delete" ON public.eleitores FOR DELETE USING (
  criado_por = auth.uid()
  OR get_my_role() IN ('lideranca', 'coordenador_geral')
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
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agenda_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_crud_proprio" ON public.agenda_itens;
CREATE POLICY "agenda_crud_proprio" ON public.agenda_itens
  USING (criado_por = auth.uid())
  WITH CHECK (criado_por = auth.uid());

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_select_all"      ON public.eventos;
DROP POLICY IF EXISTS "eventos_insert_gestores" ON public.eventos;
DROP POLICY IF EXISTS "eventos_delete_gestores" ON public.eventos;

CREATE POLICY "eventos_select_all"      ON public.eventos FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "eventos_insert_gestores" ON public.eventos FOR INSERT
  WITH CHECK (get_my_role() IN ('lideranca', 'coordenador_geral', 'coordenador_regional'));
CREATE POLICY "eventos_delete_gestores" ON public.eventos FOR DELETE
  USING (get_my_role() IN ('lideranca', 'coordenador_geral') OR criado_por = auth.uid());

-- ─────────────────────────────────────────────
-- Tabela: evento_confirmacoes (presença em eventos)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evento_confirmacoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id  UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  eleitor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (evento_id, eleitor_id)
);

ALTER TABLE public.evento_confirmacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "confirmacoes_select_proprio"  ON public.evento_confirmacoes;
DROP POLICY IF EXISTS "confirmacoes_insert_proprio"  ON public.evento_confirmacoes;
DROP POLICY IF EXISTS "confirmacoes_delete_proprio"  ON public.evento_confirmacoes;
DROP POLICY IF EXISTS "confirmacoes_select_gestores" ON public.evento_confirmacoes;

CREATE POLICY "confirmacoes_select_proprio"  ON public.evento_confirmacoes FOR SELECT
  USING (eleitor_id = auth.uid());
CREATE POLICY "confirmacoes_select_gestores" ON public.evento_confirmacoes FOR SELECT
  USING (get_my_role() IN ('lideranca', 'coordenador_geral', 'coordenador_regional'));
CREATE POLICY "confirmacoes_insert_proprio"  ON public.evento_confirmacoes FOR INSERT
  WITH CHECK (eleitor_id = auth.uid());
CREATE POLICY "confirmacoes_delete_proprio"  ON public.evento_confirmacoes FOR DELETE
  USING (eleitor_id = auth.uid());

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.enquetes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enquetes_select_all"     ON public.enquetes;
DROP POLICY IF EXISTS "enquetes_insert_gestores" ON public.enquetes;
DROP POLICY IF EXISTS "enquetes_update_gestores" ON public.enquetes;

CREATE POLICY "enquetes_select_all"      ON public.enquetes FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "enquetes_insert_gestores" ON public.enquetes FOR INSERT
  WITH CHECK (get_my_role() IN ('lideranca', 'coordenador_geral'));
CREATE POLICY "enquetes_update_gestores" ON public.enquetes FOR UPDATE
  USING (get_my_role() IN ('lideranca', 'coordenador_geral'));

-- ─────────────────────────────────────────────
-- Tabela: enquete_votos (votos por eleitor)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enquete_votos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquete_id      UUID NOT NULL REFERENCES public.enquetes(id) ON DELETE CASCADE,
  eleitor_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opcao_escolhida TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enquete_id, eleitor_id)
);

ALTER TABLE public.enquete_votos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "votos_select_proprio"  ON public.enquete_votos;
DROP POLICY IF EXISTS "votos_insert_proprio"  ON public.enquete_votos;
DROP POLICY IF EXISTS "votos_select_gestores" ON public.enquete_votos;

CREATE POLICY "votos_select_proprio"  ON public.enquete_votos FOR SELECT
  USING (eleitor_id = auth.uid());
CREATE POLICY "votos_select_gestores" ON public.enquete_votos FOR SELECT
  USING (get_my_role() IN ('lideranca', 'coordenador_geral'));
CREATE POLICY "votos_insert_proprio"  ON public.enquete_votos FOR INSERT
  WITH CHECK (eleitor_id = auth.uid());

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
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comunicados_select" ON public.comunicados;
DROP POLICY IF EXISTS "comunicados_insert" ON public.comunicados;

-- Lê se: é o remetente, ou sua role está na lista de destino, ou destino contém 'todos'
CREATE POLICY "comunicados_select" ON public.comunicados FOR SELECT USING (
  remetente_id = auth.uid()
  OR get_my_role() = ANY(destino_roles)
  OR 'todos' = ANY(destino_roles)
);

-- Só liderança e coordenador_geral podem enviar
CREATE POLICY "comunicados_insert" ON public.comunicados FOR INSERT
  WITH CHECK (get_my_role() IN ('lideranca', 'coordenador_geral'));

-- Habilitar Realtime para esta tabela (necessário para atualizações em tempo real no app)
ALTER TABLE public.comunicados REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comunicados;

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
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS disparos_whatsapp_criado_em_idx ON public.disparos_whatsapp (criado_em DESC);
CREATE INDEX IF NOT EXISTS disparos_whatsapp_remetente_idx ON public.disparos_whatsapp (remetente_id);

ALTER TABLE public.disparos_whatsapp ENABLE ROW LEVEL SECURITY;

-- Liderança e Coord. Geral podem ver e criar disparos
DROP POLICY IF EXISTS "disparo_read" ON public.disparos_whatsapp;
CREATE POLICY "disparo_read" ON public.disparos_whatsapp
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE id = auth.uid()
        AND role IN ('lideranca', 'coordenador_geral')
    )
  );

DROP POLICY IF EXISTS "disparo_insert" ON public.disparos_whatsapp;
CREATE POLICY "disparo_insert" ON public.disparos_whatsapp
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE id = auth.uid()
        AND role IN ('lideranca', 'coordenador_geral')
    )
  );

-- Service role pode atualizar status e contadores (Edge Function)
DROP POLICY IF EXISTS "disparo_service_update" ON public.disparos_whatsapp;
CREATE POLICY "disparo_service_update" ON public.disparos_whatsapp
  FOR UPDATE USING (auth.role() = 'service_role');
