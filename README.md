# 🍰 Automação Semana do Bolo — Agente "Bolo da Sexta"

> ## ⚠️ Duas implementações neste repositório
>
> **1. Fluxo de PAGAMENTO (ATIVO) — workflow no n8n.** Todo mundo paga R$10
> por semana e manda o comprovante no grupo; a IA lê o valor, monta um checklist
> e libera o bolo quando todos pagam. É o que está em uso. Veja
> **[Fluxo de pagamento no n8n](#-fluxo-de-pagamento-no-n8n-ativo)**.
>
> **2. App Node.js de RODÍZIO (LEGADO)** — a implementação original abaixo, que
> sorteava quem levaria o bolo. Mantida para referência. **Não rode os dois ao
> mesmo tempo** (envio duplicado). O `docker-compose.yml` sobe apenas o
> `waha-bolo`; o serviço do app Node foi removido do compose de propósito.
>
> O `waha-bolo` (WAHA dedicado) é usado pelas duas, sempre isolado do WAHA do
> suporte Royale.

---

Agente automatizado que gerencia o **rodízio semanal** do responsável por
levar o bolo no encontro de sexta-feira.

Toda **quarta-feira às 20:00** (`America/Sao_Paulo`) o agente:

1. Identifica o próximo responsável conforme a ordem de rodízio (lista circular);
2. Gera mensagens divertidas usando a API do **Google Gemini 2.5 Flash**;
3. Envia a mensagem ao **grupo** e uma mensagem **privada** ao responsável via
   **WAHA (WhatsApp HTTP API)**;
4. Salva o histórico e atualiza a rotação — **somente após o envio bem-sucedido**.

---

## 🧱 Stack

| Camada        | Tecnologia                     |
| ------------- | ------------------------------ |
| Backend       | Node.js + TypeScript + Express |
| Banco         | SQLite + Prisma ORM            |
| IA            | Google Gemini 2.5 Flash        |
| WhatsApp      | WAHA (WhatsApp HTTP API)       |
| Agendamento   | node-cron                      |
| Validação     | Zod                            |
| Configuração  | dotenv                         |
| Qualidade     | ESLint + Prettier              |

---

## 📁 Arquitetura

```text
src/
├── agents/
│   └── BoloAgent.ts          # Concentra TODA a regra de negócio
├── scheduler/
│   └── scheduler.ts          # Dispara o agente (quarta 20:00)
├── services/
│   ├── GeminiService.ts      # Integração isolada com o Gemini
│   └── WhatsAppService.ts    # Integração isolada com o WAHA
├── repositories/
│   ├── ParticipantRepository.ts
│   ├── RotationRepository.ts
│   └── HistoryRepository.ts
├── database/
│   └── prisma.ts             # Prisma Client (singleton)
├── config/
│   └── env.ts                # Validação das variáveis com Zod
├── routes/
│   ├── participants.routes.ts
│   ├── rotation.routes.ts
│   ├── history.routes.ts
│   └── agent.routes.ts       # Disparo manual do agente
├── utils/
│   ├── date.ts               # Próxima sexta + semana ISO
│   ├── phone.ts              # telefone -> chatId (@c.us)
│   ├── asyncHandler.ts       # Encaminha erros async ao Express
│   └── logger.ts
├── app.ts
└── server.ts
```

**Regras de camadas:**

- Toda regra de negócio fica no **BoloAgent**.
- **Services** não contêm regra de negócio (apenas integram Gemini/WAHA).
- **Repositories** apenas acessam o banco de dados.

---

## ⚙️ Configuração

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

```env
PORT=3000
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY=sua-chave-do-gemini
WAHA_URL=http://localhost:3001
WAHA_SESSION=default
GROUP_CHAT_ID=120XXXXXXXX@g.us
TIMEZONE=America/Sao_Paulo
```

> As variáveis são validadas com **Zod** na inicialização. A aplicação não
> sobe com configuração inválida.

---

## 🚀 Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Gerar o Prisma Client e aplicar as migrations
npm run prisma:generate
npm run prisma:deploy        # ou: npm run prisma:migrate (dev)

# 3. (Opcional) Popular os participantes (William, Lincoln, Bruno, Evandro)
npm run seed

# 4. Ambiente de desenvolvimento (hot reload)
npm run dev

# 4. Ou build + produção
npm run build
npm start
```

---

## 💳 Fluxo de pagamento no n8n (ATIVO)

Workflow **`Bolo da Sexta — Pagamentos`** (n8n). Todo mundo paga **R$10 por
semana** e manda o comprovante no grupo.

**Como funciona:**

- **Quarta 10:00** (Schedule): abre a cobrança da semana **preservando quem já
  pagou antecipado** — só quem está pendente vira `PENDENTE` e recebe o
  **lembrete privado**; o **aviso no grupo** menciona quem já pagou.
- **Pagamento antecipado**: o comprovante pode ser enviado **qualquer dia**
  (inclusive antes da quarta). O registro usa *upsert*: se a linha da semana
  ainda não existe, ela é criada direto como `PAGO`. A "semana" é ancorada na
  **sexta do bolo** (sábado/domingo já contam para a sexta seguinte).
- **Pagamento de várias semanas** (ex.: Pix de R$30 = 3 semanas): cada R$10
  cobre uma sexta (máx. 8 por comprovante). O crédito é ancorado na **primeira
  sexta ainda não paga** da pessoa — quem já pagou a semana e manda outro
  comprovante adianta as seguintes (nada é ignorado nem duplicado; o hash
  barra comprovante repetido). A pessoa não recebe cobrança nem lembrete nas
  semanas adiantadas. A confirmação no privado reflete o valor real e informa
  até quando está isento; o grupo recebe um aviso gamificado
  ("🏆 JOGADA DE MESTRE!") junto do checklist sempre que alguém adianta.
- **Comprovante** (Webhook do `waha-bolo`): quando alguém manda **imagem ou PDF**
  do comprovante, a IA (Gemini 2.5 Flash) **lê o valor**, marca a pessoa como
  paga e posta o **checklist** no grupo, por exemplo:

  ```text
  💳 Pagamentos do bolo

  Bruno: Pago R$10,00 🟢
  Evandro: Pago R$10,00 🟢
  Lincoln: Pendente ⚪
  William: Pendente ⚪

  (2/4 pagaram)
  ```

- Quando **todos** pagam, o checklist fica todo 🟢 e ele envia
  **"Bolo desbloqueado com sucesso!"** 🎉

**Estado no n8n (Data Tables):** `bolo_amigos` (participantes, já populada com
William, Lincoln, Bruno e Evandro), `bolo_pagamentos` (status semanal) e
`bolo_config` (guarda o `grupo`).

### Recursos do agente (v2)

Além do fluxo básico de cobrança + comprovante, o workflow tem:

| Recurso | Quando | O que faz |
| --- | --- | --- |
| 💸 Pix na cobrança | quarta 20h / sexta 9h | Inclui a chave PIX (linha `pix` da `bolo_config`) nas mensagens |
| 🗳️ Enquete de sabor | quarta 20h | Enquete nativa no grupo (sabores na linha `sabores` da `bolo_config`) |
| ☀️ Cutucada | sexta 9h | Cobra **só quem está pendente** (privado + resumo no grupo) |
| 💬 Comandos | a qualquer hora | `status` (checklist gamificado) · `caixa`/`saldo` (resumo financeiro) no grupo |
| 🎮 Gamificação | por pagamento | Medalhas 🥇🥈🥉 pela ordem de pagamento da semana; streak 🔥N de semanas seguidas; ⏩+N semanas adiantadas; títulos por adiantamento (🥉 Precavido, 🥈 Estrategista, 🥇 Visionário, 👑 Lenda do Bolo); eventos "⚡ primeiro a pagar" e "🔓 desbloqueou o bolo" |
| 🧾 Prestação de contas | ao comprar o bolo | Foto da nota com legenda contendo "bolo" → IA lê o custo → saldo do caixa no grupo |
| 👀 Anti-fraude | por comprovante | Hash barra comprovante repetido; valor < R$10 gera aviso "faltou R$X" |
| 🎉 Cadastro automático | novato entra no grupo | Insere em `bolo_amigos` + boas-vindas (requer evento `group.v2.join`) |
| 🏆 Ranking mensal | dia 1, 12h | Pódio dos pagadores mais rápidos + lanterna do mês |
| ❤️‍🩹 Monitor de saúde | a cada 15 min | Workflow "Monitor Saúde WAHA Bolo": alerta no privado se a sessão cair |

### Manutenção (VPS)

```bash
# Backup da sessão do WhatsApp (evita reescanear QR se recriar o container)
docker run --rm -v waha-bolo_waha-bolo-sessions:/data -v "$PWD":/backup alpine \
  tar czf /backup/waha-bolo-sessions-$(date +%F).tar.gz -C /data .

# Fechar a porta 3001 para a internet (acesso só via túnel SSH)
ufw deny 3001/tcp
# Para acessar o dashboard depois: ssh -L 3001:localhost:3001 root@SEU_HOST
```

### Passo a passo do deploy

O deploy roda **na sua VPS** (não tenho acesso SSH). Comandos:

#### 1. Subir o `waha-bolo`

Crie o `.env` (veja `.env.example`) com `WAHA_API_KEY`, `WAHA_HOOK_URL`,
`N8N_NETWORK` e a senha do dashboard. Descubra a rede do n8n:

```bash
docker network ls        # ache a rede do n8n (ex.: root_default, n8n_default)
docker compose up -d      # sobe só o waha-bolo, na rede do n8n
```

> ⚠️ Use em `WAHA_API_KEY` o **mesmo valor** da sua credencial `WAHA X-Api-Key`
> no n8n — o workflow reutiliza essa credencial para falar com o `waha-bolo`.

#### 2. Conectar o número e criar o grupo

- Dashboard em `http://SEU_HOST:3001` (login do `.env`).
- Inicie a sessão `default` e **escaneie o QR com o `+55 18 99812-6464`**.
- **Adicione esse número ao grupo do bolo** (senão ele não envia no grupo).

#### 3. Preencher o `GROUP_CHAT_ID` na Data Table

```bash
curl -H "X-Api-Key: SUA_WAHA_API_KEY" http://SEU_HOST:3001/api/default/groups
```

Copie o `id` do grupo (`120...@g.us`) e coloque na Data Table **`bolo_config`**,
linha `chave = grupo`, coluna `valor` (pela UI do n8n).

#### 4. Ligar as credenciais no workflow e ativar

Abra o workflow **`Bolo da Sexta — Pagamentos`** no n8n e, nos nós HTTP, selecione:

- **WAHA X-Api-Key** nos nós `Aviso no Grupo`, `Lembrete Privado`,
  `Baixar Comprovante`, `Enviar Checklist`, `Falha Leitura`.
- **x-goog-api-key** no nó `Ler Valor (IA)`.

Confirme o fuso do workflow em **Settings → Timezone = America/Sao_Paulo** e
**ative** o workflow. Pronto: o webhook do `waha-bolo` já aponta para ele.

#### 5. Testar

- Mande uma imagem/PDF de comprovante no grupo com um dos números cadastrados →
  o checklist deve aparecer no grupo.
- Para testar o lembrete sem esperar a quarta, use **Execute Workflow** no nó
  `Quarta 20h`.

---

## 🐳 App Node.js legado (opcional, NÃO usar junto com o n8n)

A implementação original em Node roda o **rodízio** (sortear quem leva o bolo),
não o modelo de pagamento. Só faz sentido standalone e **nunca** junto do
workflow do n8n (senão os dois disparam na quarta). Para rodar isolado, use o
`Dockerfile`/`.env` — mas note que o `docker-compose.yml` **não** inclui mais
o serviço do app.

---

## 🔁 Algoritmo de rodízio

A rotação usa uma **lista circular** sobre os participantes **ativos**,
ordenados pelo campo `ordem`:

```text
William → Lincoln → Bruno → Evandro → William → ...
```

- Participantes **inativos** são ignorados.
- A rotação é **persistida** (tabela `rotation`) — **não** há cálculo baseado
  na semana do ano.
- Se o último responsável ficou inativo, o rodízio recomeça pelo primeiro ativo.

---

## ⏰ Scheduler & idempotência

- Frequência: **quarta-feira**, às **20:00**, timezone `America/Sao_Paulo`.
- Antes de executar, o agente verifica se **já existe histórico para a semana
  atual** (`week` + `year`). Se existir, **não executa novamente**.

---

## 🤖 Gemini

O `GeminiService` monta o prompt e espera um retorno em JSON:

```json
{ "group": "...", "private": "..." }
```

Caso a IA **falhe** (erro de rede, JSON inválido, etc.), o serviço utiliza
**mensagens padrão**, garantindo que o fluxo não seja interrompido.

---

## 📲 WAHA

`WhatsAppService` expõe:

- `sendGroupMessage(text)` → envia para `GROUP_CHAT_ID` (`120XXXXXXXX@g.us`)
- `sendPrivateMessage(chatId, text)` → envia privado (`551199999999@c.us`)

Se o **envio falhar**, o agente lança o erro e **não atualiza a rotação**.

---

## 🌐 API REST

### Participantes

| Método | Rota                | Descrição                    |
| ------ | ------------------- | ---------------------------- |
| GET    | `/participants`     | Lista participantes          |
| POST   | `/participants`     | Cria participante            |
| PUT    | `/participants/:id` | Atualiza participante        |
| DELETE | `/participants/:id` | Desativação **lógica**       |

### Rotação

| Método | Rota               | Descrição                       |
| ------ | ------------------ | ------------------------------- |
| GET    | `/rotation`        | Estado atual da rotação         |
| POST   | `/rotation/next`   | Avança para o próximo (manual)  |
| POST   | `/rotation/reset`  | Reinicia a rotação              |

### Histórico

| Método | Rota              | Descrição                |
| ------ | ----------------- | ------------------------ |
| GET    | `/history`        | Lista todo o histórico   |
| GET    | `/history/latest` | Último registro          |

### Agente (execução manual)

| Método | Rota          | Descrição                                    |
| ------ | ------------- | -------------------------------------------- |
| POST   | `/agent/run`  | Dispara o agente agora (respeita idempotência) |

### Utilitário

| Método | Rota      | Descrição       |
| ------ | --------- | --------------- |
| GET    | `/health` | Healthcheck     |

---

## 🧾 Scripts npm

| Script                  | Ação                              |
| ----------------------- | --------------------------------- |
| `npm run dev`           | Desenvolvimento com hot reload    |
| `npm run build`         | Compila TypeScript para `dist/`   |
| `npm start`             | Executa a build de produção       |
| `npm run lint`          | ESLint                            |
| `npm run lint:fix`      | ESLint com correção automática    |
| `npm run format`        | Prettier                          |
| `npm run prisma:migrate`| Migrations (dev)                  |
| `npm run prisma:deploy` | Migrations (produção)             |
| `npm run seed`          | Popula participantes de exemplo   |

---

## 🗺️ Funcionalidades futuras

- Confirmação do responsável
- Troca de vez
- Enquete de sabor
- Ranking
- Dashboard administrativo
- Integração com Google Calendar
- Lembrete na sexta-feira
- Comandos via WhatsApp
- Suporte a múltiplos grupos
