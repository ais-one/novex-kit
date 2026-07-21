# sample-botbuilder

Hybrid deterministic + agentic botbuilder sample using LangGraph, MCP, RAG, and Telegram.

## Architecture

Two servers in one package:

| Server | Port | Script |
|---|---|---|
| API Server (Telegram webhook + LangGraph engine) | 3101 | `npm run start:api` |
| MCP Server (tools + RAG) | 3100 | `npm run start:mcp` |

## Prerequisites

- Node.js 24+
- PostgreSQL with pgvector extension
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- OpenAI API Key
- OpenWeatherMap API Key (free tier: https://openweathermap.org/api)
- Ngrok (for Telegram webhook)

## Setup

1. Copy `.env.example` to `.env` and fill in all values:

```bash
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
OPENAI_API_KEY=sk-...
OPENWEATHER_API_KEY=your-key
```

2. Start the local database:

```bash
# From the repo root:
npm run serve                  # Starts PGlite on port 55432
```

3. Run database migrations:

```bash
npm run db:migrate --workspace=db/sample
npm run db:migrate --workspace=db/rag
```

4. Install dependencies:

```bash
npm install
```

5. Seed the default bot configuration:

```bash
npm run seed --workspace=@novex-kit/sample-botbuilder
```

## Running

Start both servers (in separate terminals):

```bash
# Terminal 1 — MCP Server
cd apps/sample-botbuilder
npm run start:mcp

# Terminal 2 — API Server
cd apps/sample-botbuilder
npm run start:api
```

## Setting up Telegram Webhook

1. Start ngrok:

```bash
npx ngrok http 3101
```

2. Copy the ngrok URL (e.g., `https://xxxx.ngrok-free.app`) and update `.env`:

```bash
TELEGRAM_WEBHOOK_BASE_URL=https://xxxx.ngrok-free.app
```

3. Register the webhook:

```bash
curl -X POST http://localhost:3101/api/sample-botbuilder/telegram/register-webhook
```

4. Send a message to your Telegram bot to test.

## Adding Knowledge Base Content

1. Upload documents via the frontend:
   - Open `http://localhost:8080/botbuilder/kb`
   - Enter a title and paste content
   - Submit

2. For RAG ingestion, send a message to your Telegram bot that triggers the knowledge base search (ask a question about the uploaded content).

## Testing

### Via Frontend
Open `http://localhost:8080/botbuilder/test` — type messages to test the bot.

### Via Telegram
Send messages directly to your Telegram bot after webhook setup.

## API Endpoints

### Graph Configs
- `GET /api/sample-botbuilder/graph/configs` — List all
- `GET /api/sample-botbuilder/graph/configs/:id` — Get one
- `POST /api/sample-botbuilder/graph/configs` — Create
- `PUT /api/sample-botbuilder/graph/configs/:id` — Update
- `DELETE /api/sample-botbuilder/graph/configs/:id` — Delete

### Knowledge Base
- `POST /api/sample-botbuilder/rag/upload` — Upload text document
- `GET /api/sample-botbuilder/rag/documents` — List documents
- `DELETE /api/sample-botbuilder/rag/documents/:id` — Delete document

### Telegram
- `POST /api/sample-botbuilder/telegram/webhook` — Incoming webhook
- `POST /api/sample-botbuilder/telegram/register-webhook` — Register webhook
- `GET /api/sample-botbuilder/telegram/webhook-info` — Webhook status

### Tools
- `GET /api/sample-botbuilder/tools` — List MCP tools

## Available Node Types (8 total)

| Type | Category | Description |
|---|---|---|
| `trigger` | Deterministic | Entry point |
| `text` | Deterministic | Send predefined message |
| `conditional` | Deterministic | If-else routing |
| `agent-handover` | Deterministic | Escalate to human |
| `end-session` | Deterministic | End conversation |
| `listen-trigger` | Deterministic | Wait for user input |
| `tool-agent` | Agentic | LLM + assigned tools |
| `router-agent` | Agentic | LLM picks which edge to follow |

## Available MCP Tools (8 total)

| Tool | Category |
|---|---|
| `rag_search` | Knowledge |
| `rag_add_document` | Knowledge |
| `rag_list_documents` | Knowledge |
| `openweather_get_weather` | Integration |
| `openweather_get_forecast` | Integration |

More tools can be added by registering them in `src/mcp/tools.ts`.
