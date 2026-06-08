import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAsCaptador(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /atlas/i })).toBeVisible();

  // Aceita login por e-mail ou por CPF
  const loginInput = page.getByLabel(/cpf|e-mail|login/i).first();
  await loginInput.fill('rafael@atlas.com');

  const passwordInput = page.getByLabel(/senha/i).first();
  await passwordInput.fill('1234');

  await page.getByRole('button', { name: /entrar/i }).click();
}

async function navigateToNewElector(page: Page) {
  // A tab de contatos abre a lista; o botão "+" cadastra novo eleitor
  await page.getByRole('tab', { name: /contatos/i }).click();
  await page.getByRole('button', { name: /novo eleitor|cadastrar|\+/i }).first().click();
}

// ─── Suíte principal ──────────────────────────────────────────────────────────

test.describe('Fluxo do Captador', () => {
  test('tela de login é exibida ao abrir o app', async ({ page }) => {
    await page.goto('/');
    // Deve conter algum elemento de autenticação
    await expect(page.getByRole('heading', { name: /atlas/i })).toBeVisible();
    await expect(page.getByLabel(/cpf|e-mail|login/i).first()).toBeVisible();
    await expect(page.getByLabel(/senha/i).first()).toBeVisible();
  });

  test('credenciais erradas exibem mensagem de erro', async ({ page }) => {
    await page.goto('/');
    const loginInput = page.getByLabel(/cpf|e-mail|login/i).first();
    await loginInput.fill('nao@existe.com');
    await page.getByLabel(/senha/i).first().fill('senhaerrada');
    await page.getByRole('button', { name: /entrar/i }).click();

    // Deve aparecer algum aviso de falha sem navegar para home
    await expect(page.getByRole('alert').or(page.getByText(/inválid|incorret|erro/i))).toBeVisible({ timeout: 8000 });
  });

  test('captador faz login com e-mail e acessa tela Home', async ({ page }) => {
    await loginAsCaptador(page);

    // Após login bem-sucedido deve existir a navegação inferior
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 });
  });

  test('captador não vê tab Admin', async ({ page }) => {
    await loginAsCaptador(page);
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 });

    // Tab "Admin" não deve estar visível para captador
    await expect(page.getByRole('tab', { name: /admin/i })).not.toBeVisible();
  });

  test('formulário de cadastro de eleitor é acessível', async ({ page }) => {
    await loginAsCaptador(page);
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 });

    await navigateToNewElector(page);

    // O formulário deve ter o campo "Nome"
    await expect(page.getByLabel(/nome/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('eleitor é cadastrado e aparece na lista de contatos', async ({ page }) => {
    await loginAsCaptador(page);
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 });

    await navigateToNewElector(page);

    // Preenche campos obrigatórios
    await page.getByLabel(/nome/i).first().fill('Eleitor Teste E2E');
    await page.getByLabel(/whatsapp|telefone/i).first().fill('11988887766');

    // Aceita possíveis listas/selects
    const nivelVoto = page.getByLabel(/nível de voto/i);
    if (await nivelVoto.isVisible()) {
      await nivelVoto.selectOption('forte');
    }

    // Salva o formulário
    await page.getByRole('button', { name: /salvar|cadastrar/i }).first().click();

    // Verifica que voltou para a lista e o eleitor aparece
    await expect(page.getByText('Eleitor Teste E2E')).toBeVisible({ timeout: 8000 });
  });

  test.describe('Comportamento offline', () => {
    test('captador consegue cadastrar eleitor sem conexão (pendingChanges)', async ({ page, context }) => {
      await loginAsCaptador(page);
      await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 });

      // Simula offline
      await context.setOffline(true);

      await navigateToNewElector(page);

      await page.getByLabel(/nome/i).first().fill('Eleitor Offline E2E');
      await page.getByLabel(/whatsapp|telefone/i).first().fill('11977776655');
      await page.getByRole('button', { name: /salvar|cadastrar/i }).first().click();

      // O eleitor deve aparecer na lista (salvo localmente no Dexie)
      await expect(page.getByText('Eleitor Offline E2E')).toBeVisible({ timeout: 8000 });

      // Deve haver indicador de pendência (badge ou texto com número > 0)
      const pendingBadge = page.locator('[data-testid="pending-count"], .pending-badge, [aria-label*="pendente"]');
      // Não é obrigatório que o badge exista, mas se existir deve ser > 0
      if (await pendingBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        const text = await pendingBadge.textContent();
        expect(Number(text)).toBeGreaterThan(0);
      }

      // Restaura conexão
      await context.setOffline(false);
    });
  });
});
