# Product Requirements Document — ATLAS

**Versão:** 1.0 | **Status:** Em Produção | **Última Atualização:** Jun/2026

---

## 1. Executive Summary

**ATLAS** é uma plataforma de gestão eleitoral (CRM político) para campanhas brasileiras, desenvolvida como Progressive Web App (PWA) com suporte offline-first, sincronização cloud e inteligência artificial de campanha.

**Objetivo:** Capacitar equipes de campanha a capturar, organizar e analisar dados de eleitores em tempo real, com máxima acessibilidade e compliance legal, mesmo em regiões com conectividade intermitente.

**Diferencial Competitivo:**
- ✅ Funciona sem internet (PWA + IndexedDB + sync automático)
- ✅ RBAC granular: 5 papéis com permissões específicas
- ✅ IA integrada com alertas automáticos de campanha
- ✅ Automação de WhatsApp com compliance legal obrigatório
- ✅ Análise geoespacial (heatmap, geolocalização, rotas)
- ✅ 100% open-source (Evolution API para WhatsApp, sem locks com Twilio/Z-API)

---

## 2. Contexto de Negócio

### 2.1 Problema

Equipes de campanha eleitorais brasileiras enfrentam:
- **Fragmentação de dados:** Planilhas Excel, Whatsapp, anotações em papel
- **Falta de visibilidade:** Coordenadores não sabem onde seus captadores estão, quanto cadastraram, qual o status
- **Conexão instável:** Muitas regiões têm 3G/4G intermitente; ferramentas cloud-only são inúteis em campo
- **Conformidade legal:** Envio desorganizado de mensagens WhatsApp sem controle, sem logs, sem respeito ao opt-in (GDPR/LGPD)
- **Custo elevado:** Soluções propriedárias (Z-API, Twilio) custam R$500+/mês; campanhas locais não têm orçamento

### 2.2 Solução

Uma plataforma unificada que integra:
1. **Captura de dados** (formulário completo no celular)
2. **Sincronização offline** (funciona desconectado)
3. **Análise em tempo real** (dashboards, gráficos, alertas)
4. **Automação de campanha** (WhatsApp + templates)
5. **RBAC seguro** (cada usuário vê só seus dados)
6. **IA de campanha** (recomendações automáticas)

### 2.3 Público-Alvo

| Persona | Descrição | Necessidade |
|---------|-----------|------------|
| **Captador** | Voluntário/eleitor que cadastra eleitores em campo | Formulário simples, GPS, QR Code, offline |
| **Coordenador Regional** | Gerencia 5-20 captadores em uma região | Ver produção por captador, exportar, mapa |
| **Coordenador Geral** | Gerencia múltiplos coordenadores (3-5 regiões) | Drill-down, comparativos, alertas |
| **Liderança** | Deputado ou gestor de campanha | Dashboard executivo, projeções, IA, WhatsApp |
| **Eleitor** | Visualiza seu perfil e participa de enquetes | Perfil, QR Code, eventos, agenda |

---

## 3. Requisitos Funcionais

### 3.1 Fase 1 — Core (✅ CONCLUÍDO)

**Escopo:** Cadastro básico, autenticação, RBAC, persistência.

| Função | Descrição | Status |
|--------|-----------|--------|
| **Login com CPF/E-mail** | Máscara de CPF, validação, fallback offline | ✅ |
| **Cadastro de Eleitor** | Formulário: nome, CPF, WhatsApp, título eleitoral (12 dígitos), endereço, nível de voto, nichos, engajamento, GPS, aceite WhatsApp, observações | ✅ |
| **5 Papéis de Acesso** | Liderança, Coord. Geral, Coord. Regional, Captador, Eleitor — cada um com telas e permissões diferentes | ✅ |
| **RBAC em Banco de Dados** | Row-level security (RLS) no Supabase: captador vê só seus cadastros; coord. regional vê sua região; liderança vê tudo | ✅ |
| **Edição de Eleitor** | Formulário reutilizável em modo edição | ✅ |
| **Validação de Campos** | Título eleitoral (12 dígitos), CPF (valid module 11), e-mail, telefone | ✅ |
| **Armazenamento Local** | IndexedDB via Dexie — funciona totalmente desconectado | ✅ |
| **Sincronização com Supabase** | Push/pull bidirecional com resolução de conflitos (last-write-wins) | ✅ |
| **Anti-Fraude (Prevenção de Duplicidade)** | Restrição de chaves únicas (UNIQUE constraint) no banco de dados para CPF e Título Eleitoral. O front-end e o back-end validam em tempo real: se um captador tentar registrar um eleitor já existente, o sistema bloqueia e alerta, impedindo fraudes no batimento de metas diárias. | ✅ |

---

### 3.2 Fase 2 — Visibilidade (✅ CONCLUÍDO)

**Escopo:** Dashboards, relatórios, exportação.

| Função | Descrição | Status |
|--------|-----------|--------|
| **Dashboard Liderança** | Gráficos: por região, por nível de voto, por nicho, evolução por dia (7, 30, 90 dias) — recharts | ✅ |
| **Coordenação com Drill-Down** | Coord. Geral vê regiões → seleciona → vê coordenadores regionais → seleciona → vê captadores com KPIs | ✅ |
| **Lista de Coordenadores** | Coord. Regional vê captadores com: cadastros, conversão (fraco/indeciso/forte), último login, status de sincronização | ✅ |
| **Perfil do Eleitor** | Nome, dados de contato, nível de voto, engajamento, QR Code gerado (título eleitoral), eventos inscritos, enquetes respondidas | ✅ |
| **Exportação CSV/PDF** | Dados de eleitores filtrados, com restrição por papel (RBAC) | ✅ |
| **Score de Engajamento** | Pontuação 0–100 por eleitor: fórmula com nível de voto, engajamento, atendimentos, nichos, WhatsApp, observações | ✅ |
| **Heatmap Eleitoral** | Mapa interativo (Leaflet): eleitores como círculos coloridos por nível de voto (verde/amarelo/vermelho/cinza/roxo) | ✅ |

---

### 3.3 Fase 3 — Interatividade (✅ CONCLUÍDO)

**Escopo:** Agenda, enquetes, comunicados, notificações push.

| Função | Descrição | Status |
|--------|-----------|--------|
| **Agenda Integrada** | CRUD real no Supabase: criar evento, listar, editar, deletar — visível para Liderança + Coord. Geral | ✅ |
| **Enquetes** | CRUD real: criar enquete, definir opções, ativar/desativar, eleitores respondendo, exibir resultados em tempo real | ✅ |
| **Comunicados** | Liderança/Coord. Geral enviam mensagens → push notification em tempo real via Supabase Realtime | ✅ |
| **QR Code (Geração)** | Perfil do eleitor: exibe QR Code com título eleitoral codificado (qrcode.react) | ✅ |
| **QR Code (Leitura)** | Novo cadastro: botão "Escanear Título" → abre câmera (html5-qrcode) → preenche campo automaticamente | ✅ |
| **Indicador Offline** | Barra fixa com ícone WifiOff + spinner quando desconectado; badge com número de pendências | ✅ |

---

### 3.4 Fase 4 — Inteligência (✅ CONCLUÍDO)

**Escopo:** IA de campanha, alertas, recomendações.

| Função | Descrição | Status |
|--------|-----------|--------|
| **Motor de Alertas** | 6 tipos automáticos: captador inativo 3d/7d, queda por bairro, tendência geral, oportunidade indecisos, alta oposição, destaque da semana | ✅ |
| **Score de Risco por Região** | Ponderação: fraco (0.5×), indeciso (0.3×), oposição (1.0×) → score 0–100, barra colorida | ✅ |
| **Redistribuição Sugerida** | Algoritmo: captador inativo 5+ dias → sugere redirecionamento para região com mais indecisos | ✅ |
| **Aba Alertas no AdminScreen** | Dashboard visual: resumo Críticos/Atenção/Positivos, cards coloridos, tabela de risco por região | ✅ |

---

### 3.5 Fase 5 — Automação (✅ CONCLUÍDO)

**Escopo:** WhatsApp, disparos, templates, compliance.

| Função | Descrição | Status |
|--------|-----------|--------|
| **Integração Evolution API** | REST endpoint `POST {URL}/message/sendText/{INSTANCE}` com header `apikey` — open-source, self-hosted, gratuito | ✅ |
| **Disparos Segmentados** | Filtros: nível de voto (forte/médio/fraco/indeciso — oposição nunca incluído), bairro, região, `aceitaWhatsapp=true` obrigatório | ✅ |
| **4 Templates** | Livre (custom), Evento, Mobilização, Confirmação de Presença — auto-preenchimento de textarea | ✅ |
| **Fluxo Guiado** | Compose → Confirm (preview de destinatários) → Sending (spinner) → Done (toast de sucesso/erro) | ✅ |
| **Rate Limiting** | 500ms entre envios de números (não sobrecarrega Evolution API nem WhatsApp) | ✅ |
| **Escala e Lotes de WhatsApp** | O sistema possui uma fila inteligente (Queue) capaz de processar 1.000+ disparos automáticos por lote, sem bloqueios (usando o rate limiting de 500ms). Isso elimina a necessidade de infraestrutura física, call centers ou operadores manuais para disparos. | ✅ |
| **Log de Disparos** | Tabela `disparos_whatsapp`: ID, mensagem, template, filtros (JSON), total destinatários, enviados, falhas, status, remetente, timestamp | ✅ |
| **Edge Function** | Deno Edge Function em Supabase: `send-whatsapp` → normaliza números (55XXXXXXXXXX) → loop com delay 500ms → atualiza status | ✅ |
| **Aba WhatsApp** | AdminScreen com: card de setup (quando não configurada), botão "Novo Disparo", histórico com status badges | ✅ |

---

### 3.5.5 Fase 5.5 — Onboarding Seguro + Notificações (✅ CONCLUÍDO)

**Escopo:** Convite seguro para novos usuários + reminders inteligentes para agenda.

| Função | Descrição | Status |
|--------|-----------|--------|
| **Tabela Invites** | `invites` com `chave_unica` (6 caracteres), `role`, `usado`, `usado_por`, `usado_em`, criado_em — RLS: público lê não-usadas, service_role gerencia | ✅ |
| **Modal de Convite** | UI: pede código, valida contra BD, exibe role confirmado se válido — step-by-step onboarding | ✅ |
| **Signup Form** | Nome, CPF (validação), E-mail, Senha — cria user em Supabase Auth + perfil + marca invite como usado | ✅ |
| **Botão "Primeiro Acesso"** | LoginScreen: novo botão ao lado de "Esqueci Senha" para disparar fluxo de convite | ✅ |
| **Local Push Notifications** | Utility `notificationScheduler.ts`: agenda notificações nativas do navegador/Android sem hits ao banco | ✅ |
| **Reminders de Agenda** | AgendaScreen integrada: dispara notificação local 30min antes de cada atividade de hoje (reunião/visita) | ✅ |
| **Permissão Notification API** | Request automático ao abrir aba Agenda; aviso visual se negada | ✅ |

---

### 3.6 Fase 6 — Gamificação (🔲 PENDENTE)

**Escopo:** Ranking, medalhas, streak, leaderboard.

| Função | Descrição | Status |
|--------|-----------|--------|
| **Ranking de Captadores** | Ordenação por cadastros (últimos 7/30/90 dias) com posição em tempo real | 🔲 ⭐ |
| **Medalhas** | Badges por marcos: 1, 5, 10, 25, 50, 100 cadastros — ícone + efeito visual | 🔲 ⭐ |
| **Streak Diária** | Contador: dias consecutivos com cadastro ≥ 1 | 🔲 ⭐ |
| **Meta Diária** | Barra de progresso: "Cadastros hoje vs. meta" — visual inspirador | 🔲 ⭐ |
| **Tela "Meus Resultados"** | Histórico, gráfico de tendência, posição no ranking, medalhas conquistadas | 🔲 ⭐ |

---

### 3.7 Fase 7 — Elevação de Maturidade CRM (✅ CONCLUÍDO)

**Escopo:** Refatoração de funil, auditoria, importação e relatórios avançados.

| Função | Descrição | Status |
|--------|-----------|--------|
| **Funil de Relacionamento** | Novo campo `statusFunil` (Contato, Interessado, Simpatizante, Apoiador, Multiplicador) para segmentação no Kanban/Listagem | ✅ |
| **Importação em Massa** | Módulo de Upload CSV/XLSX com preview, validação de colunas e barra de progresso. | ✅ |
| **Trilha de Auditoria (LGPD)** | Tabela `audit_logs` imutável no Supabase, registrando ações críticas (CREATE, UPDATE, DELETE, EXPORT, IMPORT, LOGIN) | ✅ |
| **Relatórios Estratégicos** | Visão analítica para Liderança/Coordenadores (Captadores vs Meta, Drill-down da equipe e Conversão de Funil) | ✅ |

---

### 3.7 Fase 7 — Geolocalização (🔲 PENDENTE)

**Escopo:** Check-in, rota, cobertura.

| Função | Descrição | Status |
|--------|-----------|--------|
| **Check-in Automático** | GPS ao registrar eleitor: coordenadas salvas no banco | 🔲 ⭐ |
| **Mapa de Rota** | Leaflet com pontos de visita do captador (últimas 24h/7d) — polyline conectando pontos | 🔲 ⭐ |
| **Cobertura Geográfica** | Coord. Geral vê mapa com contornos de regiões e densidade de cobertura (cor mais quente = mais visitado) | 🔲 ⭐ |
| **Análise de Eficiência** | Sugestão: "região X com 20% de cobertura — enviar reforço" | 🔲 ⭐ |

---

## 4. Requisitos Não-Funcionais

### 4.1 Performance

| Requisito | Métrica | Implementação |
|-----------|---------|----------------|
| **Tempo de Carregamento** | < 3s em 3G | Vite com lazy loading, code splitting |
| **Operações Offline** | < 100ms | IndexedDB + Dexie otimizado |
| **Sync** | < 5s para 1000 registros | Batch push/pull, worker thread |
| **Dashboard** | < 1s para renderizar gráficos | Recharts + memoização de componentes |

### 4.2 Segurança

| Requisito | Implementação |
|-----------|----------------|
| **Autenticação** | Supabase Auth com JWT; fallback offline com mock user |
| **Autorização** | RLS (Row-Level Security) no PostgreSQL: captador vê só seus dados |
| **Criptografia** | HTTPS obrigatório (PWA); dados sensíveis (CPF, telefone) nunca em localStorage |
| **Rate Limiting** | WhatsApp: 500ms entre envios; API: throttle por IP |
| **Dados Pessoais** | GDPR/LGPD compliance: campo `aceitaWhatsapp` obrigatório; log de quem criou/atualizou cada registro |

### 4.3 Conformidade Legal

| Requisito | Status | Notas |
|-----------|--------|-------|
| **LGPD (Lei Geral de Proteção de Dados)** | ✅ | Campo `aceitaWhatsapp` obrigatório; log de consentimento em timestamp |
| **Opt-in WhatsApp** | ✅ | Filtro `aceitaWhatsapp=true` forçado em disparos — impossível enviare sem consentimento |
| **Retenção de Dados** | 🔲 | Deletar automaticamente eleitores inativos > 2 anos (política a definir) |
| **Direito ao Esquecimento** | 🔲 | API para captador deletar seus próprios cadastros |

### 4.4 Acessibilidade

| Requisito | Implementação |
|-----------|----------------|
| **Mobile-First** | React + Tailwind responsivo; bottom nav para dedo, botões > 48px |
| **Contraste** | WCAG AA (4.5:1 em textos) |
| **Offline** | PWA manifesto + service worker: funciona sem internet após 1º acesso |
| **Idioma** | Português brasileiro; validações com máscaras CPF/telefone |

### 4.5 Escalabilidade

| Requisito | Implementação |
|-----------|----------------|
| **Banco de Dados** | PostgreSQL (Supabase): índices em `createdBy`, `regiao`, `created_at` |
| **Realtime** | Supabase Realtime: broadcast para notificações (WebSocket) |
| **Edge Functions** | Deno Edge Functions (Supabase): 100ms latency + autoscaling |
| **Limite de Usuários** | 5000 usuários ativos simultâneos (com Supabase Pro) |

---

## 5. Arquitetura Técnica

### 5.1 Stack

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Progressive Web App)                     │
├─────────────────────────────────────────────────────┤
│ React 18 + TypeScript + Tailwind CSS v4             │
│ shadcn/ui (componentes) + Recharts (gráficos)       │
│ Vite 6 (build) + vite-plugin-pwa (service worker)  │
│ html5-qrcode (leitura) + qrcode.react (geração)     │
│ Leaflet + Leaflet.heat (mapa + heatmap)             │
├─────────────────────────────────────────────────────┤
│  Offline Storage                                    │
├─────────────────────────────────────────────────────┤
│ IndexedDB via Dexie 4 (tabelas: electors, users,    │
│  pendingChanges, agenda, polls, disparos)           │
│ Service Worker (Workbox via vite-plugin-pwa)        │
│ Sync automático ao voltar online                    │
├─────────────────────────────────────────────────────┤
│  Backend (Cloud)                                    │
├─────────────────────────────────────────────────────┤
│ Supabase (PostgreSQL + Auth + RLS + Realtime)       │
│ Deno Edge Functions (send-whatsapp, webhooks)       │
│ REST API via Supabase client (@supabase/js)         │
├─────────────────────────────────────────────────────┤
│  Externa                                            │
├─────────────────────────────────────────────────────┤
│ Evolution API (WhatsApp REST)                       │
│ RabbitMQ / Webhooks (notificações)                  │
└─────────────────────────────────────────────────────┘
```

### 5.2 Banco de Dados (Schema Supabase)

**Tabelas Principais:**

```sql
-- Usuários (auth via Supabase Auth + profiles)
profiles (id UUID, name, role, regiao, deputadoId, coordenadorRegionalId)

-- Dados
electors (id UUID, name, cpf, whatsapp, titulo_eleitor, bairro, regiao, 
          nivel_voto, engajamento, nichos, gps_lat, gps_lon, 
          aceita_whatsapp, score, created_by, created_at, updated_at)

-- Interatividade
agenda (id UUID, title, date, location, created_by, created_at, updated_at)
polls (id UUID, title, options JSON, elector_responses JSON, created_by, created_at, updated_at)
comunicados (id UUID, message, sender_id, created_at)

-- WhatsApp
disparos_whatsapp (id UUID, mensagem, template_tipo, filtros JSON,
                   total_destinatarios, total_enviados, total_falhas,
                   status, remetente_id, remetente_nome, criado_em)

-- Sync local
pending_changes (id UUID, entity_type, entity_id, operation, data JSON, created_at)
```

**RLS Policies:**
- Captador: `SELECT * FROM electors WHERE created_by = auth.uid()`
- Coord. Regional: `SELECT * FROM electors WHERE regiao = user.regiao`
- Coord. Geral / Liderança: `SELECT * FROM electors` (sem filtro)

### 5.3 Fluxo de Dados (Sync)

```
┌─────────────┐
│   Captador  │
│   (Online)  │
└──────┬──────┘
       │
       ├──→ CaptureForm.tsx
       │    ├─→ validação (CPF, título, telefone)
       │    └─→ salva em IndexedDB (Dexie)
       │         ├─→ electors
       │         └─→ pendingChanges (operação: 'create')
       │
       ├──→ App.tsx
       │    └─→ useSync hook (verifica navigator.onLine)
       │
       ├─→ syncService.ts (ao voltar online)
       │    ├─→ PUSH: pendingChanges → Supabase (INSERT/UPDATE/DELETE)
       │    ├─→ PULL: diferença desde lastSyncAt
       │    └─→ conflitos: last-write-wins (updatedAt)
       │
       └──→ Supabase
            ├─→ RLS valida: user_id == auth.uid()
            ├─→ trigger: updatedAt = now()
            └─→ broadcast via Realtime

┌──────────────────┐
│ Coordenador Geral│
│   (Online)       │
└─────────┬────────┘
          │
          ├─→ CoordinationScreen.tsx
          │    └─→ realtime: query.on('*', callback)
          │         (atualiza quando outro usuário cria eleitor)
          │
          └─→ Dashboard + gráficos
               (Recharts renderiza em tempo real)
```

---

## 6. Roadmap de Features

### Q3 2026 (Atual)
- ✅ Core: cadastro, RBAC, offline, sync
- ✅ Visibilidade: dashboards, exportação, heatmap
- ✅ Interatividade: agenda, enquetes, comunicados, QR
- ✅ Inteligência: alertas, redistribuição, IA
- ✅ Automação: WhatsApp + Evolution API
- ✅ Onboarding Seguro: convite + validação
- ✅ Notificações: reminders de agenda via Local Push
- ✅ Elevação CRM: Funil de relacionamento, auditoria LGPD, importação CSV/XLSX, relatórios

### Q4 2026
- ✅ Gamificação: ranking, medalhas, streak
- 🔲 Geolocalização: check-in, rota, cobertura
- 🔲 LGPD compliance: direito ao esquecimento, política de retenção (Trilha de auditoria já concluída)

### Q1 2027
- 🔲 BI avançado: análise preditiva (candidato vai ganhar sim/não)
- 🔲 Integração: SMS (Twilio), e-mail (SendGrid)
- 🔲 App nativo: React Native para Android/iOS

### Q2+ 2027
- 🔲 Multi-campanha: um user em múltiplos projetos
- 🔲 API pública: webhooks, integrações custom
- 🔲 Marketplace: templates de campanha, plugins

---

## 7. Métricas de Sucesso

### 7.1 Adoção

| Métrica | Target | Implementação |
|---------|--------|----------------|
| **Usuários Ativos Mensais (MAU)** | 500+ | Supabase Analytics |
| **Taxa de Retenção (30d)** | > 60% | Cohort analysis |
| **Cadastros de Eleitores / Mês** | > 5000 | Dashboard Liderança |
| **Taxa de Offline** | > 40% | Event tracking (app usado sem internet) |

### 7.2 Performance

| Métrica | Target | Ferramentas |
|---------|--------|------------|
| **Tempo Carregamento (p75)** | < 2s | Lighthouse, Sentry |
| **Taxa Sync Success** | > 99% | Supabase logs |
| **Latência Push Notification** | < 3s | Supabase Realtime monitoring |
| **Uptime** | > 99.5% | Grafana + Supabase alerts |

### 7.3 Negócio

| Métrica | Target | Notas |
|---------|--------|-------|
| **CTR de Disparos WhatsApp** | > 15% | Rastrear via `disparos_whatsapp.status` |
| **Taxa Conversão (indeciso → forte)** | > 5% | Score agregado em heatmap |
| **ROI vs Custo Cloud** | 10:1 | Supabase: ~$25/mês (início); campanhas ganham com menos tempo |

---

## 8. Configuração de Produção

### 8.1 Variáveis de Ambiente

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_...
VITE_VAPID_PUBLIC_KEY=BN... (para push notifications)
VITE_WHATSAPP_CONFIGURED=true  (quando Evolution API ativo)
```

**Backend (Supabase Secrets):**
```bash
EVOLUTION_API_URL=https://evolution.seuservidor.com
EVOLUTION_API_KEY=sua-api-key
EVOLUTION_INSTANCE=nome-da-instancia
```

### 8.2 Deployment

| Componente | Plataforma | Setup |
|-----------|-----------|-------|
| **Frontend** | Vercel / Netlify | `npm run build` → git push |
| **Backend** | Supabase Cloud | PostgreSQL gerenciado + Auth |
| **Edge Functions** | Supabase Functions (Deno) | `supabase functions deploy send-whatsapp` |
| **Evolution API** | Docker self-hosted (seu VPS) | `docker compose up` + Nginx + SSL |

### 8.3 Monitoramento

```bash
# Logs
supabase functions logs send-whatsapp --limit 100

# Métricas
supabase metrics  # Dashboard no console

# Alertas
# Configurar no Supabase Dashboard: Alertas > Uptime > critical
```

---

## 9. Documentação e Links

| Documento | Link | Propósito |
|-----------|------|----------|
| **README.md** | `./README.md` | Setup local, tecnologias, estrutura |
| **Plano de Ação** | `./guidelines/plano_acao.md` | Status feature-by-feature |
| **Plano de Execução** | `./guidelines/plano_execucao.md` | Requisitos fase-by-fase |
| **Attributions** | `./guidelines/ATTRIBUTIONS.md` | Créditos de bibliotecas/assets |
| **Schema DB** | `./supabase/schema.sql` | DDL completo |
| **Tests** | `./src/__tests__/` | Vitest (unitários) + Playwright (E2E) |

---

## 10. Perguntas Frequentes (FAQ)

### 10.1 "Funciona sem internet?"
Sim. Todos os dados são salvos em IndexedDB (offline). Quando voltar online, sincroniza automaticamente com Supabase.

### 10.2 "Como segura são as senhas?"
Não armazenamos senhas no cliente. Usamos Supabase Auth (JWT), que é padrão industry. Fallback offline usa mock user (não produção).

### 10.3 "Quanto custa?"
Supabase: ~R$25/mês (development) a R$250+/mês (production). Evolution API: gratuito (self-hosted). Vercel: ~R$20/mês.

### 10.4 "Suporta WhatsApp multicanal?"
Atualmente: só WhatsApp. Roadmap: SMS (Twilio), e-mail. Evolution API também suporta Instagram (não implementado ainda).

### 10.5 "Como faço backup dos dados?"
Supabase faz backup automático (retenção 30 dias). Você pode exportar manualmente via CSV no AdminScreen ou via `pg_dump` no dashboard.

### 10.6 "Posso usar em múltiplas campanhas?"
Não (v2.0). Roadmap: multi-tenant architecture (Q1 2027).

---

## 11. Contato e Suporte

**Repositório:** [GitHub — Atlas](https://github.com/seu-user/atlas)

**Issues / Bug Reports:** GitHub Issues

**Contribuições:** PRs bem-vindas! Veja [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Documento PRD v2.0 — Jun 2026**
*Mantido por: Equipe Atlas*
