# EG CRM — Relatório da execução noturna (2026-08-13 → 2026-08-14)

**Status geral: sistema NO AR NO DOMÍNIO OFICIAL, migrado, com 6.350 leads do Cartão de Todos importados e os 4 perfis testados de ponta a ponta no navegador.**

## 🌐 URLs OFICIAIS (SSL Let's Encrypt válido — 2026-08-14 14:30)
- **CRM: https://crm.effectivegain.com** ← usar esta
- API: https://crm-api.effectivegain.com
- Socket: https://crm-socket.effectivegain.com

URLs de preview (continuam ativas como backup):
- Frontend: https://eg-os-crm-frontend.cownkm.easypanel.host
- API/Socket: https://eg-os-crm-backend.cownkm.easypanel.host

---

## 1. O que foi validado na simulação (evidência em navegador real)

### Técnico (`tecnico.teste@effectivegain.com`)
- Login em 2 etapas → seletor de empresas (CDT Nova Iguaçu / RJ + Effective Gain) ✅
- Seletor de empresa no topo do painel (troca sem novo login) ✅
- **Oportunidades: 6.350 leads visíveis no funil vendas** — Novo Lead (7), Atendimento Humano (4.860), Em Negociação (342), Sem Resposta (122), Ganho, etc. Fonte por lead (Meta ADs/HUBSPOT/TIM) e sino de lembrete em cada card ✅
- Kanban Vendas com etapas coloridas, cards com telefone, gerir etapas/funil ✅

### Master (`master.teste@cdt.eg`)
- Login direto (conta de 1 empresa não passa pelo seletor) ✅
- Menu completo: Dashboard, Financeiro, Chats, Kanban, Oportunidades, Agente de IA, Atribuição, Filas, Disparos, Usuários, WhatsApp, Lembretes, Relatórios, Insights, Ajuda ✅
- Usuários: lista com papéis; criação de líder e operacional ✅
- Filas: criada **"Atendimento CDT"** com super-usuário (líder) + **distribuição automática ativa** + 2 membros ✅
- WhatsApp: modal com coluna de status real; sem `EVOLUTION_API_KEY` no env o "Gerar QR Code" mostra **erro claro** (antes fingia sucesso); número aceita 13 dígitos ✅
- Agente de IA: campo de **chave OpenAI da empresa** (write-only) + aviso "Usando chave global (custo não separado)" + medidores de uso do mês ✅

### Líder (`lider2.teste@cdt.eg`)
- Menu reduzido correto: o do operacional + Disparos + Relatórios (sem Filas/Usuários/WhatsApp/Agente/Financeiro) ✅

### Operacional (`oper2.teste@cdt.eg`)
- Menu mínimo: Dashboard, Chats, Kanban, Oportunidades, Lembretes, Ajuda ✅
- Novo Lembrete: escopo restrito a **Pessoal** (sem Geral/Setorial) ✅ · lembrete criado aparece na lista e no calendário ✅

### Segurança (smoke via API)
| Teste | Resultado |
|---|---|
| Request sem sessão | 401 ✅ |
| Operacional tentando criar usuário | 403 ✅ |
| Pedir schema de OUTRA empresa na URL | neutralizado — devolve os dados da própria empresa ✅ |
| Master tentando criar empresa | 403 (só técnico) ✅ |
| Senha errada | 401 ✅ |
| Socket.io sem cookie JWT | conexão recusada ✅ |

## 2. Bugs reais encontrados NO TESTE e já corrigidos + deployados

1. **Papéis legados no frontend** — 10 telas ainda checavam `admin`: master não via "Adicionar Usuário", "Excluir Funil", botões de Disparos etc. Corrigido para os papéis novos (master/lider/operacional).
2. **Duas instâncias de socket.io** (bug crítico) — o cliente conectava pela porta da API e os eventos (lembretes, filas, kanban, chats em tempo real) eram emitidos na outra instância (porta 3333). **Ninguém receberia lembrete/toast.** Unificado: uma instância atende as duas portas.
3. **Kanban N+1** — a tela disparava **1 request de "custom value" POR CONTATO** (6 mil+ requests!) + 1 log de console por contato; o navegador congelava por ~30s. Agora só busca quando um campo personalizado é selecionado.
4. **Página restaurada ignorava papel** — ao trocar de usuário no mesmo navegador, a tela do papel anterior (ex.: Agente de IA) renderizava para operacional (sem dados — a API nega — mas confundia). Agora a página restaurada respeita o papel.
5. **Vazamento do placeholder de senha** — `get-users-in-queue` e `create-user` devolviam o campo `password` (`GLOBAL_AUTH`). Removido das respostas.
6. **E-mails com `_` no domínio** — `master.teste@cdt_nova_iguacu.eg` é bloqueado pela validação HTML5 do navegador (underscore não é válido em domínio). Os usuários de teste ativos usam `@cdt.eg`.

Commits desta rodada: `4bcf712`, `a0320ae`, `33af144`, `4ea7e51` (todos na main, deploy via gatilho).

## 3. Import Cartão de Todos Nova Iguaçu — CONCLUÍDO

- CSV GHL com 6.351 linhas → **6.350 importados + 1 duplicado ignorado** (idempotência funcionando).
- 9 etapas do pipeline vendas criadas na ordem do GHL; cada lead na etapa correta; forecast bate com o CSV (5.686 abertos).
- Empresa: schema `cdt_nova_iguacu`.

## 4. Credenciais (TROCAR AS SENHAS depois dos testes)

| Papel | E-mail | Senha |
|---|---|---|
| Técnico (seu) | info@effectivegain.com | `EgsVVPhEVPoW!` ← **temporária, troque** |
| Técnico teste | tecnico.teste@effectivegain.com | `EgzZS5AHGX4N!` |
| Master CDT | master.teste@cdt.eg | `EgQVOzGh2Etx!` |
| Líder CDT | lider2.teste@cdt.eg | `Egde7g3cRZnR!` |
| Operacional CDT | oper2.teste@cdt.eg | `EgcrgTSeKsBp!` |

## 5. O que depende do Luiz (≈15 min)

1. **DNS** — 3 registros A → `31.97.172.123`: `crm`, `crm-api`, `crm-socket` (.effectivegain.com). Sem isso o sistema segue nas URLs de preview acima (funcionais).
2. **EVOLUTION_API_KEY** — copiar `AUTHENTICATION_API_KEY` do serviço `evotest/evolution-api` para o env do `crm-backend` (+ `EVOLUTION_SERVER_URL=https://evo.effectivegain.com` e `BACKEND_URL` se ainda não estiverem). Sem isso o WhatsApp não conecta (a UI avisa com erro claro).
3. **Escanear o QR** de um número real para o teste fim-a-fim de mensagens + distribuição automática (round-robin entre membros online da fila já está ativo na fila "Atendimento CDT").
4. Opcional: `OPENAI_KEY` global (fallback) — cada empresa pode colar a própria na tela do Agente de IA.

## 6. Confirmações finais (10:47)

- ✅ **Toast de lembrete validado AO VIVO em produção**: lembrete criado → disparo no horário → toast persistente com "Concluir" / "+30 min" na tela do operacional. Circuito BullMQ → socket unificado → UI fechado.
- ✅ Nome da empresa corrigido para "CDT Nova Iguaçu / RJ" (ç correto) via novo endpoint PUT /company/rename.
- ✅ Guarda de página por papel confirmada no ar (página restaurada "usuarios" → operacional cai em Chats).
- ✅ Kanban com 9 etapas carregando fluido (fix N+1 confirmado no ar).
- ⚠️ Detalhe de deploy descoberto: **gatilhos de deploy disparados enquanto outro build roda são descartados** (builder único). Se um deploy "não pegar", redisparar com a fila ociosa.

## 6b. Fase 5 concluída — corte para o domínio oficial (14:30)

- ✅ DNS: `crm`, `crm-api`, `crm-socket` → `31.97.172.123` propagados (sem CAA, sem AAAA órfão, DNS-only).
- ✅ Frontend rebuildado com `REACT_APP_URL=https://crm-api.effectivegain.com` e `REACT_APP_SOCKET_URL=https://crm-socket.effectivegain.com`.
- ✅ `EVOLUTION_SERVER_URL=https://evo.effectivegain.com` preenchido no env do backend.
- ✅ **SSL Let's Encrypt emitido nos 3 domínios.**
- ✅ E2E no domínio oficial: login master → painel → Oportunidades com 6.350 leads nas 9 etapas; socket conectado via `crm-socket`; cookie de sessão gravado em `.effectivegain.com`; zero erros de console.

**⚠️ Gotcha do Traefik/Easypanel (documentar):** os 3 domínios ficaram servindo o certificado
self-signed `CN=Easypanel` mesmo com DNS correto e desafio ACME respondendo (404, não redirect).
Causa: o Traefik travou no estado de falha por ter tentado emitir enquanto o `crm` ainda apontava
para o servidor antigo (69.62.93.68), queimando o limite do Let's Encrypt (5 validações falhas por
hostname/hora). **Solução que funcionou: remover o domínio no Easypanel e recriá-lo** (gera router
novo → solicitação ACME limpa). Salvar o domínio de novo NÃO basta.

## 7. Pendências conhecidas (não bloqueiam)

- Linha duplicada do usuário `master.teste@cdt.eg` na lista de Usuários (espelho antigo `admin` + novo `master`) — cosmético.
- Modal de lembrete abre com escopo "geral" por padrão internamente (exibe "Pessoal") — o servidor força o escopo correto por papel; ajuste cosmético futuro.
- Telas Atribuição/Financeiro/Relatórios: renderizam e consultam a API real, mas sem dados de produção ainda (sem tráfego).
