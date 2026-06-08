-- =============================================
-- Seed: Usuários de demonstração
-- Execute no SQL Editor do Supabase APÓS o schema.sql
-- Senha de todos os usuários: 1234
-- Login: e-mail real (victor@atlas.com) OU CPF (000.000.000-01)
-- =============================================

-- UUIDs fixos para manter referências entre usuários
-- u1 = Victor Costa      (lideranca)
-- u2 = Ana Oliveira      (coordenador_geral)
-- u3 = Carlos Mendes     (coordenador_regional - Centro)
-- u4 = Fernanda Lima     (coordenador_regional - Zona Norte)
-- u5 = Rafael Souza      (captador_votos - Centro, coord: u3)
-- u6 = Juliana Santos    (captador_votos - Zona Norte, coord: u4)
-- u7 = Marcos Eleitor    (eleitor)

-- ─────────────────────────────────────────────
-- 1. Inserir em auth.users com e-mails reais
-- ─────────────────────────────────────────────
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'victor@atlas.com',
    crypt('1234', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"name":"Victor Costa","role":"lideranca"}',
    FALSE, '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'ana@atlas.com',
    crypt('1234', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"name":"Ana Oliveira","role":"coordenador_geral"}',
    FALSE, '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'carlos@atlas.com',
    crypt('1234', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"name":"Carlos Mendes","role":"coordenador_regional"}',
    FALSE, '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000004',
    'authenticated', 'authenticated',
    'fernanda@atlas.com',
    crypt('1234', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"name":"Fernanda Lima","role":"coordenador_regional"}',
    FALSE, '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000005',
    'authenticated', 'authenticated',
    'rafael@atlas.com',
    crypt('1234', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"name":"Rafael Souza","role":"captador_votos"}',
    FALSE, '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000006',
    'authenticated', 'authenticated',
    'juliana@atlas.com',
    crypt('1234', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"name":"Juliana Santos","role":"captador_votos"}',
    FALSE, '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000007',
    'authenticated', 'authenticated',
    'marcos@atlas.com',
    crypt('1234', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"name":"Marcos Eleitor","role":"eleitor"}',
    FALSE, '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 2. Inserir em public.perfis
--    (o trigger handle_new_user faz isso automaticamente,
--     mas fazemos manualmente para garantir os campos extras)
-- ─────────────────────────────────────────────
INSERT INTO public.perfis (id, nome, email, cpf, role, regiao, deputado_id, coordenador_regional_id)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Victor Costa', 'victor@atlas.com', '00000000001', 'lideranca',
    NULL, NULL, NULL
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Ana Oliveira', 'ana@atlas.com', '00000000002', 'coordenador_geral',
    NULL, 'dep1', NULL
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Carlos Mendes', 'carlos@atlas.com', '00000000003', 'coordenador_regional',
    'Centro', 'dep1', NULL
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Fernanda Lima', 'fernanda@atlas.com', '00000000004', 'coordenador_regional',
    'Zona Norte', 'dep1', NULL
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Rafael Souza', 'rafael@atlas.com', '00000000005', 'captador_votos',
    'Centro', NULL,
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'Juliana Santos', 'juliana@atlas.com', '00000000006', 'captador_votos',
    'Zona Norte', NULL,
    '00000000-0000-0000-0000-000000000004'
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Marcos Eleitor', 'marcos@atlas.com', '00000000007', 'eleitor',
    NULL, NULL, NULL
  )
ON CONFLICT (id) DO UPDATE SET
  nome   = EXCLUDED.nome,
  email  = EXCLUDED.email,
  cpf    = EXCLUDED.cpf,
  role   = EXCLUDED.role,
  regiao = EXCLUDED.regiao,
  deputado_id              = EXCLUDED.deputado_id,
  coordenador_regional_id  = EXCLUDED.coordenador_regional_id;

-- ─────────────────────────────────────────────
-- 3. Eventos de demonstração (criados pelo Victor — liderança)
-- ─────────────────────────────────────────────
INSERT INTO public.eventos (id, titulo, data, horario, local, criado_por)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'Reunião de Campanha — Centro',
    (CURRENT_DATE + interval '5 days')::date,
    '19:00',
    'Sede do Bairro Centro, Rua das Flores, 100',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'Caminhada Eleitoral — Zona Norte',
    (CURRENT_DATE + interval '10 days')::date,
    '08:00',
    'Praça Central, Av. Principal s/n',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'Café com o Deputado',
    (CURRENT_DATE + interval '14 days')::date,
    '10:00',
    'Câmara Municipal — Auditório B',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 4. Enquetes de demonstração (criadas pelo Victor — liderança)
-- ─────────────────────────────────────────────
INSERT INTO public.enquetes (id, titulo, opcoes, status, criado_por)
VALUES
  (
    'q0000000-0000-0000-0000-000000000001',
    'Qual é a sua maior prioridade para o bairro?',
    '["Saúde","Educação","Segurança","Emprego"]',
    'ativa',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    'q0000000-0000-0000-0000-000000000002',
    'Como você avalia a atuação do vereador na sua região?',
    '["Ótimo","Bom","Regular","Ruim"]',
    'ativa',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;
