# EG CRM — Runbook de operação (v2 — identidade global + multi-empresa)

Servidor: Easypanel projeto `eg-os` em `31.97.172.123` (painel.effectivegain.com)
Serviços: `crm-backend` (3002 API + 3333 socket) · `crm-frontend` (3000) · `crm-db` (Postgres 16) · `crm-redis`
Evolution: projeto `evotest` → `https://evo.effectivegain.com` (v2.3.2)

## Domínios
- Oficial (requer DNS → 31.97.172.123): `crm.effectivegain.com`, `crm-api.effectivegain.com`, `crm-socket.effectivegain.com`
- Preview (sempre funciona): `https://eg-os-crm-frontend.cownkm.easypanel.host` (front) e `https://eg-os-crm-backend.cownkm.easypanel.host` (API+socket)
- O cookie de sessão se adapta ao domínio automaticamente (COOKIE_DOMAIN só é usado em *.effectivegain.com).

## Identidade e papéis (v2)
- Conta única global (`effective_gain.user_accounts`) + acesso por empresa (`user_companies`) com papel POR empresa.
- Papéis: `tecnico` (plataforma, todas as empresas), `master` (tudo da empresa), `lider` (filas que lidera — `queues.superuser`), `operacional` (próprios atendimentos).
- Login em 2 etapas quando a conta tem 2+ empresas (ou técnico): seletor de empresa.
- Troca de empresa: menu do topo (ou tela /schemas para técnico) — emite novo token no servidor.

## Variáveis de ambiente (crm-backend)
| Var | Valor |
|---|---|
| postgres_* / REDIS_* | hosts internos (eg-os_crm-db / eg-os_crm-redis) |
| JWT_SECRET | obrigatório |
| JWT_REFRESH_SECRET | recomendado (default: JWT_SECRET + '.refresh') |
| SESSION_SECRET | recomendado |
| NODE_ENV / COOKIE_DOMAIN | production / .effectivegain.com |
| BACKEND_URL | URL pública da API (webhook Evolution aponta pra cá) |
| EVOLUTION_SERVER_URL | https://evo.effectivegain.com (sem barra final) |
| EVOLUTION_API_KEY | AUTHENTICATION_API_KEY do serviço evotest/evolution-api |
| OPENAI_KEY | opcional — fallback global (cada empresa configura a própria na tela do Agente) |
| RECAPTCHA_SECRET | opcional — ativa validação server-side |
| META_* | opcional — fallback legado (cada empresa configura na tela do Agente) |

Frontend (build-time): `REACT_APP_URL`, `REACT_APP_SOCKET_URL`, `REACT_APP_RECAPTCHA_SITE_KEY`.

## Migrações / bootstrap (console do crm-backend)
```bash
node scripts/migrate_all.js                 # shape completo em todos os tenants (idempotente)
node scripts/migrate_identity.js            # usuários por-schema → contas globais (idempotente)
# técnico da plataforma (senha via env do comando):
ADMIN_EMAIL='info@effectivegain.com' ADMIN_PW='<senha>' node scripts/bootstrap_tecnico.js
# usuários de teste p/ simulação:
TARGET_SCHEMA=<schema> TEC_PW=... MASTER_PW=... LIDER_PW=... OPER_PW=... node scripts/bootstrap_test_users.js
```

## WhatsApp (Evolution v2)
1. Login como master/técnico → botão WhatsApp → Nova Conexão (nome + número 12-13 dígitos).
2. Instância criada como `<schema>__<nome>` (única globalmente; webhook resolve a empresa em O(1)).
3. QR na tela; badge muda para **Conectado** em tempo real (evento CONNECTION_UPDATE). Botão "QR expirou?" renova sem recriar.
4. Eventos assinados: MESSAGES_UPSERT + CONNECTION_UPDATE + QRCODE_UPDATED. Webhook valida header `authorization` = EVOLUTION_API_KEY.

## Distribuição automática de leads
- Fila com `distribution = true` → mensagens novas são atribuídas round-robin **apenas entre membros ONLINE** da fila (operacional/líder). Sem ninguém online → chat vai para Espera; botão "Redistribuir" na tela de Chats.

## Chaves de API por cliente (custo por empresa)
- Tela Agente de IA → "Chave de API OpenAI (desta empresa)" (write-only) + uso do mês (respostas/tokens).
- Meta Lead Ads por empresa: callback `https://<api>/meta-leads/<schema>` + chaves na mesma tela (meta_*).

## Import de histórico (leads de outra plataforma)
`POST /opportunity/import` (master/técnico) `{ funnel, stages: [{name,color}...], leads: [{title, contact_name, phone, stage, value, source, status, created_at}] }` — idempotente; cria funil/etapas/contatos/etapas do contato/oportunidades.

## Lembretes de retorno
- Botão 🔔 no card do Kanban, no card de Oportunidade e no menu lateral do Chat — lembrete vinculado ao contato.
- No horário: toast persistente + som + "Abrir conversa" / "Concluir" / "+30 min". Recorrência diária/semanal/mensal.
- Jobs re-hidratados do banco no boot (Redis volátil não perde lembretes).

## Deploy
Push na `main` → gatilhos:
- backend: `http://31.97.172.123:3000/api/deploy/6b4ea8a13e62dbfd773660d50cd6855dcc88bb968ecafc1b`
- frontend: `http://31.97.172.123:3000/api/deploy/e1f3c4f141dc619bea2f86462dadcdd52e1013cc9cbe2957`

## Troubleshooting
- 401 em tudo → cookie de sessão ausente/expirado (relogar); ver COOKIE_DOMAIN vs domínio usado.
- Socket desconectado (sem realtime) → sessão expirada; o handshake exige JWT.
- QR não aparece → EVOLUTION_* vazios ou BACKEND_URL vazio (o create agora recusa e explica).
- Mensagens não chegam → conferir webhook na Evolution e header authorization.
- "Schema não permitido" → empresa não registrada em effective_gain.companies.
