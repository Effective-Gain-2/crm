// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Harness E2E do CRM. Pré-requisito: backend (3002) e frontend (3001) no ar.
// O login é sempre effectivegain@gmail.com e o schema sempre "effective gain"
// (ver e2e/helpers/auth.js) — facilita testar sempre no mesmo ambiente.
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  expect: { timeout: 15 * 1000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
    headless: process.env.E2E_HEADED ? false : true,
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
