# EG CRM — Setup Easypanel (novo)

Prompt pronto para colar no extensor/assistente do Easypanel. Provisiona 4 serviços:
Postgres, Redis, backend (Node) e frontend (React/CRA).

> ⚠️ Antes de deploy, os domínios novos precisam entrar no CORS do `index.js`
> (allowedOrigins linhas ~80-92 e origins do socket ~108-148). Sem isso o front é bloqueado.

---

## PROMPT PARA O EXTENSOR

```
Crie/configure no projeto atual do Easypanel os serviços abaixo para o EG CRM.
Repositório: https://github.com/Effective-Gain-2/crm  (branch: main).
Se já existir Postgres ou Redis neste projeto, reutilize; senão, crie.

=== 1. Postgres (banco) ===
- Template/Service: PostgreSQL 16
- Nome do serviço: crm-db
- Database: crm
- Usuário: postgres
- Gere uma senha forte e guarde (será usada no backend)
- Sem volume extra além do padrão do template
- Não precisa rodar SQL: o app cria os schemas/tabelas sozinho no 1º cadastro de empresa.

=== 2. Redis (filas BullMQ + sessão) ===
- Template/Service: Redis 7
- Nome do serviço: crm-redis
- Habilite senha (requirepass) e guarde

=== 3. Backend (App - Node) ===
- Nome do serviço: crm-backend
- Source: GitHub -> Effective-Gain-2/crm, branch main, build path: / (raiz)
- Builder: Nixpacks (Node)
- Install command: npm install
- Build command: (vazio)
- Start command: node index.js
- Portas expostas: 3002 (API + socket.io) e 3333 (socket realtime)
- Domínios:
    * crm-api.effectivegain.com   -> porta 3002
    * crm-socket.effectivegain.com -> porta 3333
  (troque pelos domínios reais que você for usar)
- Sem volume persistente (WhatsApp é via Evolution API externa; nada de sessão local)
- Variáveis de ambiente:
    postgres_host      = <host interno do serviço crm-db na rede do Easypanel>
    postgres_port      = 5432
    postgres_db        = crm
    postgres_username  = postgres
    postgres_password  = <senha gerada no passo 1>
    REDIS_HOST         = <host interno do serviço crm-redis>
    REDIS_PORT         = 6379
    REDIS_PASSWORD     = <senha do passo 2>
    JWT_SECRET         = <gerar string aleatória longa>
    NODE_ENV           = production
    COOKIE_DOMAIN      = .effectivegain.com
    GOOGLE_CLIENT_ID   = <preencher>
    GOOGLE_CLIENT_SECRET = <preencher>
    BACKEND_URL        = https://crm-api.effectivegain.com
    EVOLUTION_SERVER_URL = <URL da Evolution API>
    EVOLUTION_API_KEY  = <preencher>
    OPENAI_KEY         = <preencher>

=== 4. Frontend (App - React/CRA estático) ===
- Nome do serviço: crm-frontend
- Source: GitHub -> Effective-Gain-2/crm, branch main
- Build path (subdiretório): client/whatsapp-web-js-client
- Builder: Nixpacks / Static
- Install command: npm install --legacy-peer-deps   (obrigatório: há conflito de peer deps do React)
- Build command: npm run build
- Output/publish dir: build
- Modo SPA: sim (fallback de todas as rotas para index.html)
- Variáveis de BUILD (CRA injeta em build-time, precisam existir ANTES do build):
    REACT_APP_URL              = https://crm-api.effectivegain.com
    REACT_APP_SOCKET_URL       = https://crm-socket.effectivegain.com
    REACT_APP_RECAPTCHA_SITE_KEY = <preencher se usar reCAPTCHA no login>
- Domínio principal: crm.effectivegain.com -> porta do estático (80)
- Domínios de tenant (mesmo build), se aplicável:
    ilhadogovernador.effectivegain.com, barreiras.effectivegain.com,
    campo-grande.effectivegain.com, porto-alegre.effectivegain.com

=== Ordem de deploy ===
1) crm-db  2) crm-redis  3) crm-backend  4) crm-frontend
(o backend precisa do DB/Redis no ar; o frontend precisa do domínio do backend definido)
```

---

## Secrets que VOCÊ precisa preencher

| Variável | Onde obter |
|----------|-----------|
| `postgres_password` | gerada pelo Easypanel no serviço crm-db |
| `REDIS_PASSWORD` | definida no serviço crm-redis |
| `JWT_SECRET` | gerar (ex.: `openssl rand -hex 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console (OAuth) |
| `EVOLUTION_SERVER_URL` / `EVOLUTION_API_KEY` | sua instância Evolution API |
| `OPENAI_KEY` | painel OpenAI |
| `REACT_APP_RECAPTCHA_SITE_KEY` | Google reCAPTCHA (se usado) |

## Pendências de código (fora do Easypanel)
1. **CORS** — adicionar os domínios novos em `index.js` (allowedOrigins + origins do socket).
2. **Google OAuth redirect** — `index.js` usa `http://localhost:3002/auth/redirect` e
   `/auth/google` fixos. Em produção, trocar para o domínio do backend.
3. **Bootstrap do 1º usuário/empresa** — o schema é criado no cadastro de empresa via
   endpoint `/company`. Confirmar como o primeiro super-admin é criado (há `hashPasswords.js`).
