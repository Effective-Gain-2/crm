# Coletor HubSpot → CRM

Traz os leads novos do HubSpot (com telefone) para o CRM, que cria a oportunidade e
dispara o primeiro contato no WhatsApp (mensagem B). Usado **enquanto não há Private App**
com escopo de escrita — funciona pela sessão logada do usuário.

## Arquitetura em uma frase

Perfil de navegador persistente logado no HubSpot → abre a view salva a cada N horas →
lê os leads com telefone → `POST /hubspot-leads/<schema>` no CRM (que deduplica por
`external_id` e dispara o WhatsApp via ComplianceService).

## Passo a passo

### 1. No CRM (uma vez) — configurar o tenant
No console do crm-backend:
```
WELCOME_ATENDENTE='Hiago' WELCOME_UNIDADE='Nova Iguaçu' node scripts/config_hubspot_outreach.js cdt_nova_iguacu
```
Anote o `CRM_PUSH_TOKEN=...` que ele imprime. Confira os avisos (status da conexão e
`bloquear_frios`).

### 2. Criar a view no HubSpot (uma vez)
Em Contatos, crie e **salve** uma view:
- Filtro: `Número de telefone é conhecido` **e** `Data de criação = últimos 7 dias` (ou o
  recorte que a unidade considerar "novo").
- Ordenação: **Data de criação, decrescente**.
- Copie a URL da view salva.

> O CRM deduplica por `external_id`, então não há problema a view repetir leads entre
> rodadas — o que já entrou é descartado e não é remandado.

### 3. Configurar o coletor
```
cd collector
cp .env.example .env
# preencha HUBSPOT_VIEW_URL, CRM_PUSH_TOKEN (do passo 1) e IMAP_* 
```

### 4. Primeiro login (uma vez, com uma pessoa)
```
HEADLESS=false node hubspot_collector.js
```
Abre o navegador. **A pessoa faz o login do HubSpot** (o script nunca digita senha).
Feche a janela. O cookie fica salvo em `.hubspot-profile/` e o HubSpot passa a tratar o
dispositivo como conhecido — a confirmação por e-mail vira rara.

### 5. Rodar de verdade
Uma vez (para agendar por cron / Task Scheduler a cada 2–3h):
```
node hubspot_collector.js
```
Ou em laço próprio:
```
POLL_INTERVAL_MIN=180 node hubspot_collector.js
```

## Confirmação por e-mail

Se o HubSpot pedir "confirme que é você", o coletor lê o código na caixa IMAP
(`IMAP_*`) e preenche sozinho. Use uma **senha de app**, nunca a senha real da conta.

## Quando ele PARA e avisa (e o que fazer)

| Situação | O que aparece | Ação |
|---|---|---|
| Sessão morreu (login com senha) | "Sessão expirou — LOGIN COM SENHA" | Rodar o passo 4 de novo |
| Código não chegou a tempo | "não consegui o código a tempo" | Conferir IMAP_*; rodar de novo |
| Conexão WhatsApp não pronta | leads viram `pendente_sem_conexao` no CRM | Conectar o número (QR) |

## Segurança

- `.hubspot-profile/` (cookies) e `.env` estão no `.gitignore`. **Nunca commite.**
- Credenciais só por `.env` — nada hardcoded.
- Todo disparo passa pelo ComplianceService do CRM (teto diário, anti-repetição, ban monitor).

## Limites conhecidos

- Lê a **1ª página** da view (25 linhas). Para o volume atual (~8/dia) sobra; se um dia
  passar disso numa janela, aumentar a paginação.
- Depende do DOM da lista do HubSpot. Se o HubSpot mudar o layout (há aviso de "novo
  visual em Agosto/31"), os seletores de `extractRows` podem precisar de ajuste.
- Não é tempo real: cadência = `POLL_INTERVAL_MIN` (ou o cron). Para alerta imediato, o
  app do HubSpot no celular continua sendo o caminho.
