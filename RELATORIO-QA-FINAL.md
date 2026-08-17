# RELATÓRIO QA FINAL — EG CRM · Estabilização Total (2026-08-14)

**Veredito: sistema estável e testado tela a tela nos 4 papéis, nas 2 resoluções, no build final.**
O que resta são 3 validações que só o número de WhatsApp do Luiz pode fazer (lista no fim).

URLs: **https://crm.effectivegain.com** · API `crm-api` · Socket `crm-socket` (SSL válido).
Build final: `4956aac` · Detalhe célula a célula: [QA-MATRIZ.md](./QA-MATRIZ.md).

---

## O que esta rodada corrigiu (causa raiz, não sintoma)

### 1. Erros silenciosos — eliminados como CLASSE
- O interceptor global antigo **recarregava a página** quando o login devolvia 401 — a mensagem
  "senha incorreta" nunca aparecia. Era isso o "não consigo entrar" sem explicação.
- Nenhuma chamada tinha timeout: backend reiniciando (deploy) = botão travado para sempre.
- Agora: timeout 20s global · toast para rede/timeout/403/5xx (com dedupe) · 401 renova a sessão
  sozinho e só desloga se o refresh falhar · telas de auth mostram o próprio erro · ErrorBoundary
  substitui a página branca · backend sempre responde JSON `{error}`.

### 2. Sessão/cookies — o "fico preso na empresa errada"
- `clearCookie` sem `domain` não apagava nada: cookies antigos sobreviviam e **sequestravam o
  login seguinte** (entrava como outra conta) ou prendiam o usuário na empresa anterior.
- Agora: limpeza nos dois escopos, cookie-sombra eliminado a cada emissão de sessão, login novo
  zera a sessão anterior, troca de empresa com timeout + feedback + seletor bloqueado.

### 3. WhatsApp — endereçamento novo (LID), nomes e grupos
- **LID**: ida e volta da mesma conversa viravam 2 chats. O webhook agora aprende o par
  LID↔telefone e usa o jid normalizado como chave do chat.
- **Nomes**: ficavam congelados no primeiro valor (às vezes o número cru; o fallback da tela
  chegava a mostrar UUID). Agora: agenda > nome do WhatsApp > número, com atualização automática
  quando chega um nome melhor e **sync da agenda ao conectar** (980 contatos sincronizados).
- **Grupos**: eram batizados com o nome de quem mandou a 1ª mensagem (pareciam pessoas) e o campo
  isGroup gravava... fromMe (bug de posição de argumento). Agora: nome do GRUPO via Evolution,
  autor real em cada mensagem, aba "Grupos" própria e **fora da distribuição automática**.
- **Backfill executado em produção**: isGroup corrigido em 11 chats, nomes atualizados, mapa LID.

### 4. Responsividade — o "no monitor menor a tela não se adequa"
- O CSS tinha sido calibrado para uma tela de 1521px (estava comentado no código) e o Chats usava
  medidas em px copiadas de uma tela específica (707.61px, 95.11px...).
- Agora: media queries ≤1400px/≤1280px, layout flex real, modais limitados a 92vh.
- Validado em **1366×768**: as 17 áreas renderizam íntegras, com rolagem onde precisa.

### 5. Performance
- Kanban congelava o navegador ~60s (renderizava TODOS os ~6 mil cards). → 30 por etapa + "Mostrar mais" (BUG-01).
- Oportunidades baixava 2,9 MB por clique. → paginada por etapa com contadores reais do servidor.
- Kanban fazia 1 request de custom value POR CONTATO. → só busca com campo selecionado.
- Migrações agora rodam sozinhas no boot de cada deploy.

## Resultado das 3 passadas

- **P1 (fluxo feliz)**: 17 áreas × 4 papéis no build final — verde. 1 bug novo achado e corrigido (BUG-01).
- **P2 (bordas)**: senha errada com mensagem, refresh silencioso de sessão, estados vazios, modais, 1366×768 completo — verde. Casos de WhatsApp interativo → validação final com o Luiz.
- **P3 (regressão)**: varredura repetida no build final + 6/6 smokes de segurança (incl. socket recusando conexão sem JWT no namespace) + console zerado — verde.

## Validação final com o Luiz (~10 min)

1. **Entrar** em https://crm.effectivegain.com (`info@effectivegain.com` / senha temporária `EgsVVPhEVPoW!`) → escolher empresa → **trocar a senha no cadeado** do menu.
2. **WhatsApp**: mandar uma mensagem para o seu número conectado e responder do CRM → deve ser UMA conversa só, com o nome correto (agenda). Mandar uma mensagem num grupo → aba **Grupos**, nome do grupo, autor em cada fala.
3. **Distribuição**: com 2 atendentes online na fila "Atendimento CDT", receber 2 mensagens novas de números diferentes → cada uma vai para um atendente.

Qualquer coisa fora disso agora aparece com mensagem de erro na tela — me mande o texto exato que eu localizo na hora.

## Contas ativas

| Papel | Login | Senha |
|---|---|---|
| Técnico (Luiz) | info@effectivegain.com | `EgsVVPhEVPoW!` ← trocar |
| Técnico teste | tecnico.teste@effectivegain.com | `EgzZS5AHGX4N!` |
| Master CDT | master.teste@cdt.eg | `EgQVOzGh2Etx!` |
| Líder CDT | lider2.teste@cdt.eg | `Egde7g3cRZnR!` |
| Operacional CDT | oper2.teste@cdt.eg | `EgcrgTSeKsBp!` |

Contas de teste podem ser revogadas em Usuários quando os usuários reais entrarem.
