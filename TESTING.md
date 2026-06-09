# Guia de Testes — Features 3.0

> Data: Jun 9, 2026 | Tester: Você

---

## 🚀 Setup Inicial (5 min)

### 1. Supabase — Criar Convites de Teste

Abra o SQL Editor do Supabase (seu projeto) e execute:

```sql
-- Limpa convites antigos (opcional)
DELETE FROM public.invites WHERE created_at < NOW() - INTERVAL '7 days';

-- Insere 3 convites para teste
INSERT INTO public.invites (chave_unica, role, criado_em)
VALUES
  ('ABC123', 'captador_votos', NOW()),
  ('DEF456', 'coordenador_regional', NOW()),
  ('GHI789', 'lideranca', NOW());

-- Verifica se foi inserido
SELECT * FROM public.invites ORDER BY criado_em DESC LIMIT 5;
```

**Resultado esperado:** 3 linhas com `usado = false`

---

### 2. Rodador o Projeto

```powershell
cd c:\Users\Duda\Documents\Politiqui
npm run dev
```

Acesse: http://localhost:5173

---

## ✅ Teste 1: Cadastro via Chave de Acesso (Onboarding)

### Cenário A: Criar Nova Conta com Convite

**Steps:**

1. Na tela de Login, clique no botão verde **"Primeiro Acesso? Usar Chave de Convite"**
   - ✅ Deve abrir um modal com campo para "Código de Convite"

2. Digite o código: **ABC123** (captador)
   - ✅ Campo deve aceitar apenas 6 caracteres
   - ✅ Deve converter para maiúscula automaticamente

3. Clique **"Validar Código"**
   - ✅ Deve fazer requisição ao Supabase
   - ✅ Se correto, muda para "Step 2" (confirmação)
   - ✅ Exibe: "Seu perfil de acesso foi confirmado como **Captador**"

4. Clique **"Continuar para Cadastro"**
   - ✅ Abre formulário de signup com campos:
     - Nome Completo
     - CPF (máscara automática: 000.000.000-00)
     - E-mail
     - Senha (mín. 6 caracteres)
     - Confirmar Senha

5. Preencha os campos:
   ```
   Nome: João Silva Teste
   CPF: 123.456.789-10  (ou qualquer número válido)
   Email: joao@test.local
   Senha: Test@1234
   Confirma: Test@1234
   ```

6. Clique **"Criar Conta"**
   - ✅ Deve fazer loading
   - ✅ Cria user no Supabase Auth
   - ✅ Insere perfil na tabela `perfis` com role = 'captador_votos'
   - ✅ Marca invite ABC123 como usado
   - ✅ Exibe "Sucesso!" com spinner
   - ✅ Modal fecha automaticamente

7. **Verificação no Supabase:**
   ```sql
   -- Confira se o invite foi marcado como usado
   SELECT * FROM public.invites WHERE chave_unica = 'ABC123';
   -- Resultado: usado = true, usado_por = UUID do novo user, usado_em = timestamp

   -- Confira se o perfil foi criado
   SELECT id, nome, email, role FROM public.perfis 
   WHERE email = 'joao@test.local';
   -- Resultado: 1 linha com role = 'captador_votos'
   ```

8. **Volta ao Login**
   - ✅ Campo mostra mensagem: "Conta criada com sucesso! Faça login com seu CPF e senha."
   - ✅ Limpe o login e entre com:
     - CPF: **12345678910** (sem máscara)
     - Senha: **Test@1234**
   - ✅ Deve fazer login e abrir HomeScreen com role 'Captador'

---

### Cenário B: Validações de Erro

**Teste com código inválido:**

1. Clique **"Primeiro Acesso"**
2. Digite: **WRONGX** (código inválido)
3. Clique **"Validar Código"**
   - ✅ Exibe erro: "Código inválido ou já utilizado"
   - ✅ Fica no step de input

**Teste com código já usado:**

1. Clique **"Primeiro Acesso"**
2. Digite: **ABC123** (já foi usado no teste anterior)
3. Clique **"Validar Código"**
   - ✅ Exibe erro: "Código inválido ou já utilizado"

**Teste SignupForm — CPF inválido:**

1. Passe pelo InviteModal com **DEF456** (código válido não-usado)
2. Abre SignupForm
3. Preencha CPF: **111.111.111-11** (inválido)
4. Clique **"Criar Conta"**
   - ✅ Exibe erro: "CPF inválido"

**Teste SignupForm — Senhas diferentes:**

1. Preencha Senha: **Test@1234**
2. Preencha Confirmar: **Test@5678**
3. Clique **"Criar Conta"**
   - ✅ Exibe erro: "Senhas não conferem"

---

## ✅ Teste 2: Nichos de Atuação

**Already Implemented** ✅

Não precisa testar — já está funcionando em CaptureForm.tsx.

**Verificação rápida (opcional):**

1. Faça login com um captador existente
2. Clique **"Novo Eleitor"**
3. Scroll down até a seção de "Nichos"
   - ✅ Deve exibir 10 checkboxes: Saúde, Educação, Esporte, Religião, Empresário, Agricultura, Cultura, Meio Ambiente, Segurança, Assistência Social
4. Selecione 2-3 nichos
5. Cadastre o eleitor
   - ✅ Deve sincronizar com Supabase
   - ✅ Ao voltar e editar o eleitor, nichos devem estar selecionados

---

## ✅ Teste 3: Local Push Notifications para Agenda

### Pré-requisito: Permissão do Navegador

**Chrome/Edge (Desktop):**
- Pré-teste: Abra DevTools (F12) → Application → Manifest
- ✅ Deve estar verde (PWA instalada)

**Android (PWA):**
- Abra app como PWA
- Primeiro acesso a Agenda → vai pedir permissão nativa

---

### Cenário A: Agendar Notificação de Hoje

**Setup:**

1. Faça login com qualquer user (pode ser o novo captador do Teste 1)
2. Clique na aba **"Agenda"** (BottomNav)
3. Header exibe: 🔔 "Você receberá alertas 30 minutos antes de cada atividade"

**Steps:**

1. Clique **"Nova Atividade"**
   - ✅ Abre form com:
     - Tipo: Reunião / Visita (radio buttons)
     - Título
     - Local
     - Data (picker)
     - Horário (picker)

2. Preencha com atividade **de hoje + 1 hora**:
   ```
   Tipo: Reunião
   Título: Reunião com Coordenador
   Local: Sala 101
   Data: [hoje] (default)
   Horário: 15:30 (se agora é ~14:00, isso = em ~1.5h)
   ```

3. Clique **"Salvar"**
   - ✅ Atividade aparece na lista
   - ✅ Supabase recebe INSERT
   - ✅ **Silenciosamente agenda uma notificação local para 15:00** (30 min antes)

4. **Permissão do Navegador:**
   - 1ª vez que abre Agenda → aparece prompt: "site.local quer enviar notificações"
   - ✅ Clique **"Permitir"** (ou "Bloquear" para teste de fallback)

5. **Aguarde o tempo:**
   - Se agora é 14:30 e agendou para 15:30, aguarde até ~15:00
   - ✅ Browser deve mostrar notificação nativa:
     ```
     Lembrete: Reunião com Coordenador
     Sua atividade começa em 30 minutos
     [Fechar]
     ```

6. **Clique na notificação:**
   - ✅ App vem para frente
   - ✅ Abre AgendaScreen
   - ✅ Atividade "Reunião com Coordenador" está visível

---

### Cenário B: Múltiplas Atividades Hoje

**Steps:**

1. Ainda na aba Agenda, clique **"Nova Atividade"** novamente
2. Crie 2ª atividade (menor que 2h do agora):
   ```
   Tipo: Visita
   Título: Visita Eleitor Zona Norte
   Local: Rua A, nº 123
   Data: [hoje]
   Horário: 16:45
   ```
3. Salve
   - ✅ Agenda notificação para 16:15 (30 min antes)

4. Aguarde ou simule (DevTools):
   - Abra DevTools → Console
   - Execute:
     ```javascript
     // Dispara todas as notificações agendadas simulando o tempo
     // (apenas se você forçar — não é necessário para o teste real)
     ```

5. Deve receber 2 notificações:
   - Reunião: 15:00
   - Visita: 16:15

---

### Cenário C: Atividade com Horário Passado

**Steps:**

1. Clique **"Nova Atividade"**
2. Tente criar atividade com horário no **passado**:
   ```
   Tipo: Reunião
   Título: Reunião Antiga
   Data: [hoje]
   Horário: 10:00 (se agora é 14:00+)
   ```
3. Salve
   - ✅ Atividade é criada no Supabase
   - ✅ **Notificação NÃO é agendada** (tempo já passou)
   - ✅ Nenhum erro no console

---

### Cenário D: Atividade Sem Horário

**Steps:**

1. Clique **"Nova Atividade"**
2. Preencha:
   ```
   Tipo: Reunião
   Título: Reunião Sem Hora
   Local: Indefinido
   Data: [hoje]
   Horário: [deixe em branco]
   ```
3. Salve
   - ✅ Atividade é criada
   - ✅ **Notificação NÃO é agendada** (sem horário definido)
   - ✅ Sem erro

---

### Cenário E: Permissão Negada

**Steps:**

1. Abra app em modo anônimo (ou nova aba/perfil)
2. Clique em Agenda
3. Quando pedir permissão, clique **"Bloquear"**
   - ✅ Header exibe aviso:
     ```
     Notificações desativadas — verifique as permissões do navegador
     ```

4. Crie uma atividade
   - ✅ Atividade é criada
   - ✅ **Notificação NÃO é agendada** (sem permissão)
   - ✅ Nenhum erro

5. **Recuperar permissão:**
   - Chrome: Settings → Privacy → Site Settings → Notifications
   - Encontre seu site e mude para "Allow"
   - Reload a página
   - ✅ Aviso desaparece
   - ✅ Próximas atividades funcionam

---

## 📋 Checklist de Testes

| Teste | Cenário | Status | Notas |
|-------|---------|--------|-------|
| Onboarding | Código válido + cadastro completo | ⬜ | |
| Onboarding | Código inválido | ⬜ | |
| Onboarding | Código já usado | ⬜ | |
| Onboarding | CPF inválido | ⬜ | |
| Onboarding | Senhas não conferem | ⬜ | |
| Onboarding | Novo user consegue fazer login | ⬜ | |
| Nichos | 10 nichos aparecem em CaptureForm | ⬜ | |
| Nichos | Nichos salvam corretamente | ⬜ | |
| Notif | Permissão solicitada ao abrir Agenda | ⬜ | |
| Notif | Notificação dispara 30min antes | ⬜ | |
| Notif | Clique na notificação abre app + Agenda | ⬜ | |
| Notif | Múltiplas atividades = múltiplas notifs | ⬜ | |
| Notif | Atividade passada = sem notificação | ⬜ | |
| Notif | Sem horário = sem notificação | ⬜ | |
| Notif | Permissão negada = aviso no header | ⬜ | |

---

## 🐛 Troubleshooting

### "Código rejeitado mesmo sendo válido"
- ✅ Confirme que o código foi inserido como UPPERCASE na BD
- ✅ Rode: `SELECT * FROM public.invites;`
- ✅ Coluna `usado` deve ser `false`

### "SignupForm não aparece"
- ✅ Confira DevTools Console para erros
- ✅ Verifique se Supabase Auth está ligado
- ✅ Rode: `SELECT count(*) FROM auth.users;`

### "Notificação não dispara"
- ✅ Confira DevTools → Application → Notifications
- ✅ Permissão deve ser "Allow", não "Block"
- ✅ Aguarde exatamente o tempo agendado (30min antes)
- ✅ PWA deve estar instalada (Chrome: Install button)

### "Notificação dispara mas não abre app"
- ✅ Normal em background — espere ou clique na notificação
- ✅ Se nada acontece, confira DevTools → Service Workers (ativo?)

### "Supabase rejeitando INSERT de convite"
- ✅ Confira RLS policies: `SELECT * FROM postgres_roles;`
- ✅ Service role deve ter permissão de INSERT em `invites`
- ✅ SQL deve ter `auth.role() = 'service_role'`

---

## 📱 Testes no Android

### Setup PWA no Android

1. Chrome → 3 pontinhos → "Instalar aplicativo"
2. App aparece na home
3. Abra app
4. Clique em Agenda
   - ✅ Deve solicitar permissão nativa ("Notificações")
   - ✅ Clique "Allow"
5. Crie atividade com horário futuro
   - ✅ Notificação aparecerá no device mesmo com app fechado

---

## ✨ Final Check

Rode este SQL para confirmar tudo:

```sql
-- Convites criados?
SELECT COUNT(*) as total_invites FROM public.invites;

-- Novo user criado?
SELECT COUNT(*) as captadores FROM public.perfis 
WHERE role = 'captador_votos' AND created_at > NOW() - INTERVAL '1 hour';

-- Atividades agendadas?
SELECT COUNT(*) as atividades_hoje FROM public.agenda_itens 
WHERE DATE(data) = CURRENT_DATE;
```

**Resultado esperado:**
```
total_invites: 3
captadores: 1 (ou mais, do seu teste)
atividades_hoje: 2-3 (as que você criou)
```

---

**🎉 Se tudo passou: FEATURES FUNCIONANDO!**

**Próximos passos:**
1. Commit no Git: `git commit -m "Feature 3.0: Onboarding + Notificações"`
2. Deploy no Vercel (automático ao push)
3. Testar em produção
