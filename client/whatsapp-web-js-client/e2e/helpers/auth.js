// Helper de autenticação para os testes E2E.
// Padrão fixo (pedido do time): sempre este login e sempre o schema
// "effective gain" no seletor — assim os testes rodam sempre no mesmo ambiente.
const { expect } = require('@playwright/test');

const CREDENTIALS = {
  email: 'effectivegain@gmail.com',
  password: 'Fion2023@',
};

// Nome do schema/empresa a selecionar no seletor de schemas.
const SCHEMA_MATCH = /effective\s*gain/i;

/**
 * Faz login e entra no painel já com o schema "effective gain" selecionado.
 * @param {import('@playwright/test').Page} page
 */
async function login(page) {
  await page.goto('/');

  await page.locator('input[type="email"]').fill(CREDENTIALS.email);
  await page.locator('input[type="password"]').fill(CREDENTIALS.password);
  await page.locator('button[type="submit"]').click();

  // O Login tem um delay artificial (~5s) e leva técnico -> /schemas,
  // admin -> /painel. Aguardamos qualquer um dos dois.
  await page.waitForURL(/\/(schemas|painel)/, { timeout: 40 * 1000 });

  if (page.url().includes('/schemas')) {
    // Seleciona o card cuja empresa casa com "effective gain" e clica "Entrar".
    const card = page
      .locator('div')
      .filter({ hasText: SCHEMA_MATCH })
      .filter({ has: page.getByRole('button', { name: /^Entrar$/ }) })
      .last();
    await card.getByRole('button', { name: /^Entrar$/ }).first().click();
    await page.waitForURL(/\/painel/, { timeout: 30 * 1000 });
  }

  // Sanidade: a sidebar do painel deve estar visível.
  await expect(page.locator('#sidebar')).toBeVisible({ timeout: 20 * 1000 });
}

module.exports = { login, CREDENTIALS, SCHEMA_MATCH };
