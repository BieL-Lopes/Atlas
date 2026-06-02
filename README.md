
# POLITIQUI

Sistema de captação e gestão eleitoral para campanhas brasileiras — Progressive Web App com suporte offline-first, sincronização com Supabase, notificações push e controle de acesso por papel (RBAC).

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Tecnologias](#2-tecnologias)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Configuração do Ambiente](#4-configuração-do-ambiente)
5. [Banco de Dados (Supabase)](#5-banco-de-dados-supabase)
6. [Rodando o Projeto](#6-rodando-o-projeto)
7. [Usuários de Demonstração](#7-usuários-de-demonstração)
8. [Controle de Acesso (RBAC)](#8-controle-de-acesso-rbac)
9. [Funcionalidades Implementadas](#9-funcionalidades-implementadas)
10. [Testes Automatizados](#10-testes-automatizados)
11. [QA Manual — Android PWA](#11-qa-manual--android-pwa)

---

## 1. Visão Geral

O Politiqui permite que equipes de campanha cadastrem e gerenciem eleitores diretamente pelo celular, mesmo sem conexão à internet. Os dados são salvos localmente via IndexedDB e sincronizados automaticamente com o Supabase quando a conexão é restabelecida.

**Fluxo resumido:**

```
Captador → Cadastra eleitor → Salvo no IndexedDB (offline)
                                   ↓ ao voltar online
                              Sync com Supabase
                                   ↓
Coordenador / Liderança → Vê dados agregados em tempo real
                                   ↓
Liderança → Envia comunicado → Push notification para equipe
```

---

## 2. Tecnologias

| Camada | Biblioteca |
|---|---|
| UI | React 18 + TypeScript + shadcn/ui + Tailwind CSS v4 |
| Build | Vite 6 + @vitejs/plugin-react |
| PWA | vite-plugin-pwa (injectManifest — service worker customizado) |
| Offline storage | Dexie 4 (IndexedDB) |
| Backend | Supabase (PostgreSQL + Auth + RLS + Realtime + Edge Functions) |
| Mapas | react-leaflet v4 + leaflet v1.9 |
| Gráficos | Recharts |
| QR Code | qrcode.react (gerar) + html5-qrcode (ler câmera) |
| Notificações | Web Push API + Supabase Edge Function `send-push` |
| Testes unitários | Vitest 4 + jsdom + @testing-library/react |
| Testes E2E | Playwright |

---

## 3. Estrutura do Projeto

```
politiqui/
├── e2e/                        # Testes E2E Playwright
│   └── captador-flow.spec.ts
├── supabase/
│   ├── schema.sql              # Schema completo — rodar no SQL Editor do Supabase
│   └── seed.sql                # 7 usuários de demo
├── src/
│   ├── sw.ts                   # Service Worker customizado (push + notificationclick)
│   ├── app/
│   │   ├── components/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── HomeScreen.tsx          # Home com agenda real + Top 3 regiões reais
│   │   │   ├── ElectorHomeScreen.tsx   # Tela exclusiva do eleitor
│   │   │   ├── CaptureForm.tsx         # Cadastro / edição de eleitor
│   │   │   ├── ContactList.tsx         # Lista + score filter + exportação CSV/PDF
│   │   │   ├── ElectorProfile.tsx      # Perfil + QR Code + score de engajamento
│   │   │   ├── QrScannerModal.tsx      # Leitura de QR via câmera
│   │   │   ├── CoordinationScreen.tsx  # Coordenação + heatmap + comparativo
│   │   │   ├── AdminScreen.tsx         # Dashboard Liderança + heatmap + alertas IA
│   │   │   ├── HeatmapScreen.tsx       # Mapa de calor eleitoral (Leaflet)
│   │   │   ├── InsightsPanel.tsx       # Painel de alertas inteligentes (IA)
│   │   │   ├── WhatsAppModal.tsx       # Modal de disparos via WhatsApp (Evolution API)
│   │   │   ├── AgendaScreen.tsx        # Agenda integrada ao Supabase
│   │   │   ├── PollsScreen.tsx         # Enquetes integradas ao Supabase
│   │   │   ├── CaptadorResultsScreen.tsx # Resultados e ranking do captador
│   │   │   ├── CheckinMapScreen.tsx    # Mapa de check-ins e rotas
│   │   │   ├── ComunicadoModal.tsx     # Modal de envio de comunicado
│   │   │   └── BottomNav.tsx           # Navegação filtrada por papel
│   │   └── lib/
│   │       ├── auth.ts             # authenticate() + signOut() via Supabase
│   │       ├── rbac.ts             # Papéis, permissões, canAccessTab()
│   │       ├── db.ts               # Dexie (electors + pendingChanges)
│   │       ├── syncService.ts      # Push/pull bidirecional Dexie ↔ Supabase
│   │       ├── useSync.ts          # Hook: isOnline, pendingCount, syncedAt
│   │       ├── supabase.ts         # Cliente Supabase singleton
│   │       ├── score.ts            # Score de engajamento eleitoral (0–100)
│   │       ├── insights.ts         # Motor de alertas inteligentes (IA de campanha)
│   │       ├── gamification.ts     # Ranking, medalhas e streak do captador
│   │       └── __tests__/
│   │           ├── rbac.test.ts
│   │           └── syncService.test.ts
│   └── test/
│       └── setup.ts               # @testing-library/jest-dom
├── .env                           # Variáveis de ambiente (não comitar)
├── playwright.config.ts
├── vite.config.ts
└── package.json
```

---

## 4. Configuração do Ambiente

### Pré-requisitos

- Node.js 20+
- npm 10+
- Conta Supabase (gratuita)

### Instalação

```bash
git clone <repo>
cd politiqui
npm install
```

### Variáveis de ambiente

Crie o arquivo `.env` na raiz (nunca comitar):

```env
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<sua-chave>
VITE_VAPID_PUBLIC_KEY=<sua-chave-vapid-publica>
```

As chaves ficam em **Supabase → Project Settings → API**.  
A chave VAPID é gerada uma vez com `npx web-push generate-vapid-keys`.

---

## 5. Banco de Dados (Supabase)

### Aplicar o schema

1. Acesse o [Supabase SQL Editor](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Abra `supabase/schema.sql` e execute **todo o conteúdo**

O schema cria:

- `public.perfis` — perfis de usuário (sincronizado com `auth.users`)
- `public.eleitores` — eleitores cadastrados com GPS e nível de voto
- `public.agenda_itens` — itens de agenda pessoal por usuário
- `public.eventos` — eventos da campanha
- `public.evento_confirmacoes` — confirmações de presença em eventos
- `public.enquetes` — enquetes com opções
- `public.enquete_votos` — votos por usuário/enquete
- `public.comunicados` — comunicados com Realtime habilitado
- `public.push_subscriptions` — assinaturas Web Push por usuário
- Funções SECURITY DEFINER:
  - `get_email_by_cpf(cpf_input)` — busca e-mail pelo CPF para login
  - `get_my_role()` — retorna papel do usuário autenticado
  - `is_coord_regional_of(captador_id)` — verifica hierarquia de coordenação
- Triggers: criação automática de perfil + `atualizado_em`
- Políticas RLS por papel

### Popular usuários de demo

Após o schema, execute `supabase/seed.sql` no mesmo SQL Editor.

> **Importante:** Execute o `schema.sql` antes do `seed.sql`.

### Habilitar Realtime para comunicados

No Supabase Dashboard → **Database → Replication**, habilite `public.comunicados` na publicação `supabase_realtime`. O schema já inclui o comando SQL, mas confirme no painel.

### Edge Function para notificações push

```bash
# Deploy da função (requer Supabase CLI)
supabase functions deploy send-push

# Configurar variáveis da função
supabase secrets set VAPID_PUBLIC_KEY=<chave-publica>
supabase secrets set VAPID_PRIVATE_KEY=<chave-privada>
supabase secrets set VAPID_SUBJECT=mailto:contato@politiqui.com
```

---

## 6. Rodando o Projeto

### Desenvolvimento

```bash
npm run dev
# App disponível em http://localhost:5173
```

### Build de produção

```bash
npm run build
# Saída em dist/ — inclui service worker PWA
```

### Preview do build

```bash
npx serve dist
# Serve o build em http://localhost:3000
```

---

## 7. Usuários de Demonstração

Criados pelo `seed.sql`. Senha de todos: **`1234`**

| E-mail | CPF (login alternativo) | Papel |
|---|---|---|
| `victor@politiqui.com` | `000.000.000-01` | Liderança |
| `ana@politiqui.com` | `000.000.000-02` | Coordenador Geral |
| `carlos@politiqui.com` | `000.000.000-03` | Coordenador Regional |
| `fernanda@politiqui.com` | `000.000.000-04` | Coordenador Regional |
| `rafael@politiqui.com` | `000.000.000-05` | Captador de Votos |
| `juliana@politiqui.com` | `000.000.000-06` | Captador de Votos |
| `marcos@politiqui.com` | `000.000.000-07` | Eleitor |

> O login aceita tanto o **e-mail** quanto o **CPF** (com ou sem formatação).

---

## 8. Controle de Acesso (RBAC)

| Papel | Home | Contatos | Agenda | Enquetes | Coordenação | Admin | Resultados |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Liderança | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Coord. Geral | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Coord. Regional | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Captador | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Eleitor | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

Permissões adicionais (`rbac.ts`): `canCreateElector`, `canDeleteElector`, `canExport`, `canManagePolls`, `canViewReports`, `canManageUsers`.

---

## 9. Funcionalidades Implementadas

### Autenticação
- Login com e-mail ou CPF (com máscara automática)
- Lookup de e-mail por CPF via RPC Supabase (`get_email_by_cpf`)
- Sessão persistida no `localStorage` com validação de sessão ativa no Supabase
- Pull imediato de dados do servidor após login (sem refresh manual)

### Cadastro de Eleitores
- Formulário completo: nome, WhatsApp, e-mail, título eleitoral (12 dígitos), data de nascimento, endereço, nível de voto, engajamento, nichos, GPS, aceite de WhatsApp, observações
- Modo criação e modo edição (reaproveita o mesmo formulário)
- Escaneamento do título eleitoral por QR Code (câmera)
- GPS capturado automaticamente via `navigator.geolocation` em background após salvar

### Perfil do Eleitor
- Exibe todos os dados + atendimentos
- Gera QR Code do título para consulta rápida
- **Score de engajamento** (0–100) com barra de progresso colorida

### Score Eleitoral Automático (`score.ts`)
- Fórmula: nível de voto + engajamento + atendimentos + nichos + WhatsApp + observações
- Tiers: **Alto** (≥65) / **Médio** (35–64) / **Baixo** (<35)
- Exibido na lista de contatos (badge colorido) e no perfil
- Filtro por faixa de score na lista de contatos (Todos / Alto / Médio / Baixo)
- Score médio da equipe exibido na barra de estatísticas

### IA de Campanha — Alertas Inteligentes (`insights.ts` + `InsightsPanel.tsx`)
- Motor de análise 100% client-side, sem chamadas externas
- **6 tipos de alerta** gerados automaticamente:
  - Captador sem atividade ≥3 dias (⚠️) ou ≥7 dias (🚨)
  - Queda de cadastros por bairro (últimos 7d vs semana anterior, mín. 30%)
  - Tendência geral da semana: crescimento ou queda >20%
  - Oportunidade: bairro com ≥30% de eleitores indecisos
  - Alta concentração de oposição ≥25% em um bairro
  - Captador destaque da semana (≥3 cadastros, mais produtivo)
- **Score de risco por região**: ponderação de fracos (0.5×), indecisos (0.3×) e oposição (1.0×) → 0–100
- **Redistribuição sugerida**: captadores inativos 5+ dias redirecionados à região com mais indecisos
- Aba **Alertas** no AdminScreen (Liderança e Coord. Geral) com resumo Críticos / Atenção / Positivos

### Heatmap Eleitoral (`HeatmapScreen.tsx`)
- Mapa interativo (Leaflet) com eleitores como círculos coloridos por nível de voto
- Verde = forte · Amarelo = médio · Vermelho = fraco · Cinza = indeciso · Roxo = oposição
- Filtros: por captador, por período, por nível de voto
- Popup com nome, bairro e nível ao clicar no marcador
- Disponível para **Liderança** (aba Admin → Mapa) e **Coord. Geral** (aba Coordenação → Heatmap)

### Gamificação do Captador
- Ranking de captadores por produção
- Medalhas por marcos (1, 10, 50 cadastros…)
- Streak diária e barra de meta diária na home
- Tela "Meus Resultados" com histórico e posição no ranking

### Check-in e Rota
- Check-in automático via GPS ao registrar eleitor
- Mapa de rota do captador com pontos de visita
- Coordenador vê cobertura geográfica da equipe

### Comunicados & Notificações Push
- Liderança e Coord. Geral enviam comunicados pelo app
- Realtime via Supabase WebSocket: novos comunicados aparecem instantaneamente sem refresh

### Automação via WhatsApp (Evolution API)
- Disparos segmentados para eleitores com `aceitaWhatsapp = true` — filtro não removível (compliance legal)
- Filtros de segmentação: nível de voto (forte/médio/fraco/indeciso), bairro, região
- **4 templates** pré-definidos: Livre, Evento, Mobilização, Confirmação de presença
- Fluxo guiado: compose → confirm → sending → done
- Edge Function `send-whatsapp` com rate limiting de 500ms entre envios (Deno, Evolution API REST)
- Log completo na tabela `disparos_whatsapp`: status, contadores enviados/falhas, remetente
- Aba **WhatsApp** no AdminScreen com histórico e card de setup quando API não configurada
- Configuração: `VITE_WHATSAPP_CONFIGURED=true` + secrets `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` no Supabase
- Notificação push quando app está em segundo plano (Web Push API + Edge Function)
- Clique na notificação navega automaticamente para a tela de comunicados

### Coordenação
- **Coord. Regional**: vê só os captadores da sua equipe e seus eleitores
- **Coord. Geral**: drill-down por deputado → coordenador → captador
- Comparativo entre regiões: tabela com trófeu 🏆 na métrica vencedora
- Filtro por período: Hoje / 7 dias / 30 dias / Tudo
- Score médio da região com barra de progresso

### Dashboard Admin (Liderança)
- Gráficos Recharts: distribuição por nível de voto, nicho, evolução diária, por região
- Projeção de votos: `forte×1.0 + médio×0.6 + indeciso×0.2`
- Exportação CSV/PDF da lista completa

### Home Screen (dados reais)
- Top 3 bairros calculados dos eleitores reais
- Contagem "+X esta semana" baseada em datas reais
- Agenda do dia buscada do Supabase (`agenda_itens` com `data = hoje`)
- Comunicados recebidos com Realtime

### Offline-first
- IndexedDB via Dexie (tabelas `electors` + `pendingChanges`)
- Fila de sincronização: operações create/update/delete enfileiradas offline
- Flush automático ao voltar online (last-write-wins por eleitor)
- Banner visual de status offline + badge de pendentes

### PWA
- Instalável no Android/iOS (manifest + service worker customizado)
- Funciona 100% sem internet após primeiro carregamento

---

## 10. Testes Automatizados

### Testes Unitários — Vitest

```bash
npm run test           # Rodar uma vez
npm run test:watch     # Modo watch
npm run test:coverage  # Com cobertura
```

**30 testes / 2 arquivos:**

`rbac.test.ts` — 15 testes: `ROLE_LABELS`, `canAccessTab()`, `getAllowedTabs()`, `getPermissions()`  
`syncService.test.ts` — 15 testes: `toRow()`, `fromRow()`, round-trip de conversão

### Testes E2E — Playwright

```bash
npx playwright install chromium  # Primeira vez
npm run test:e2e                  # Rodar testes
npx playwright show-report        # Relatório HTML
```

| # | Cenário |
|---|---|
| 1 | Tela de login é exibida ao abrir o app |
| 2 | Credenciais erradas exibem mensagem de erro |
| 3 | Captador faz login com e-mail e acessa Home |
| 4 | Tab "Admin" não está visível para captador |
| 5 | Formulário de cadastro de eleitor é acessível |
| 6 | Eleitor é cadastrado e aparece na lista |
| 7 | Cadastro offline funciona e gera pendência |

---

## 11. QA Manual — Android PWA

```bash
npm run build
npx serve dist -l 3000
# Acesse http://<IP-local>:3000 no celular (mesma rede Wi-Fi)
```

**Checklist:**

- [x] **Instalação:** Chrome exibe "Adicionar à tela inicial" → ícone aparece na home
- [x] **Login por CPF:** `00000000005`, senha `1234` → login bem-sucedido
- [x] **Login por e-mail:** `rafael@politiqui.com`, senha `1234` → login bem-sucedido
- [x] **Cadastro de eleitor:** preencher todos os campos → salvar → aparece na lista
- [x] **Escaneamento QR:** abre câmera → lê QR → preenche título
- [x] **Modo avião:** cadastrar → badge de pendentes aparece
- [x] **Sync:** desativar modo avião → badge some → eleitor visível no Supabase Dashboard
- [x] **Permissões de papel:** logar como eleitor → aba Contatos não aparece
- [x] **Offline total:** fechar app → modo avião → reabrir → dados exibidos
- [ ] **Push notification:** enviar comunicado → notificação chega no dispositivo bloqueado
- [ ] **Heatmap:** logar como Liderança → Admin → Mapa → marcadores visíveis no mapa
- [ ] **Alertas IA:** Admin → Alertas → painel exibe cards com insights e score de risco por região

---

*Última atualização: Jun/2026*

---

## 1. Visão Geral

O Politiqui permite que equipes de campanha cadastrem e gerenciem eleitores diretamente pelo celular, mesmo sem conexão à internet. Os dados são salvos localmente via IndexedDB e sincronizados automaticamente com o Supabase quando a conexão é restabelecida.

**Fluxo resumido:**

```
Captador → Cadastra eleitor → Salvo no IndexedDB (offline)
                                   ↓ ao voltar online
                              Sync com Supabase
                                   ↓
Coordenador / Liderança → Vê dados agregados em tempo real
```

---

## 2. Tecnologias

| Camada | Biblioteca |
|---|---|
| UI | React 18 + TypeScript + shadcn/ui + Tailwind CSS v4 |
| Build | Vite 6 + @vitejs/plugin-react |
| PWA | vite-plugin-pwa (Workbox service worker) |
| Offline storage | Dexie 4 (IndexedDB) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Gráficos | Recharts |
| QR Code | qrcode.react (gerar) + html5-qrcode (ler câmera) |
| Testes unitários | Vitest 4 + jsdom + @testing-library/react |
| Testes E2E | Playwright |

---

## 3. Estrutura do Projeto

```
politiqui/
├── e2e/                        # Testes E2E Playwright
│   └── captador-flow.spec.ts
├── supabase/
│   ├── schema.sql              # Schema completo — rodar no SQL Editor do Supabase
│   └── seed.sql                # 7 usuários de demo
├── src/
│   ├── app/
│   │   ├── components/         # Telas e componentes
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── CaptureForm.tsx     # Cadastro / edição de eleitor
│   │   │   ├── ContactList.tsx     # Lista + exportação CSV/PDF
│   │   │   ├── ElectorProfile.tsx  # Perfil + QR Code do título
│   │   │   ├── QrScannerModal.tsx  # Leitura de QR via câmera
│   │   │   ├── CoordinationScreen.tsx
│   │   │   ├── AdminScreen.tsx     # Dashboard Liderança (recharts)
│   │   │   ├── AgendaScreen.tsx
│   │   │   ├── PollsScreen.tsx
│   │   │   └── BottomNav.tsx       # Navegação filtrada por papel
│   │   └── lib/
│   │       ├── auth.ts             # authenticate() + signOut() via Supabase
│   │       ├── rbac.ts             # Papéis, permissões, canAccessTab()
│   │       ├── db.ts               # Dexie (electors + pendingChanges)
│   │       ├── syncService.ts      # Push/pull bidirecional Dexie ↔ Supabase
│   │       ├── useSync.ts          # Hook: isOnline, pendingCount, syncedAt
│   │       ├── supabase.ts         # Cliente Supabase singleton
│   │       └── __tests__/
│   │           ├── rbac.test.ts
│   │           └── syncService.test.ts
│   └── test/
│       └── setup.ts               # @testing-library/jest-dom
├── .env                           # Variáveis de ambiente (não comitar)
├── playwright.config.ts
├── vite.config.ts
└── package.json
```

---

## 4. Configuração do Ambiente

### Pré-requisitos

- Node.js 20+
- npm 10+
- Conta Supabase (gratuita)

### Instalação

```bash
git clone <repo>
cd politiqui
npm install
```

### Variáveis de ambiente

Crie o arquivo `.env` na raiz (nunca comitar):

```env
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<sua-chave>
```

As chaves ficam em **Supabase → Project Settings → API**.

---

## 5. Banco de Dados (Supabase)

### Aplicar o schema

1. Acesse o [Supabase SQL Editor](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Abra `supabase/schema.sql` e execute **todo o conteúdo**

O schema cria:

- `public.perfis` — perfis de usuário (sincronizado com `auth.users`)
- `public.eleitores` — eleitores cadastrados
- Funções SECURITY DEFINER:
  - `get_email_by_cpf(cpf_input)` — busca e-mail pelo CPF para login
  - `get_my_role()` — retorna papel do usuário autenticado
  - `is_coord_regional_of(captador_id)` — verifica hierarquia de coordenação
- Triggers: criação automática de perfil + `atualizado_em`
- Políticas RLS por papel

### Popular usuários de demo

Após o schema, execute `supabase/seed.sql` no mesmo SQL Editor.  
Isso insere 7 usuários de demonstração (ver seção 7).

> **Importante:** Execute o `schema.sql` antes do `seed.sql`.

---

## 6. Rodando o Projeto

### Desenvolvimento

```bash
npm run dev
# App disponível em http://localhost:5173
```

### Build de produção

```bash
npm run build
# Saída em dist/ — inclui service worker PWA
```

### Preview do build

```bash
npx serve dist
# Serve o build em http://localhost:3000
```

---

## 7. Usuários de Demonstração

Criados pelo `seed.sql`. Senha de todos: **`1234`**

| E-mail | CPF (login alternativo) | Papel |
|---|---|---|
| `victor@politiqui.com` | `000.000.000-01` | Liderança |
| `ana@politiqui.com` | `000.000.000-02` | Coordenador Geral |
| `carlos@politiqui.com` | `000.000.000-03` | Coordenador Regional |
| `fernanda@politiqui.com` | `000.000.000-04` | Coordenador Regional |
| `rafael@politiqui.com` | `000.000.000-05` | Captador de Votos |
| `juliana@politiqui.com` | `000.000.000-06` | Captador de Votos |
| `marcos@politiqui.com` | `000.000.000-07` | Eleitor |

> O login aceita tanto o **e-mail** quanto o **CPF** (com ou sem formatação).

---

## 8. Controle de Acesso (RBAC)

| Papel | Home | Contatos | Agenda | Enquetes | Coordenação | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Liderança | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Coord. Geral | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Coord. Regional | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Captador | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Eleitor | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

Permissões adicionais (`rbac.ts`): `canCreateElector`, `canDeleteElector`, `canExport`, `canManagePolls`, `canViewReports`, `canManageUsers`.

---

## 9. Funcionalidades Implementadas

### Autenticação
- Login com e-mail ou CPF (com máscara automática)
- Lookup de e-mail por CPF via RPC Supabase (`get_email_by_cpf`)
- Sessão persistida no `localStorage`

### Cadastro de Eleitores
- Formulário completo: nome, WhatsApp, e-mail, título eleitoral (12 dígitos), data de nascimento, endereço, nível de voto, engajamento, nichos, GPS, aceite de WhatsApp, observações
- Modo criação e modo edição (reaproveita o mesmo formulário)
- Escaneamento do título eleitoral por QR Code (câmera)
- GPS capturado automaticamente via `navigator.geolocation`

### Perfil do Eleitor
- Exibe todos os dados + atendimentos
- Gera QR Code do título para consulta rápida

### Coordenação
- **Coord. Regional**: vê só os captadores da sua equipe e seus eleitores
- **Coord. Geral**: drill-down por deputado → coordenador → captador
- KPIs por captador: total de eleitores, novos esta semana

### Dashboard Admin (Liderança)
- Gráficos Recharts: distribuição por nível de voto, por nicho, evolução diária de cadastros, por região
- Exportação CSV/PDF da lista completa

### Offline-first
- IndexedDB via Dexie (tabelas `electors` + `pendingChanges`)
- Fila de sincronização: operações create/update/delete enfileiradas offline
- Flush automático ao voltar online (last-write-wins por eleitor)
- Banner visual de status offline + badge de pendentes

### PWA
- Instalável no Android/iOS (manifest + service worker Workbox)
- Funciona 100% sem internet após primeiro carregamento

---

## 10. Testes Automatizados

### Testes Unitários — Vitest

```bash
# Rodar uma vez
npm run test

# Modo watch (re-executa ao salvar)
npm run test:watch

# Com relatório de cobertura
npm run test:coverage
```

**O que é testado (30 testes / 2 arquivos):**

`src/app/lib/__tests__/rbac.test.ts` — 15 testes:
- `ROLE_LABELS` cobre os 5 papéis
- `canAccessTab()` — acesso correto por papel, fallback `undefined → eleitor`
- `getAllowedTabs()` — quantidade e conteúdo por papel
- `getPermissions()` — flags de permissão por papel (liderança, captador, eleitor, undefined)

`src/app/lib/__tests__/syncService.test.ts` — 15 testes:
- `toRow()` — conversão camelCase → snake_case, nulos para campos opcionais
- `fromRow()` — conversão snake_case → camelCase, fallbacks para campos ausentes
- Round-trip `toRow → fromRow` preserva dados essenciais

### Testes E2E — Playwright

**Pré-requisito:** instalar os browsers do Playwright (primeira vez):

```bash
npx playwright install chromium
```

**Rodar os testes E2E:**

```bash
# Sobe o servidor de dev automaticamente e roda os testes
npm run test:e2e

# Ver resultado em HTML interativo
npx playwright show-report
```

**O que é testado (`e2e/captador-flow.spec.ts` — 6 cenários):**

| # | Cenário |
|---|---|
| 1 | Tela de login é exibida ao abrir o app |
| 2 | Credenciais erradas exibem mensagem de erro |
| 3 | Captador faz login com e-mail e acessa Home |
| 4 | Tab "Admin" não está visível para captador |
| 5 | Formulário de cadastro de eleitor é acessível |
| 6 | Eleitor é cadastrado e aparece na lista |
| 7 | Cadastro offline funciona e gera pendência |

> Os testes E2E precisam de um Supabase configurado e acessível (`.env` preenchido).  
> Para rodar no CI sem Supabase, mocke as chamadas de rede com `page.route()`.

---

## 11. QA Manual — Android PWA

Execute após `npm run build`:

```bash
npx serve dist -l 3000
```

Acesse `http://<IP-local>:3000` no celular (mesma rede Wi-Fi).

**Checklist:**

- [X] **Instalação:** Chrome exibe banner "Adicionar à tela inicial" → ícone aparece na home
- [ ] **Splash screen:** abre com tela de carregamento estilizada
- [X] **Login por CPF:** digitar `00000000005`, senha `1234` → login bem-sucedido
- [X] **Login por e-mail:** digitar `rafael@politiqui.com`, senha `1234` → login bem-sucedido
- [X] **Cadastro de eleitor:** preencher todos os campos → salvar → aparece na lista
- [X] **Escaneamento QR:** abre câmera → lê QR de outro dispositivo → preenche título
- [X] **Modo avião:** ativar no celular → cadastrar eleitor → badge de pendentes aparece
- [X] **Sync:** desativar modo avião → badge some → eleitor visível no Supabase Dashboard
- [X] **Permissões de papel:** logar como `marcos@politiqui.com` (Eleitor) → aba Contatos não aparece
- [X] **Offline total:** fechar app → modo avião → reabrir → dados anteriores exibidos
- [ ] **Push notification:** enviar comunicado → notificação chega no dispositivo bloqueado
- [ ] **Heatmap:** logar como Liderança → Admin → Mapa → marcadores visíveis no mapa
- [ ] **Alertas IA:** Admin → Alertas → painel exibe cards com insights e score de risco por região
