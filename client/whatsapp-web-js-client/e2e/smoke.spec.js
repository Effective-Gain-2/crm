const { test, expect } = require('@playwright/test');
const { login } = require('./helpers/auth');

test.describe('smoke', () => {
  test('login + schema effective gain abre o painel', async ({ page }) => {
    await login(page);

    // Painel carregado: sidebar visível e botão de Chats presente.
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('#chats')).toBeVisible();
  });

  test('a sidebar tem o botão de Tags', async ({ page }) => {
    await login(page);
    await expect(page.locator('#tags')).toBeVisible();
    await page.locator('#tags').click();
    await expect(page.getByRole('heading', { name: 'Tags' })).toBeVisible();
  });
});
