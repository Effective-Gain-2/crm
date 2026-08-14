# QA-MATRIZ — EG CRM · Estabilização Total

Execução: 3 passadas (P1 fluxo feliz · P2 bordas/stress · P3 regressão final).
Células: ✅ passou · ❌ bug (registrado abaixo) · 🔧 corrigido, re-testar · — não se aplica ao papel.
Resoluções: **G** = 1920/1521px · **P** = 1366×768.
Build de referência: `b83bae5` (atualizar a cada correção).

## Passada 1 — fluxo feliz (resolução G, por papel)

| # | Área / ação principal | técnico | master | líder | operacional |
|---|---|---|---|---|---|
| 1 | Login (+seletor de empresa quando aplicável) | | | — 1 empresa | — 1 empresa |
| 2 | Troca de empresa (topo, 2 sentidos) | | — | — | — |
| 3 | Alterar minha senha (cadeado) | | | | |
| 4 | Dashboard carrega com dados | | | | |
| 5 | Chats: enviar/receber texto | | | | |
| 6 | Chats: aba Grupos (nome do grupo + autor por mensagem) | | | | |
| 7 | Kanban: criar etapa, arrastar card, renomear | | | — | — |
| 8 | Oportunidades: criar, mover, Carregar mais | | | | |
| 9 | Lembretes: criar → toast+som no horário → concluir | | | | |
| 10 | Filas: criar/editar com líder + distribuição | | | — | — |
| 11 | Usuários: criar, editar papel, reset de senha | | | — | — |
| 12 | WhatsApp: status real, botão QR, vincular fila | | | — | — |
| 13 | Agente IA: salvar config, campo de chave | | | — | — |
| 14 | Atribuição: relatório carrega | | | — | — |
| 15 | Relatórios: lista + export CSV | | | | — |
| 16 | Financeiro: tela carrega sem erro | | | — | — |
| 17 | Disparos: tela carrega, botões habilitados por papel | | | | — |

## Passada 2 — bordas e stress (após correções da P1)

| # | Cenário | Status |
|---|---|---|
| B1 | Login com senha errada → mensagem clara (sem recarregar a página) | |
| B2 | Ação durante backend reiniciando → toast de "servidor não respondeu" | |
| B3 | Sessão >15min → renovação automática silenciosa (sem deslogar) | |
| B4 | 2 navegadores online na mesma fila → mensagens novas alternam (round-robin) | |
| B5 | WhatsApp real: receber texto/áudio/imagem (privado) | |
| B6 | WhatsApp real: mensagem em grupo → chat do GRUPO, autor visível, SEM distribuição | |
| B7 | Enviar mensagem própria (fromMe) → cai na MESMA conversa (LID unificado) | |
| B8 | Contato salvo na agenda → nome da agenda; não salvo → nome do WhatsApp | |
| B9 | Estados vazios (empresa Effective Gain sem dados) em todas as telas | |
| B10 | Duplo-clique em botões de criação → sem duplicatas | |
| B11 | Resolução P (1366×768): TODAS as 17 áreas sem corte/sem perder scroll | |
| B12 | Modais em tela baixa → dentro de 92vh com scroll interno | |
| B13 | Lembrete recorrente dispara de novo no próximo ciclo | |
| B14 | Import Excel de contatos no Kanban | |
| B15 | ErrorBoundary: tela quebrada mostra recuperação (não página branca) | |

## Passada 3 — regressão final (build final)

- [ ] Repetir a Passada 1 inteira no build final
- [ ] Smokes de segurança: schema alheio na URL → dados próprios · operacional POST /api/users → 403 · master cria empresa → 403 · socket sem JWT → recusado · senha errada → 401
- [ ] Console do navegador limpo (zero erros) em navegação normal por todas as telas
- [ ] Resolução P nas 5 telas de uso diário (Chats, Kanban, Oportunidades, Dashboard, Lembretes)

## Registro de bugs

| ID | Passada | Área | Descrição | Correção (commit) | Re-teste |
|---|---|---|---|---|---|
| BUG-01 | P1 | Kanban | Etapas com milhares de contatos renderizavam TODOS os cards → navegador congelado ~60s ao abrir o Kanban do CDT | Renderização limitada a 30 cards/etapa + "Mostrar mais" | pendente |

## Evidências parciais (build b83bae5 → em atualização)

- Login 1366×768: card centralizado, olho de senha visível ✅
- Painel master 1366×768: sidebar 60px (media query ativa), Chats íntegro ✅
- Dashboard 1366×768: KPIs visíveis, página ROLA (antes cortava sem scroll) ✅
- Backfill produção: agenda 980 contatos sincronizada (effective_gain), isGroup corrigido em 11 chats, 1 chat renomeado ✅
