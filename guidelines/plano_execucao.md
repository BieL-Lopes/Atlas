# Validação dos Requisitos e Plano de Execução

## Estado Atual do Projeto

| Requisito do Documento | Status no Código |
|---|---|
| Campo "Título de Eleitor" no cadastro | ✅ Em CaptureForm.tsx com máscara |
| Renomear "Apoiador" → "Cabo Eleitoral" | ✅ Não existe `apoiador` no código; já é `cabo_eleitoral` |
| 5 papéis (lideranca, coord. geral, coord. regional, captador, eleitor) | ✅ rbac.ts |
| Abas condicionais por papel | ✅ BottomNav.tsx + canAccessTab |
| Aba Admin (só Liderança) | ✅ AdminScreen.tsx com gráficos reais (recharts) |
| Aba Coordenação | ✅ CoordinationScreen.tsx — dados reais por captador (createdBy) |
| Exportação CSV/PDF | ✅ ContactList.tsx |
| Persistência local básica | ✅ localStorage salva mesmo com lista vazia (bug corrigido) |
| Mostrar título no perfil do eleitor | ✅ ElectorProfile.tsx exibe tituloEleitor |
| QR Code — gerar | ✅ qrcode.react — geração no perfil do eleitor |
| QR Code — ler | ✅ html5-qrcode — QrScannerModal.tsx com câmera + debounce |
| Visão do coordenador por captador | ✅ Filtra electors por createdBy real |
| Vincular eleitor ao captador (createdBy) | ✅ App.tsx seta createdBy e createdByName ao criar |
| Campos createdBy / regiao no ElectorData | ✅ Implementados |
| Edição de eleitor | ✅ CaptureForm com modo edit (prop electorToEdit) |
| Validação título de eleitor (12 dígitos) | ✅ CaptureForm.tsx |
| Login com detecção CPF/e-mail + máscara + validação | ✅ LoginScreen.tsx |
| Tela exclusiva do Coordenador Geral (drill-down deputado) | ✅ CoordinationScreen.tsx — drill-down por deputadoId |
| Exportação em Admin/Coordenação + RBAC canExport | ✅ |
| Offline-first real (PWA/IndexedDB/sync) | ✅ Dexie + vite-plugin-pwa + fila de sync (`useSync.ts`) |
| Backend/API + sincronização | ✅ Supabase: schema, auth, sync bidirecional, RLS |

## Plano de Execução (do mais fácil ao mais complexo)

### Nível 1 — Ajustes rápidos ✅ CONCLUÍDO
1. ~~Corrigir bug de persistência em App.tsx: salvar sempre, mesmo com lista vazia.~~ ✅
2. ~~Mostrar `tituloEleitor` no perfil (ElectorProfile.tsx) se ainda não aparece.~~ ✅
3. ~~Validar título (12 dígitos) antes do submit em CaptureForm.~~ ✅
4. ~~Limpar referências antigas a "Apoiador" em comentários/labels (se houver).~~ ✅

### Nível 2 — Modelo de dados ✅ CONCLUÍDO
5. ~~Adicionar campos em ElectorData: `createdBy`, `createdByName`, `regiao`.~~ ✅
6. ~~Adicionar entidade User real (id, nome, role, regiao, deputadoId) no localStorage e no login.~~ ✅
7. ~~Edição de eleitor (reaproveitar CaptureForm com modo edit).~~ ✅

### Nível 3 — Exportação ampliada ✅ CONCLUÍDO
8. ~~Botão de exportar também em Admin/Coordenação (CSV de usuários, CSV agregado).~~ ✅
9. ~~Limitar exportação por RBAC (canExport).~~ ✅

### Nível 4 — Coordenação real ✅ CONCLUÍDO
10. ~~Reformular CoordinationScreen.tsx para listar captadores da equipe com KPIs reais agrupando electors por createdBy.~~ ✅
11. ~~Criar tela do Coordenador Geral com visão por coordenador regional → por captador (drill-down), vinculada ao deputadoId.~~ ✅
12. ~~Dashboard de Liderança em AdminScreen com gráficos (recharts): por região, por nível de voto, por nicho, evolução por dia.~~ ✅
> **Nível 4 100% concluído.**
### Nível 5 — QR Code ✅ CONCLUÍDO
13. ~~Instalar qrcode.react (gerar) e html5-qrcode (ler).~~ ✅
14. ~~Gerar QR no perfil do eleitor codificando tituloEleitor.~~ ✅
15. ~~Escanear QR no fluxo de novo cadastro: botão "Escanear título" preenche o campo automaticamente. Tratar permissão de câmera + debounce.~~ ✅

### Nível 6 — Offline-first real
16. ~~Migrar storage de localStorage para IndexedDB via idb ou Dexie.~~ ✅ (Dexie + `db.ts`; migração one-time do localStorage na inicialização)
17. ~~Transformar o app em PWA: adicionar vite-plugin-pwa, manifest, ícones, service worker.~~ ✅ (`vite-plugin-pwa` + `manifest.webmanifest` + `sw.js` gerado no build)
18. ~~Fila de sincronização: tabela pending_changes (create/update/delete), flush quando navigator.onLine.~~ ✅ (tabela `pendingChanges` no Dexie; flush automático ao voltar online em `useSync.ts`)
19. ~~Indicador visual de status online/offline e de itens pendentes.~~ ✅ (`OfflineBanner.tsx` — barra fixa com WifiOff/spin + badge de pendentes)

### Nível 7 — Backend + sync
20. ~~Definir API (REST/Supabase/Firebase) com endpoints de electors, users, polls, agenda.~~ ✅ (Supabase: `supabase/schema.sql` com tabelas `profiles` + `electors`, índices, triggers de `updated_at` e criação automática de perfil)
21. ~~Autenticação com detecção CPF/e-mail, máscara e validação no LoginScreen.~~ ✅ (`authenticate()` async tenta Supabase Auth, CPF vira email virtual `{digits}@cpf.atlas`, fallback para mock)
22. ~~Sincronização bidirecional com resolução de conflitos.~~ ✅ (`syncService.ts`: push last-write-wins por entityId → pull diff desde `lastSyncAt`; `updatedAt` em cada eleitor)
23. ~~Permissões no servidor refletindo o RBAC do cliente.~~ ✅ (RLS no Supabase: captador vê só os próprios; coord_regional vê equipe; coord_geral/liderança vêm tudo)

### Nível 8 — Qualidade
24. Testes unitários do rbac.ts e dos reducers de eleitores. ✅ (vitest — 30 testes passando)
25. Testes E2E do fluxo captador (cadastro offline → sync). ✅ (playwright — e2e/captador-flow.spec.ts)
26. QA manual em dispositivo Android instalando o PWA. ⬜ (checklist abaixo — executar manualmente)

---

**Observação:**
- O projeto já cobre boa parte do básico, mas as partes de QR Code, dashboards reais, offline avançado e coordenação detalhada ainda precisam ser implementadas.
- Recomendo seguir a ordem acima para garantir entregas incrementais e testáveis.
