# Testes E2E (Playwright)

Harness de teste estilo CI/CD que entra no sistema sempre com o mesmo login
(`effectivegain@gmail.com`) e sempre no schema **effective gain**, para validar
o app num ambiente previsível.

## Pré-requisitos
- Backend rodando em `http://localhost:3002` (`node index.js`)
- Frontend rodando em `http://localhost:3001` (`npm start`)

## Rodar
```bash
npm run e2e            # headless
npm run e2e:headed     # com navegador visível
```

Variáveis opcionais:
- `E2E_BASE_URL` — sobrescreve a URL do front (default `http://localhost:3001`)
- `E2E_HEADED=1` — roda com navegador visível

## Estrutura
- `helpers/auth.js` — `login(page)`: preenche credenciais, aguarda o seletor de
  schemas, seleciona "effective gain" e entra no painel. Reutilize em todo teste.
- `smoke.spec.js` — valida que o login + seleção de schema abrem o painel.

Para novos testes, comece sempre com `await login(page)` e então navegue pela
sidebar (`#chats`, `#kanban`, `#tags`, `#workflows`, ...).
