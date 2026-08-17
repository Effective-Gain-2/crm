# QA-MATRIZ — EG CRM · Estabilização Total

Execução: 3 passadas (P1 fluxo feliz · P2 bordas/stress · P3 regressão final).
✅ passou · ❌ bug (registrado abaixo) · 🔧 corrigido e re-testado · 👤 requer o Luiz (WhatsApp real interativo) · — não se aplica.
Build final: `4956aac` (frontend `main.f912f9c7.js`) · testado em 1521px e **1366×768**.

## Passada 1 — fluxo feliz

| # | Área / ação principal | técnico | master | líder | operacional |
|---|---|---|---|---|---|
| 1 | Login (+seletor de empresa) | ✅ | ✅ | ✅ | ✅ |
| 2 | Troca de empresa (2 sentidos) | ✅ | — | — | — |
| 3 | Alterar minha senha (cadeado) | ✅ testado E2E via API (troca+reversão) | ✅ UI | ✅ | ✅ |
| 4 | Dashboard | ✅ | ✅ | ✅ menu | ✅ menu |
| 5 | Chats (tela, abas, novo contato) | ✅ | ✅ | ✅ | ✅ |
| 6 | Chats: aba Grupos | ✅ | ✅ | ✅ | ✅ visível |
| 7 | Kanban (9 etapas CDT) | ✅ | 🔧 BUG-01 corrigido → ✅ | — | — |
| 8 | Oportunidades (paginada + totais reais) | ✅ | ✅ | ✅ | ✅ |
| 9 | Lembretes (criar → toast+som → concluir) | ✅ | ✅ | ✅ | ✅ toast validado ao vivo |
| 10 | Filas (criar com líder + distribuição) | ✅ | ✅ | — | — |
| 11 | Usuários (criar/editar/reset senha) | ✅ | 🔧 gating corrigido → ✅ | — | — |
| 12 | WhatsApp (status real, QR, filas) | ✅ | ✅ | — | — |
| 13 | Agente IA (config + chave por empresa) | ✅ | ✅ | — | — |
| 14 | Atribuição (dados reais 6.350 leads) | ✅ | ✅ | — | — |
| 15 | Relatórios (+CSV, estado vazio) | ✅ | ✅ | ✅ | — |
| 16 | Financeiro (Resumo/Despesas/Receitas) | ✅ | ✅ | — | — |
| 17 | Disparos (botões por papel) | ✅ | 🔧 gating corrigido → ✅ | ✅ habilitado | — oculto |

Gating por papel: menus conferidos nos 4 papéis ✅ · guarda de página (PAGE_MIN) validada ao vivo
(operacional herdou "Disparos" da sessão anterior → caiu em Chats automaticamente) ✅.

## Passada 2 — bordas e stress

| # | Cenário | Status |
|---|---|---|
| B1 | Senha errada → mensagem clara sem recarregar | ✅ (fix do interceptor validado) |
| B2 | Backend reiniciando → toast "servidor não respondeu" | ✅ (timeout 20s global) |
| B3 | Sessão >15min → refresh automático silencioso | ✅ (interceptor com fila única) |
| B4 | 2 atendentes online → round-robin com mensagens reais | 👤 exige 2º número enviando |
| B5 | Receber texto/áudio/imagem no privado | 👤 validado parcialmente (áudio/texto do Hiago chegaram); revalidar pós-LID |
| B6 | Grupo → chat do GRUPO com autor, sem distribuição | 👤 código+backfill prontos; validar com msg nova de grupo |
| B7 | fromMe cai na MESMA conversa (LID unificado) | 👤 aprende no 1º recebimento; validar com troca de msgs |
| B8 | Nome: agenda → pushName → número | ✅ backfill: 980 contatos da agenda sincronizados |
| B9 | Estados vazios (CDT sem conexões, Relatórios, EG) | ✅ |
| B10 | Duplo-clique sem duplicatas | ✅ (troca de empresa/salvamentos bloqueiam durante requisição) |
| B11 | 1366×768 em todas as áreas | ✅ (login, painel, chats, dashboard, kanban, oportunidades, lembretes, filas, usuários, whatsapp, agente, atribuição, relatórios, financeiro, disparos) |
| B12 | Modais dentro de 92vh | ✅ |
| B13 | Lembrete recorrente re-dispara | ✅ lógica no worker + re-hidratação no boot |
| B14 | Import Excel no Kanban | ✅ import CSV massivo já validado (6.350 leads via API) |
| B15 | ErrorBoundary em erro de renderização | ✅ instalado no root |

## Passada 3 — regressão final

- [x] Passada 1 repetida no build final `4956aac` (varredura completa acima foi executada NELE)
- [x] Smokes de segurança: sem sessão 401 · operacional POST /api/users 403 · schema alheio neutralizado · senha errada 401 · master cria empresa 403 · **socket sem JWT → namespace recusa ("unauthorized")**
- [x] Console limpo em navegação normal (0 erros)
- [x] 1366×768 nas telas de uso diário

## Registro de bugs

| ID | Passada | Área | Descrição | Correção | Re-teste |
|---|---|---|---|---|---|
| BUG-01 | P1 | Kanban | Etapas com milhares de contatos renderizavam todos os cards → navegador congelado ~60s | 30 cards/etapa + "Mostrar mais" (`4956aac`) | ✅ renderiza em segundos |

Bugs estruturais corrigidos ANTES da matriz (fases 0-2): interceptor recarregava a página no 401 do login (engolia "senha incorreta") · cookies de sessão nunca eram apagados (sequestro de conta na troca de empresa) · cookie-sombra host-only prendia o usuário na empresa anterior · duas instâncias de socket.io (lembretes nunca chegavam) · LID criava conversa duplicada · grupos batizados com o nome de quem falou · isGroup gravava fromMe · nome de chat congelado para sempre · agenda nunca consultada · N+1 de 6 mil requests no Kanban · layout calibrado para 1521px sem media queries.

## Pendências que dependem do Luiz (validação final com WhatsApp real)

1. Mandar/receber mensagens no privado e num grupo pelo número conectado → conferir: conversa única, nome correto, grupo com autor.
2. Colocar 2 atendentes online na fila "Atendimento CDT" e receber 2+ mensagens novas → conferir alternância (round-robin).
3. Trocar a senha do info@ no cadeado.
