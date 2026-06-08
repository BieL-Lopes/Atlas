# Plano de Ação — Atlas

> App de gestão eleitoral com 5 perfis: **Liderança**, **Coordenador Geral**, **Coordenador Regional**, **Captador** e **Eleitor**.

---

## Legenda

| Ícone | Significado |
|-------|-------------|
| ✅ | Concluído e funcionando |
| 🔲 | Pendente — ainda não feito |
| ⭐ | Feature premium (diferencial competitivo) |

---

## Resumo do Estado Atual

| Área | Status |
|------|--------|
| Cadastro de eleitores | ✅ |
| Perfis e permissões (RBAC) | ✅ |
| Login com CPF/e-mail + máscara | ✅ |
| QR Code (gerar + escanear) | ✅ |
| Dashboard de Liderança com gráficos | ✅ |
| Coordenação com drill-down por captador | ✅ |
| Exportação CSV/PDF | ✅ |
| Offline-first (Dexie + PWA + fila de sync) | ✅ |
| Backend Supabase + autenticação real | ✅ |
| Sincronização bidirecional com conflitos | ✅ |
| Testes unitários (30 testes Vitest) | ✅ |
| Testes E2E (Playwright) | ✅ |
| QA manual em dispositivo Android | 🔲 |
| Classificação de apoio no cadastro (forte/médio/fraco/indeciso/oposição) | ✅ |
| Projeção de votos no dashboard da Liderança | ✅ |
| Tela de perfil do Eleitor (QR, enquetes, eventos) | ✅ |
| AgendaScreen integrada ao Supabase (CRUD real) | ✅ |
| PollsScreen integrada ao Supabase (criar/encerrar/reabrir) | ✅ |
| Sistema de comunicados (liderança → coordenadores) | ✅ |
| Gamificação do captador (ranking, medalhas, streak) | 🔲 ⭐ |
| Comparativo entre regiões | ✅ |
| Rota e check-in dos captadores | 🔲 ⭐ |
| Score eleitoral automático por eleitor | ✅ |
| Mapa / heatmap eleitoral | ✅ |
| IA de campanha (alertas inteligentes) | 🔲 ⭐ |
| Automação via WhatsApp | ✅ ⭐ |

---

## Plano de Ação (do mais fácil ao mais complexo)

---

### Fase 1 — Ajustes Rápidos ✅ CONCLUÍDO

> Correções simples de bugs e exibição de dados.

- [x] Corrigir bug de persistência — salvar lista mesmo quando vazia
- [x] Exibir título de eleitor no perfil (`ElectorProfile.tsx`)
- [x] Validar título eleitoral (12 dígitos) antes de salvar
- [x] Remover referências antigas a "Apoiador" → usar "Cabo Eleitoral"

---

### Fase 2 — Modelo de Dados ✅ CONCLUÍDO

> Estruturar os dados para suportar múltiplos perfis e regiões.

- [x] Adicionar campos `createdBy`, `createdByName` e `regiao` em cada eleitor
- [x] Criar entidade `User` real com id, nome, papel, região e deputadoId
- [x] Permitir edição de eleitor (reutilizar `CaptureForm` em modo edição)

---

### Fase 3 — Exportação ✅ CONCLUÍDO

> Permitir que coordenadores e liderança exportem dados.

- [x] Botão de exportar CSV nas telas Admin e Coordenação
- [x] Restringir exportação por papel (só quem tem `canExport`)

---

### Fase 4 — Coordenação Real ✅ CONCLUÍDO

> Dar ao coordenador visibilidade real sobre a equipe.

- [x] Coordenador Regional vê lista dos seus captadores com KPIs reais (visitas, cadastros, conversão)
- [x] Coordenador Geral vê drill-down: coordenador regional → captador → eleitor
- [x] Dashboard da Liderança com gráficos reais: por região, por nível de voto, por nicho, evolução por dia

---

### Fase 5 — QR Code ✅ CONCLUÍDO

> Agilizar o cadastro físico de eleitores em campo.

- [x] Gerar QR Code no perfil do eleitor (codifica o título eleitoral)
- [x] Escanear QR Code ao cadastrar — preenche o campo automaticamente
- [x] Tratar permissão de câmera e debounce para evitar leitura dupla

---

### Fase 6 — Offline-first ✅ CONCLUÍDO

> App funcional sem internet — essencial para uso em campo.

- [x] Migrar armazenamento de `localStorage` para IndexedDB via Dexie
- [x] Transformar em PWA: manifest, ícones e service worker (`vite-plugin-pwa`)
- [x] Fila de sincronização: registra alterações pendentes e envia ao voltar online
- [x] Banner visual de status online/offline com contador de itens pendentes

---

### Fase 7 — Backend + Sincronização ✅ CONCLUÍDO

> Conectar o app a um servidor real para persistência multi-dispositivo.

- [x] Banco de dados Supabase com tabelas `profiles` e `electors` + triggers de `updated_at`
- [x] Autenticação real — CPF vira email virtual `{digits}@cpf.atlas`, fallback para mock
- [x] Sincronização bidirecional — push (last-write-wins por `entityId`) + pull (diff desde `lastSyncAt`)
- [x] Permissões no servidor (RLS Supabase) espelhando o RBAC do cliente

---

### Fase 8 — Qualidade ✅ Parcialmente concluído

> Garantir que o app não quebre e funcione bem em dispositivos reais.

- [x] Testes unitários de `rbac.ts` e `syncService.ts` (Vitest — 30 testes)
- [x] Testes E2E do fluxo captador: cadastro offline → sync (Playwright)
- [ ] **QA manual em dispositivo Android** — instalar o PWA e executar o checklist abaixo:
  - [ ] Cadastrar eleitor com câmera (QR Code)
  - [ ] Colocar em modo avião → cadastrar → voltar online → verificar sync
  - [ ] Instalar como PWA na tela inicial
  - [ ] Testar login CPF e login e-mail
  - [ ] Verificar todos os papéis (liderança, coord. geral, coord. regional, captador)

---

### Fase 9 — Features Pendentes (do mais fácil ao mais complexo) ⭐

> Funcionalidades que ainda faltam, ordenadas pela dificuldade de implementação.

---

#### 9.1 — Completar Classificação de Apoio no Cadastro ✅ CONCLUÍDO

> O campo `nivelVoto` agora suporta `forte / médio / fraco / indeciso / oposição`.

- [x] Adicionado `indeciso` e `oposição` como opções no `CaptureForm.tsx`
- [x] Tipo TypeScript e banco Supabase atualizados para aceitar os novos valores
- [x] `indeciso` (cinza) e `oposição` (roxo) exibidos com cores distintas nos gráficos do dashboard

---

#### 9.2 — Projeção de Votos no Dashboard da Liderança ✅ CONCLUÍDO

> Card de destaque azul no topo do dashboard + gráfico de linha com evolução cumulativa nos últimos 30 dias.

- [x] Fórmula: `forte × 1.0 + médio × 0.6 + indeciso × 0.2` = projeção de votos
- [x] Card de destaque no topo do `AdminScreen.tsx` com total e percentual sobre cadastros
- [x] Gráfico de linha com evolução cumulativa da projeção nos últimos 30 dias

---

#### 9.3 — Comparativo entre Regiões ✅ CONCLUÍDO

> Nova aba "Comparar" dentro da tela de Coordenação — acessível para Liderança e Coordenador Geral.

- [x] Seletor de Região A e Região B com dropdowns
- [x] Cards de destaque com projeção de votos para cada região
- [x] Tabela comparativa: cadastros, votos fortes, projeção, conversão, indeciso, oposição, última atividade
- [x] Trófeu 🏆 na métrica vencedora de cada linha
- [x] Filtro por período: Hoje / 7 dias / 30 dias / Tudo

---

#### 9.4 — Tela de Perfil do Eleitor (Interface do Eleitor) ✅ CONCLUÍDO
**Complexidade: Baixa-Média** — nova tela com QR, enquetes e eventos.

> Quando role === 'eleitor', o app renderiza `ElectorHomeScreen` em vez da `HomeScreen` genérica.

- [x] Header com saudação, região e botão de logout
- [x] QR pessoal expansível (codifica o user.id para check-in em eventos)
- [x] Próximos eventos com botão "Confirmar presença" (toggle visual + toast)
- [x] Enquetes ativas com votação em tap (grades 2 colunas + feedback visual)
- [x] Botão "Fale com a Equipe" — link direto para WhatsApp da campanha
- [x] Dados reais via Supabase: `eventos`, `enquetes`, `evento_confirmacoes`, `enquete_votos`

---

#### 9.4.1 — AgendaScreen + PollsScreen → Supabase ✅ CONCLUÍDO
**Complexidade: Média** — mocks removidos, integração real com banco.

> AgendaScreen e PollsScreen reescritas com `useEffect` + Supabase. Todos os mocks removidos.

- [x] `AgendaScreen`: busca `agenda_itens` por `criado_por`, formulário controlado, CRUD completo (criar / excluir)
- [x] `PollsScreen`: busca `enquetes` + contagem de votos em paralelo, criar/encerrar/reabrir enquetes
- [x] 5 novas tabelas em `supabase/schema.sql` com RLS: `agenda_itens`, `eventos`, `evento_confirmacoes`, `enquetes`, `enquete_votos`

---

#### 9.5 — Sistema de Comunicados ✅
**Complexidade: Média** — envio de mensagens dentro do app entre perfis.

> Citado como botão obrigatório na tela de Liderança e de Coordenação.

- [x] Botão "Enviar comunicado" na `AdminScreen` (Liderança → todos)
- [x] Botão "Enviar comunicado" na `CoordinationScreen` (Coord. Geral → coord. regionais)
- [x] Histórico de comunicados recebidos na home de cada perfil
- [x] Notificação push via PWA quando o app estiver em segundo plano

---

#### 9.6 — Gamificação do Captador ✅
**Complexidade: Média** — sistema de pontos e recompensas para engajar captadores.

> Citado como diferencial de produtividade — aumenta muito o volume de cadastros.

- [x] Ranking de captadores por produção (visível para todos da equipe)
- [x] Medalhas por marcos: primeiro cadastro, 10 cadastros, 50 cadastros, etc.
- [x] Streak diária: manter sequência de dias com cadastros
- [x] Barra de progresso de meta diária na home do captador
- [x] Tela "Meus Resultados" com histórico pessoal e posição no ranking

---

#### 9.7 — Check-in e Rota dos Captadores ✅
**Complexidade: Média** — geolocalização e mapa no app.

- [x] Captador faz check-in automático (geolocalização) ao registrar um eleitor
- [x] Coordenador Regional vê mapa com pontos onde cada captador esteve
- [x] Registrar regiões atendidas por dia
- [x] Histórico de trajeto por captador

---

#### 9.8 — Heatmap Eleitoral ✅ ⭐
**Complexidade: Média-Alta** — mapa visual com camadas de dados eleitorais.

- [x] Mapa mostrando bairros por densidade de eleitores cadastrados
- [x] Cor por força: verde (forte), amarelo (médio), vermelho (fraco/abandonado)
- [x] Filtro por coordenador, por captador ou por período
- [x] Disponível para Liderança e Coordenador Geral

---

#### 9.9 — Score Eleitoral Automático por Eleitor ✅ ⭐
**Complexidade: Alta** — algoritmo de pontuação por comportamento do eleitor.

> Citado como “ouro” no documento de requisitos — transforma o app em CRM político.

- [x] Calcular score com base em: nível de voto, engajamento, atendimentos registrados, nichos, WhatsApp, observações
- [x] Exibir score no perfil do eleitor (barra de progresso colorida 0–100)
- [x] Filtrar eleitores por faixa de score (Alto / Médio / Baixo) na listagem de contatos
- [x] Coordenador vê score médio da região na aba Equipe

---

#### 9.10 — IA de Campanha (Alertas Inteligentes) ✅ ⭐
**Complexidade: Alta** — análise de padrões e geração de alertas automáticos.

- [x] Alertas automáticos no dashboard da Liderança:
  - Captador sem atividade ≥3 dias (warning) / ≥7 dias (danger)
  - Queda de cadastros por bairro (últimos 7d vs semana anterior)
  - Tendência geral semanal (crescendo / caindo)
  - Oportunidade: bairro com ≥30% indecisos
  - Alta concentração de oposição ≥25%
  - Captador destaque da semana
- [x] Score de risco por região (ponderação fraco/indeciso/oposição, barra colorida 0–100)
- [x] Sugestão de redistribuição de captadores inativos para regiões com mais indecisos
- [x] Aba **Alertas** no AdminScreen (Liderança e Coord. Geral) com resumo Críticos/Atenção/Positivos

---

#### 9.11 — Automação via WhatsApp ✅ ⭐
**Complexidade: Muito Alta** — integração com API externa, compliance legal obrigatório.

> Provider: **Evolution API** (open-source, self-hosted). O campo `aceitaWhatsapp` já existe no cadastro.

- [x] Integração com Evolution API (REST, self-hosted, gratuito)
- [x] Disparos segmentados: por nível de apoio, por bairro, por região
- [x] Templates: Livre, Evento, Mobilização, Confirmação de presença
- [x] `aceitaWhatsapp = true` sempre forçado — filtro não removível (compliance legal)
- [x] Log de disparos com status (pendente/enviando/concluido/erro) e contadores enviados/falhas
- [x] Edge Function `send-whatsapp` com rate limiting (500ms entre envios)
- [x] Aba **WhatsApp** no AdminScreen (Liderança e Coord. Geral) com histórico de disparos
- [x] Card de setup quando API não configurada (`VITE_WHATSAPP_CONFIGURED`)

---

## Próximos Passos Imediatos

1. **QA manual no Android** (Fase 8) — zero custo de desenvolvimento, só execução
2. **Gamificação do captador** (9.6) — aumenta produção de cadastros sem custo de aquisição
3. **Check-in e Rota dos Captadores** (9.7) — geolocalização e mapa de cobertura

---

*Última atualização: Jun/2026*
