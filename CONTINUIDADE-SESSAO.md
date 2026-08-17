# CONTINUIDADE — EG CRM (handoff da sessão de 2026-08-13 → 2026-08-17)

> Documento de retomada. A próxima sessão do Claude Code deve ler este arquivo,
> o `DEPLOY-RUNBOOK.md`, o `QA-MATRIZ.md` e o `RELATORIO-QA-FINAL.md` antes de mexer em qualquer coisa.

---

## 1. Estado atual (fim da sessão)

**Sistema NO AR e testado**, domínio oficial com SSL válido:

| Item | Valor |
|---|---|
| Frontend | https://crm.effectivegain.com (bundle `main.c35fa0fc.js`) |
| API | https://crm-api.effectivegain.com (porta 3002) |
| Socket | https://crm-socket.effectivegain.com (porta 3333, mesma instância socket.io da API) |
| Repo | `github.com/Effective-Gain-2/crm` · branch `main` · último commit `2c507e6`+docs |
| Clone local | `C:\eg\crm` |
| Infra | Easypanel `painel.effectivegain.com`, servidor `31.97.172.123`, projeto `eg-os` (serviços: crm-backend, crm-frontend, crm-db Postgres 16, crm-redis) |
| Evolution API | projeto `evotest`, `https://evo.effectivegain.com`, v2.3.2 · instância ativa: `effective_gain__Luiz_Pessoal` (número pessoal do Luiz, conectado) |

**Stack:** Node/Express (`index.js`) + React CRA (`client/whatsapp-web-js-client`) + Postgres schema-per-tenant + Redis/BullMQ + socket.io + Evolution (Baileys).

## 2. Arquitetura montada nesta sessão (essencial para não regredir)

- **Identidade global**: `effective_gain.user_accounts` (bcrypt, `is_tecnico`) + `user_companies` (papel POR empresa) + espelho `<schema>.users` (password `GLOBAL_AUTH`). Login em 2 etapas com `preAuthToken`; JWT access 15min/refresh 7d em cookies httpOnly (`domain` decidido pelo HOST da API — nunca pelo Origin). 4 papéis: `tecnico` > `master` > `lider` > `operacional`.
- **Hardening**: gate global no `index.js` (públicas: login/select-company/refresh/logout/test); `/webhook` exige header `authorization` = EVOLUTION_API_KEY; `enforceSchema` sobrescreve schema do body/query/params com o do token; socket.io com auth no handshake + auto-join `schema_`/`user_` + recusa de namespace sem JWT.
- **Erros nunca silenciosos**: `utils/axiosConfig.js` global (timeout 20s, toasts com dedupe, refresh automático em 401, rotas de auth tratadas pelas telas — NUNCA reintroduzir o reload no 401 do login); `ErrorBoundary` no root; error handler Express JSON; **migrações rodam no boot** (`ensureSchemaTables` para todos os tenants, idempotente).
- **WhatsApp/LID**: o WhatsApp identifica contatos por `<id>@lid`. Webhook normaliza via `lid_map` (aprende de `senderPn`+`previousRemoteJid` das recebidas) e usa o jid normalizado como CHAVE do chat; `fundirChatsDoLid` funde chats órfãos automaticamente ao aprender o par (inclui LID "mutilado" — bug antigo removia o 5º dígito). Nome do chat: agenda (`contacts.is_saved`) > pushName > `fetchProfile` (verifiedName p/ business tipo 0800) > número; nomes ruins são atualizados quando chega um melhor; agenda sincronizada ao conectar + eventos `CONTACTS_*`. Grupos: chat único com nome do GRUPO (`findGroupSubject`), autor por mensagem (`messages.participant_name/jid`), **fora da distribuição automática**.
- **Chats UI**: LISTA ÚNICA estilo WhatsApp com chips `Tudo / Não lidas / Espera / Grupos` (filtram, não escondem) + badge "Espera" por item. As abas antigas escondiam conversas e pareciam bug de entrega.
- **Performance**: Kanban renderiza 30 cards/etapa + "Mostrar mais" (BUG-01: 6k cards congelavam o navegador); Oportunidades paginada por etapa (`/opportunity/by-stage/:id/:schema?limit&offset`) com totais reais do forecast; custom values só com campo selecionado.
- **Responsividade**: media queries ≤1400/≤1280 (o CSS era calibrado p/ 1521px); px medidos removidos do Chats; modais ≤92vh. Validado em 1366×768.
- **Distribuição automática**: round-robin entre membros ONLINE da fila (`queues.distribution`, `last_assigned_user`); grupos não entram.
- **Troca de senha**: `POST /api/change-password` (própria, exige atual) + reset pelo master no modal Editar Usuário + botão cadeado no menu.

## 3. Dados em produção

- **CDT Nova Iguaçu / RJ** (`cdt_nova_iguacu`): 6.350 leads GHL importados nas 9 etapas do funil vendas (idempotente via `POST /opportunity/import`); fila "Atendimento CDT" com distribuição automática (líder: Lider Teste 2; membros lider2+oper2). Sem conexão WhatsApp ainda.
- **Effective Gain** (`effective_gain`): número pessoal do Luiz conectado; ~47 chats reais; agenda com 2.324 contatos sincronizados; grupos ativos. Mapfre validada (`Mapfre WhatsApp`/558006481504, LID antigo fundido).
- 4 chats ainda só-número = LIDs onde só o Luiz falou (fundem sozinhos na 1ª msg recebida do contato).

## 4. Acessos

| Papel | Login | Senha |
|---|---|---|
| Técnico (Luiz) | info@effectivegain.com | trocada pelo Luiz (não registrada) |
| Técnico teste | tecnico.teste@effectivegain.com | `EgzZS5AHGX4N!` |
| Master CDT | master.teste@cdt.eg | `EgQVOzGh2Etx!` |
| Líder CDT | lider2.teste@cdt.eg | `Egde7g3cRZnR!` |
| Operacional CDT | oper2.teste@cdt.eg | `EgcrgTSeKsBp!` |

Contas de teste podem ser revogadas quando os usuários reais entrarem. E-mails com `_` no domínio não passam na validação do navegador — usar domínios com ponto (ex. `@cdt.eg`).
Easypanel: sessão do navegador do Luiz (perfil "Trabalho"); Claude NÃO digita credenciais de login do Luiz.
`EVOLUTION_API_KEY` = `AUTHENTICATION_API_KEY` do serviço `evotest/evolution-api` (já no env do crm-backend).

## 5. Operação — como trabalhar neste repo

- **Deploy**: push na `main` NÃO dispara sozinho. Gatilhos (sem login):
  - backend: `http://31.97.172.123:3000/api/deploy/6b4ea8a13e62dbfd773660d50cd6855dcc88bb968ecafc1b`
  - frontend: `http://31.97.172.123:3000/api/deploy/e1f3c4f141dc619bea2f86462dadcdd52e1013cc9cbe2957`
- ⚠️ **Fila de build única**: gatilhos disparados enquanto outro build roda são DESCARTADOS. Deploy sequencial, com sonda (bundle `main.*.js` p/ frontend; marcador HTTP p/ backend) antes do próximo.
- ⚠️ **SSL/Traefik**: se um domínio servir cert self-signed `CN=Easypanel` com DNS certo, REMOVER e RECRIAR o domínio no Easypanel (re-salvar não basta).
- **Build local antes do push**: `cd client/whatsapp-web-js-client && CI=false ./node_modules/.bin/react-scripts build` (Git Bash) + `node --check` nos .js do backend.
- **Console do container**: Easypanel → crm-backend → ícone `>_` → Bash. Backfill: `node scripts/fix_whatsapp_chats.js` (idempotente: agenda + isGroup + merge LID + renomear).
- **Não deployar enquanto o Luiz testa** (as requisições dele caem no restart).
- Commits sempre com autorização do Luiz (esta sessão teve autorização contínua).

## 6. Pendências / próximos passos sugeridos

1. **Validação final do Luiz com WhatsApp real** (pendente): conversa única pós-LID nos 2 sentidos; grupo com autor por mensagem; round-robin com 2 atendentes online na fila do CDT.
2. **Conectar número do CDT Nova Iguaçu** (tela WhatsApp → Nova Conexão) quando o cliente estiver pronto — cada empresa tem instância própria `<schema>__<nome>`.
3. **Usuários reais**: Luiz vai passar a lista (nome | e-mail | papel | empresa); criar com senhas temporárias + troca no 1º acesso; revogar contas de teste.
4. Cosméticos anotados: linha duplicada `master.teste@cdt.eg` (espelho `admin` antigo) na lista de Usuários; fontes duplicadas por caixa (hubspot/HUBSPOT) vindas do CSV GHL — normalizar em Atribuição; modal de lembrete abre com escopo interno 'geral' exibindo "Pessoal" (servidor força o certo).
5. Futuro declarado pelo Luiz: **apps iOS/Android** do CRM (ver skill `apple-developer-specialist` no EG OS).
6. Se transições de tela pesadas voltarem a demorar: investigar o unmount do Oportunidades/Kanban (observação registrada, não reproduzida no build final).

## 7. Referências no repo

- `DEPLOY-RUNBOOK.md` — operação completa (domínios, env, WhatsApp/LID/grupos, migrações, erros)
- `QA-MATRIZ.md` — matriz 17 áreas × 4 papéis × 3 passadas, com registro de bugs
- `RELATORIO-QA-FINAL.md` — relatório executivo da estabilização
- `RELATORIO-E2E-2026-08-14.md` — histórico da 1ª rodada E2E
- `scripts/fix_whatsapp_chats.js` — backfill idempotente · `scripts/migrate_all.js` · `scripts/bootstrap_*.js`
- Memória do Claude: `eg-crm-project.md` (auto-memory do EG OS) espelha este estado.
