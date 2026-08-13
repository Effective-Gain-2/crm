# EG CRM — Runbook de subida + link com Evolution API

Domínios (Easypanel projeto `eg-os`):
- Frontend: `https://crm.effectivegain.com`        (crm-frontend, porta 3000)
- API:      `https://crm-api.effectivegain.com`    (crm-backend, porta 3002)
- Socket:   `https://crm-socket.effectivegain.com` (crm-backend, porta 3333)

Infra já provisionada: `crm-db` (Postgres 16), `crm-redis`, `crm-backend`, `crm-frontend`.

---

## Como o CRM se conecta ao Evolution (arquitetura)

O **CRM provisiona a instância no Evolution sozinho**. Não é preciso criar instância nem
webhook manualmente no Evolution. Fluxo:

1. Usuário abre o CRM → menu Conexões/WhatsApp → "Nova conexão" (informa nome + número).
2. Frontend chama `POST /evo/instance` no backend.
3. Backend chama `POST {EVOLUTION_SERVER_URL}/instance/create` com:
   - `integration: WHATSAPP-BAILEYS`, `qrcode: true`, `groupsIgnore: true`
   - `webhook.url = {BACKEND_URL}/webhook/chat`, `events: [MESSAGES_UPSERT]`, `base64: true`
4. Evolution devolve o QR code → usuário escaneia no WhatsApp.
5. Mensagens recebidas → Evolution faz `POST {BACKEND_URL}/webhook/chat` → CRM grava e emite no socket.
6. Envio de mensagem/mídia/áudio → CRM chama `{EVOLUTION_SERVER_URL}/message/sendText|sendMedia|sendWhatsAppAudio/{instanceId}`.

**Requisitos para o link funcionar:**
- Evolution API **v2** (formato do payload acima é v2).
- `EVOLUTION_SERVER_URL` = URL base do Evolution, **sem barra no final** (ex.: `https://evolution.effectivegain.com`).
- `EVOLUTION_API_KEY` = a **global apikey** do servidor Evolution (env `AUTHENTICATION_API_KEY` no Evolution).
- `BACKEND_URL` = `https://crm-api.effectivegain.com` — precisa estar **público e no ar** e alcançável
  pelo servidor Evolution ANTES de criar a primeira instância (é para lá que o webhook aponta).

---

## Passo a passo

### 1. Preencher secrets no crm-backend (Easypanel → crm-backend → Environment)
Obrigatórios para WhatsApp:
- `EVOLUTION_SERVER_URL` = URL base do seu Evolution (sem barra no final)
- `EVOLUTION_API_KEY`   = global apikey do Evolution
- `BACKEND_URL`         = `https://crm-api.effectivegain.com`  (já setado — confirmar)

Opcionais (recursos que só ligam quando preenchidos — NÃO travam o core):
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (login Google + Google Calendar)
- `OPENAI_KEY` (recursos de IA)

Frontend (Easypanel → crm-frontend → Build/Environment), opcional:
- `REACT_APP_RECAPTCHA_SITE_KEY` (só se o login usar reCAPTCHA)

### 2. Deploy do backend
- Confirmar env de banco/redis apontando para os hosts internos (`eg-os_crm-db`, `eg-os_crm-redis`).
- Clicar **Implantar** no `crm-backend`.
- Validar log: deve aparecer `Servidor rodando na porta 3002 🚀`, `Socket rodando na porta 3333`
  e `PostgreSQL conectado com sucesso`.
- Testar: `GET https://crm-api.effectivegain.com/company/companies` deve responder (JSON, mesmo que vazio/erro de auth — o importante é responder).

### 3. Deploy do frontend
- Garantir install `npm install --legacy-peer-deps` e build `npm run build`.
- Env de BUILD já apontando para `crm-api` e `crm-socket`.
- Clicar **Implantar** no `crm-frontend`.
- Abrir `https://crm.effectivegain.com` → tela de login deve carregar sem erro de CORS no console.

### 4. Bootstrap do tenant-mestre (`effective_gain`) — FAZER UMA VEZ
⚠️ A primeira empresa PRECISA ter schema `effective_gain` (há FK hardcoded `effective_gain.users`).
- Criar via endpoint `POST https://crm-api.effectivegain.com/company/company`
  com o payload de empresa + super-admin e `schema: "effective_gain"`.
  (Confirmar o formato exato do body em `controllers/CompanyController.js` antes de enviar.)
- Isso cria o schema `effective_gain` + todas as tabelas + o usuário super-admin.
- Se o login falhar por senha em texto puro, rodar uma vez dentro do container do backend:
  `node hashPasswords.js effective_gain`

### 5. Conectar o WhatsApp (o "link" com o Evolution)
- Logar no CRM (`crm.effectivegain.com`) com o super-admin.
- Menu **Conexões / WhatsApp** → **Nova conexão** → informar nome da instância + número.
- O CRM cria a instância no Evolution e mostra o **QR code**.
- Escanear com o WhatsApp do número → status muda para conectado.
- Enviar uma mensagem de teste para o número → ela deve aparecer no CRM (prova de que o
  webhook `MESSAGES_UPSERT` está chegando em `/webhook/chat`).

---

## Pendências de código (precisam de commit + push na branch main p/ Easypanel rebuildar)
1. **CORS** — ✅ já corrigido localmente (adicionado `https://crm.effectivegain.com` em 3 listas do `index.js`).
   Falta `commit + push` para o Easypanel pegar no próximo deploy.
2. **Google OAuth redirect** — `index.js` linhas ~45 e ~60 usam `http://localhost:3002/auth/redirect`
   e `/auth/google` fixos. Só afeta login Google/Calendar; trocar para o domínio do backend quando for usar.

## Troubleshooting rápido
- **CORS bloqueado no browser** → domínio do front não está na allowlist do `index.js` (rebuild após push).
- **QR não aparece / erro ao criar instância** → `EVOLUTION_SERVER_URL`/`EVOLUTION_API_KEY` errados ou Evolution v1.
- **Mensagens não chegam no CRM** → `BACKEND_URL` não público ou Evolution não alcança `/webhook/chat`.
- **App cai ao criar empresa** → primeiro schema não é `effective_gain` (FK hardcoded).
- **Login falha** → senha em texto puro: `node hashPasswords.js <schema>`.
