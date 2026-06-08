# AGENT.md — Atlas

> Este arquivo é a fonte da verdade para qualquer agente de IA ou desenvolvedor trabalhando neste projeto.
> **Nunca assuma, invente ou extrapole** informações que não estejam documentadas aqui.
> Se algo não estiver descrito, pergunte antes de implementar.

---

## 1. Visão Geral do Projeto

**Nome:** Atlas  
**Descrição:** Sistema de captação de eleitores para campanhas políticas.  
**Estágio atual:** PWA funcional com autenticação real via Supabase, IndexedDB (Dexie) offline-first e sincronização bidirecional. Telas de Agenda, Enquetes e ElectorHome integradas ao Supabase.  
**Plataforma:** Web (React PWA) — futura versão mobile (a definir).

---

## 2. Stack Tecnológica

### Frontend (implementado)
- **Framework:** React 18 + Vite 6
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS v4 + shadcn/ui (Radix UI)
- **Componentes UI:** `src/app/components/ui/` (gerados pelo shadcn)
- **Ícones:** Lucide React
- **Roteamento:** Sem router — navegação por estado (`activeTab`, `selectedElector`)
- **Estado global:** `useState` em `App.tsx` (Context/Zustand não usados ainda)
- **Notificações:** Sonner (`toast.success`, `toast.info`, `toast.error`)
- **Gráficos:** Recharts 2.15.2
- **QR Code (geração):** `qrcode.react` → `QRCodeSVG`
- **QR Code (leitura):** `html5-qrcode` → `Html5Qrcode`
- **Persistência local:** IndexedDB via Dexie (`src/app/lib/db.ts`) — tabelas `electors` e `pendingChanges`; migração one-time do `localStorage` na inicialização
- **Supabase client:** `src/app/lib/supabase.ts` — usado diretamente nos componentes de tela (AgendaScreen, PollsScreen, ElectorHomeScreen) e no syncService
- **Legacy:** `localStorage` apenas para sessão do usuário (`atlas_user`)
- **Pacotes:** pnpm workspace (mas usar `npm` no terminal — pnpm não disponível no ambiente)
- **Dev server:** `npm run dev`

### Backend (implementado)
- **Plataforma:** Supabase
- **Banco de dados:** PostgreSQL (via Supabase)
- **Autenticação:** Supabase Auth — CPF vira email virtual `{digits}@cpf.atlas`; fallback para mock em desenvolvimento
- **API:** REST gerada automaticamente pelo Supabase
- **Controle de acesso:** Row Level Security (RLS) no PostgreSQL
- **Schema:** `supabase/schema.sql` — tabelas: `perfis`, `eleitores`, `agenda_itens`, `eventos`, `evento_confirmacoes`, `enquetes`, `enquete_votos`
- **Sync:** `src/app/lib/syncService.ts` — push last-write-wins por `entityId` + pull diff desde `lastSyncAt`

### Infraestrutura / Deploy
- **Build:** Docker (multi-stage)
- **Servidor de arquivos estáticos:** `serve` (node:20-alpine)
- **Variáveis de ambiente:** `VITE_API_BASE_URL` injetada via `ARG` no build
- **Timezone:** `America/Sao_Paulo`
- **Porta exposta:** `3000`
- **Entrypoint:** `/app/entrypoint.sh`

---

## 3. Padrão de Cores (obrigatório)

> **Cor padrão do app: AZUL (`blue-600` / `blue-700`)**
> Nunca usar roxo (`purple`) ou vermelho (`red`) como cor de interface principal.

### Regras de cor
| Contexto | Classe |
|---|---|
| Header / gradiente principal | `bg-gradient-to-r from-blue-600 to-blue-700` |
| Botão primário | `bg-blue-600 hover:bg-blue-700` |
| Texto de destaque | `text-blue-600` / `text-blue-700` |
| Fundo suave (card, hover) | `bg-blue-50` / `bg-blue-100` |
| Borda de destaque | `border-blue-200` |
| Subtítulo / subtext | `text-blue-100` (sobre fundo azul escuro) |

### Exceções permitidas (UX semântica)
| Situação | Cor | Justificativa |
|---|---|---|
| Badge papel "Liderança" | `red` | Distinção visual de papel de alto nível |
| Hover botão Excluir / Trash | `hover:text-red-600 hover:bg-red-50` | Ação destrutiva — sinalização de perigo |
| Badge papel "Coord. Geral" | `purple` | Distinção visual de papel |
| Estado de erro / `toast.error` | `red` | Feedback negativo padrão |
| Estado de sucesso / `toast.success` | `green` | Feedback positivo padrão |

---

## 4. Arquitetura de Dados

### Entidades principais

```
Deputado
  └── Coordenador Geral (1 por deputado)
        └── Coordenador Regional (N por coord. geral)
              └── Captador de Votos (N por coord. regional)
                    └── Eleitor (N por captador)

Enquete
  └── Pergunta (N por enquete)
        └── Resposta (N por pergunta)

Atividade (agenda)
  └── Vinculada a: Eleitor + Usuário responsável
```

### Interface `ElectorData` (implementada em CaptureForm.tsx)
```ts
interface ElectorData {
  id: string
  nome: string
  telefone?: string
  email?: string
  endereco?: string
  cpf?: string
  dataNascimento?: string
  nivelVoto?: 'forte' | 'medio' | 'fraco' | 'indeciso' | 'oposicao'
  nicho?: string
  tituloEleitor?: string   // 12 dígitos, validado no form
  createdAt: string
  createdBy?: string       // userId do captador
  createdByName?: string   // nome exibível do captador
  regiao?: string          // copiado do user.regiao no momento do cadastro
}
```

### Interface `User` (implementada em `src/app/lib/auth.ts`)
```ts
interface User {
  id: string
  name: string
  role: UserRole
  regiao?: string
  deputadoId?: string
  coordenadorRegionalId?: string
}
```

---

## 5. Papéis e Controle de Acesso (RBAC)

> O papel do usuário **nunca é escolhido pelo próprio usuário em produção**.
> Ele vem do banco de dados após autenticação.
> **O seletor de papel na tela de login foi REMOVIDO** — login usa CPF/e-mail + senha.

### Papéis definidos

| Role (valor no banco) | Nome exibido | Descrição |
|---|---|---|
| `lideranca` | Liderança | Acesso total, aba Administração exclusiva |
| `coordenador_geral` | Coordenador Geral | Visão agregada de todas as equipes, ligado a um deputado |
| `coordenador_regional` | Coordenador Regional | Visão da própria equipe de captadores |
| `captador_votos` | Captador de Votos | Cadastro de eleitores e agenda |
| `eleitor` | Eleitor | Recebe enquetes, sem acesso administrativo |

> ⚠️ O papel `apoiador` **não existe mais**. Foi renomeado para `captador_votos`.
> Nunca use `apoiador` em código novo.

### Abas por papel

| Aba | Liderança | Coord. Geral | Coord. Regional | Captador | Eleitor |
|---|:---:|:---:|:---:|:---:|:---:|
| Início | ✓ | ✓ | ✓ | ✓ | ✓ |
| Contatos | ✓ | ✓ | ✓ | ✓ | — |
| Agenda | ✓ | ✓ | ✓ | ✓ | — |
| Enquetes | ✓ | ✓ | ✓ | ✓ | ✓ |
| Equipe | — | — | ✓ | — | — |
| Painel Geral | — | ✓ | — | — | — |
| Administração | ✓ | — | — | — | — |

---

## 6. Autenticação (Supabase + fallback mock)

Implementado em `src/app/lib/auth.ts`.

```ts
// Tenta Supabase Auth; se VITE_SUPABASE_URL não estiver configurada, usa mock
authenticate(login: string, password: string): Promise<User | null>

// CPF é convertido para email virtual: '123.456.789-00' → '12345678900@cpf.atlas'
authenticateMock(login: string, password: string): User | null  // fallback

// Usuários mock disponíveis (usado quando Supabase não está configurado)
MOCK_USERS: User[]

// Retorna string legível para exibição (ex: "Coordenador Regional • Centro")
getUserLabel(user: User): string
```

- O login aceita CPF **ou** e-mail — sem seletor de papel visível.
- Em produção com Supabase configurado, `authenticate()` é assíncrona e usa Supabase Auth.
- Sessão persistida em `localStorage` na chave `atlas_user`.

---

## 7. Padrão de Props das Telas Principais

Todas as telas de nível superior recebem as props abaixo via `App.tsx`:

```ts
// CoordinationScreen, AdminScreen
interface ScreenProps {
  user: User
  electors: ElectorData[]
  canExport: boolean
}

// CaptureForm
interface CaptureFormProps {
  onSave: (elector: ElectorData) => void
  currentUser: User
  electorToEdit?: ElectorData
  onUpdate?: (elector: ElectorData) => void
}

// ElectorProfile
interface ElectorProfileProps {
  elector: ElectorData
  onEdit: () => void
}
```

- `canExport` vem de `getPermissions(user.role).canExport` (calculado em `App.tsx`).
- Nunca calcular permissões dentro do componente filho — sempre receber como prop.

---

## 8. Padrão de Exportação CSV

```ts
function exportCSV(filename: string, headers: string[], rows: string[][]): void {
  const bom = '\uFEFF'
  const csv = bom + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
```

- Sempre verificar `canExport` antes de renderizar o botão e antes de chamar a função.
- Incluir BOM (`\uFEFF`) para compatibilidade com Excel + acentos em português.

---

## 9. Padrão QR Code

### Geração (ElectorProfile.tsx)
```tsx
import { QRCodeSVG } from 'qrcode.react'

<QRCodeSVG
  value={JSON.stringify({ titulo: elector.tituloEleitor, nome: elector.nome })}
  size={180}
  level="M"
/>
```

### Leitura (CaptureForm.tsx → QrScannerModal.tsx)
- Componente: `src/app/components/QrScannerModal.tsx`
- Usa `Html5Qrcode` da lib `html5-qrcode`
- Lê via câmera, retorna `rawText` para o pai via `onScan(rawText: string)`
- O pai (`CaptureForm`) trata o texto: tenta `JSON.parse`, extrai `titulo`, fallback para texto cru
- Debounce via `useRef` (`scannedRef`) evita múltiplos disparos

---

## 10. Padrão de Persistência

### IndexedDB (Dexie) — fonte primária para eleitores
```ts
// src/app/lib/db.ts
import Dexie from 'dexie'
export const db = new Dexie('atlas')
db.version(1).stores({
  electors: '++id, createdBy, regiao, updatedAt',
  pendingChanges: '++id, entityId, operation, timestamp',
})
```

### localStorage — apenas sessão de usuário
```ts
localStorage.setItem('atlas_user', JSON.stringify(user))
const user = JSON.parse(localStorage.getItem('atlas_user') ?? 'null')
```

### Migração one-time (App.tsx)
- Na inicialização, leitores do `localStorage` (`atlas_electors`) são migrados para Dexie uma única vez.
- Após migração, `localStorage` de eleitores é removido.
- Ao adicionar novos campos à `ElectorData`, adicionar migração com valor padrão no `useEffect` inicial.

---

## 11. Boas Práticas de Código

### Geral
- Comparar roles pela string literal (TypeScript garante o tipo via `UserRole`):
  ```ts
  // ✅ correto — TypeScript valida via union type
  if (user.role === 'coordenador_regional') { ... }

  // ❌ nunca usar 'apoiador'
  if (user.role === 'apoiador') { ... }
  ```
- Nunca commitar `.env` ou qualquer arquivo com credenciais.
- Ao editar um componente, não deixar corpo de função duplicado — verificar se o replace não deixou código antigo abaixo.

### Componentes React
- Um componente por arquivo.
- Componentes de tela em `src/app/components/`, shadcn/ui em `src/app/components/ui/`.
- Não usar roteamento — navegação é feita via estado no `App.tsx`.
- Conflito de nomes: se importar `User` de `auth.ts` e ícone `User` de lucide, usar alias:
  ```ts
  import { User as UserIcon } from 'lucide-react'
  ```

### Dados mockados
- Mock de usuários em `src/app/lib/auth.ts` (`MOCK_USERS`, `MOCK_CREDENTIALS`).
- Eleitores vivem em `localStorage` — não há arquivo de mock de eleitores.
- Ao integrar o Supabase, substituir apenas a camada de serviço — os componentes não mudam.

---

## 12. Padrão de Integração com Supabase

```ts
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Verificar antes de chamar (Supabase pode não estar configurado em dev)
if (!isSupabaseConfigured()) {
  // exibir dados locais / mock
  return
}

const { data, error } = await supabase
  .from('agenda_itens')
  .select('*')
  .eq('criado_por', user.id)
if (error) { toast.error('Erro ao carregar'); return }
```

- Verificar **sempre** `isSupabaseConfigured()` antes de chamar para evitar crash em dev sem `.env`.
- Tratar **sempre** o `error` retornado — exibir `toast.error` ao usuário.
- Chamadas Supabase em telas de nível superior (AgendaScreen, PollsScreen, ElectorHomeScreen) são feitas diretamente no componente via `useEffect`.
- Para eleitores e sync, usar `src/app/lib/syncService.ts` em vez de chamar Supabase diretamente.

---

## 13. Docker e Build

### Regras obrigatórias
- `COPY package*.json ./` **sempre antes** do `npm ci` para aproveitar cache de camadas.
- Usar `npm ci` no build — determinístico.
- Manter `.dockerignore`:
  ```
  node_modules
  dist
  .git
  .env*
  ```
- Variáveis `VITE_*` são embutidas no bundle em tempo de build — **não são segredos**.

---

## 14. Roadmap de Implementação

| # | Tarefa | Complexidade | Status |
|---|---|---|---|
| 1 | Persistência localStorage + validação tituloEleitor | Fácil | ✅ Feito |
| 2 | Auth mock (CPF/email+senha) + createdBy no eleitor | Médio | ✅ Feito |
| 3 | Exportação CSV (Admin + Coordination) + RBAC canExport | Médio | ✅ Feito |
| 4 | CoordinationScreen KPIs reais + drill-down + AdminScreen dashboard recharts | Complexo | ✅ Feito |
| 5 | QR Code geração (ElectorProfile) + leitura câmera (CaptureForm) | Médio | ✅ Feito |
| 6 | IndexedDB (Dexie) + PWA (vite-plugin-pwa) + offline sync | Complexo | ✅ Feito |
| 7 | Backend Supabase + autenticação real + sync bidirecional | Complexo | ✅ Feito |
| 8 | Testes unitários (Vitest 30 testes) + E2E (Playwright) | Complexo | ✅ Feito |
| 9 | Classificação nivelVoto + projeção + comparativo regiões | Médio | ✅ Feito |
| 10 | Tela do Eleitor + AgendaScreen/PollsScreen c/ Supabase | Médio | ✅ Feito |
| 11 | QA manual Android | Fácil | 🔲 Pendente |
| 12 | Sistema de comunicados (9.5) | Médio | 🔲 Pendente |
| 13 | Gamificação do captador (9.6) | Médio | 🔲 Pendente |

---

## 15. O Que o Agente de IA Nunca Deve Fazer

- ❌ Usar a string `'apoiador'` em qualquer código novo
- ❌ Adicionar seletor de papel na tela de login
- ❌ Usar `purple` ou `red` como cor principal de UI (só permitido em badges de papel e ações destrutivas)
- ❌ Calcular permissões dentro de componentes filhos — sempre receber como prop
- ❌ Chamar `supabase` diretamente dentro de componentes
- ❌ Implementar backend diferente de Supabase sem aprovação registrada neste arquivo
- ❌ Deixar corpo de função duplicado após replace parcial de código
- ❌ Colocar lógica de negócio dentro de componentes de apresentação

---

## 16. Decisões Pendentes

- [ ] App mobile: React Native ou Flutter?
- [ ] Deploy: Railway / Fly.io / VPS própria?
- [ ] Gerenciamento de estado global: Context API ou Zustand? (migrar quando crescer)
- [ ] Quando integrar Supabase: migrar `ElectorData` para schema do banco

---

*Última atualização: Mai/2026 — manter este arquivo sempre sincronizado com decisões do time.*