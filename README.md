# 🍰 Automação Semana do Bolo — Agente "Bolo da Sexta"

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

## 🐳 Deploy com Docker (WAHA dedicado)

O Bolo sobe com um **WAHA próprio** (`waha-bolo`), totalmente isolado do WAHA
do suporte Royale: rede, sessão, volume e API key separados. Assim o bot de
suporte **nunca** vê o grupo do bolo e as mensagens saem de um número próprio.

### 1. Configurar variáveis

Crie um `.env` na raiz (usado pelo `docker-compose.yml`):

```env
GEMINI_API_KEY=sua-chave-do-gemini
WAHA_API_KEY=uma-chave-forte-qualquer
WAHA_DASHBOARD_USERNAME=admin
WAHA_DASHBOARD_PASSWORD=troque-esta-senha
GROUP_CHAT_ID=            # preenchido no passo 3
```

### 2. Subir os containers e conectar o número

```bash
docker compose up -d --build
```

- Acesse o dashboard do WAHA do Bolo em `http://SEU_HOST:3001`
  (login = `WAHA_DASHBOARD_USERNAME` / `WAHA_DASHBOARD_PASSWORD`).
- Inicie a sessão `default` e **escaneie o QR Code com o número
  `+55 18 99812-6464`** (o número dedicado do Bolo).
- **Importante:** adicione esse número ao grupo do bolo, senão ele não
  consegue enviar a mensagem geral.

### 3. Descobrir o `GROUP_CHAT_ID` e finalizar

Com a sessão conectada e o número já no grupo:

```bash
curl -H "X-Api-Key: SUA_WAHA_API_KEY" http://SEU_HOST:3001/api/default/groups
```

Copie o `id` do grupo (formato `120...@g.us`), coloque em `GROUP_CHAT_ID` no
`.env` e recrie o app:

```bash
docker compose up -d app

# Popular os participantes (uma vez)
docker compose exec app npm run seed
```

### 4. Testar o envio

```bash
# Dispara o agente manualmente (respeita a idempotência semanal)
docker compose exec app node -e "require('http').request({host:'localhost',port:3000,path:'/agent/run',method:'POST'},r=>r.pipe(process.stdout)).end()"
# ou de fora do container:
curl -X POST http://SEU_HOST:3000/agent/run
```

> O `app` não expõe porta por padrão no compose (fica só na rede interna).
> Se quiser acessar a API REST de fora, publique a porta adicionando
> `ports: ['3000:3000']` ao serviço `app`.

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
