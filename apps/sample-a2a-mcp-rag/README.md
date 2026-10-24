# sample-a2a-mcp-rag

A single demo showing RAG, MCP, and A2A working together: documents are ingested into pgvector, exposed for retrieval through an MCP tool server, and queried through a two-agent A2A (Agent-to-Agent) pipeline.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                            src/a2a/                                  │
│                                                                      │
│  User query                                                          │
│      │                                                               │
│      ▼                                                               │
│  ┌────────────┐   A2A JSON-RPC   ┌──────────────┐                    │
│  │ Supervisor │ ───────────────► │  Specialist  │                    │
│  │   :3201    │ ◄─────────────── │    :3202     │                    │
│  └────────────┘   answer         └──────┬───────┘                    │
│       │                                 │ MCP callTool               │
│       │ synthesize                      │                            │
│       ▼                                 ▼                            │
│  Final answer              ┌─────────────────────────┐               │
│                            │   src/mcp/ (:3200)      │               │
│                            │   rag_search tool       │               │
│                            └────────────┬────────────┘               │
└─────────────────────────────────────────│────────────────────────────┘
                                          ▼
                             ┌─────────────────────────┐
                             │  PostgreSQL + pgvector  │
                             │  (@db/rag, port 55432)  │
                             └─────────────────────────┘
                                          ▲
                             ┌────────────┴────────────┐
                             │       src/rag/          │
                             │  ingestion pipeline     │
                             │  S3 / PDF / DOCX / text │
                             └─────────────────────────┘
```

### How the pieces relate

- **`src/rag/`** owns the ingestion path: parse documents (from S3 or raw text/buffers), chunk them, generate OpenAI embeddings, and store them in PostgreSQL with pgvector. The MCP server's `rag_add_document` / `rag_ingest_s3` tools call into it.
- **`src/mcp/`** is the MCP server: its `rag_search` tool runs hybrid search over the same database and returns the top-k chunks to any MCP-capable client. All retrieval in this demo goes through MCP.
- **`src/a2a/`** demonstrates multi-agent orchestration: a supervisor agent classifies a user query and delegates document questions to a specialist agent, which calls `rag_search` over MCP and generates an answer. The supervisor then synthesizes the final response.
- **`src/lib/`** holds shared pieces: the Drizzle/`pg` pool (`db.ts`), hybrid search (`search.ts`), the MCP client (`mcp-client.ts`), and types.

## Key packages

| Package | Used in | Purpose |
|---|---|---|
| `@modelcontextprotocol/sdk` | mcp, a2a | `McpServer` for the tool server; `Client` + `StreamableHTTPClientTransport` to connect as a client |
| `openai` | rag, mcp, a2a | `text-embedding-3-small` embeddings; `gpt-4o-mini` for classification, answers and synthesis |
| `drizzle-orm`, `pg`, `pgvector` | lib, rag | DB access through the `@db/rag` schema; `pgvector` registers the `vector` type |
| `@aws-sdk/client-s3` | rag, mcp | Fetch source documents from S3 (also LocalStack / MinIO) |
| `pdf-parse`, `mammoth` | rag | Extract text from PDF and DOCX |
| `@langchain/textsplitters` | rag, mcp | `RecursiveCharacterTextSplitter` (chunkSize 500, overlap 50) |
| `express` | mcp, a2a | HTTP server for the MCP server and both A2A agents |
| `zod` | mcp | MCP tool `inputSchema` definitions |

## Setup

1. **Database:** a PostgreSQL + pgvector instance on port 55432 with the `@db/rag` migrations applied — see [db/README.md](../../db/README.md#rag-schema):

   ```bash
   docker run -d --name pgvector -p 55432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=db_express pgvector/pgvector:pg17
   cp db/rag/.env.example db/rag/.env
   npm run db:migrate --workspace=db/rag
   ```

2. **Environment:** copy `.env.example` to `.env` and fill in `OPENAI_API_KEY` (and `DATABASE_URL` if not using the default).

| Variable | Used by | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | mcp, rag | — | PostgreSQL + pgvector connection string |
| `OPENAI_API_KEY` | mcp, rag, a2a | — | OpenAI API key |
| `API_PORT` | mcp | `443` (`.env.example`: `3200`) | MCP server port |
| `MCP_SERVER_URL` | a2a, demo | `http://localhost:3200/mcp` | URL of the running MCP server |
| `SUPERVISOR_PORT` | a2a | `3201` | Supervisor agent port |
| `SPECIALIST_PORT` | a2a | `3202` | Specialist agent port |
| `SPECIALIST_URL` | a2a | `http://localhost:3202` | Supervisor → specialist base URL |
| `AWS_REGION` | rag, mcp | `us-east-1` | S3 region |
| `AWS_ENDPOINT_URL` | rag, mcp | — | Custom S3 endpoint (LocalStack / MinIO) |

## Run

```bash
# MCP server (required by everything else)
npm run start:mcp
curl http://localhost:3200/status

# End-to-end demo: seeds 4 sample docs via MCP, spawns supervisor + specialist,
# sends 3 queries through the supervisor, then shuts both agents down
npm run demo

# Or run the agents yourself
npm run start:specialist
npm run start:supervisor
```

`ecosystem.config.cjs` runs all three processes under pm2. `demo/test.ts` is a manual smoke test of the MCP and A2A endpoints (`node demo/test.ts`, with everything running). `npm run agent-demo` is a separate demo: an OpenAI agent drives the report tools in `src/mcp/tools.ts` over MCP (it needs a publicly reachable `MCP_SERVER_URL`, e.g. via ngrok).

## src/mcp/ — MCP server

Streamable HTTP MCP server. Any MCP client (MCP Inspector, Claude Desktop via `mcp-remote`, the specialist agent) can discover and invoke its tools.

| Method | Path | Description |
|---|---|---|
| `POST` | `/mcp` | MCP client messages (initialize, tool calls) |
| `GET` | `/mcp` | SSE stream for server-to-client notifications |
| `DELETE` | `/mcp` | Terminate a session |
| `GET` | `/status` | Health check |

| Tool | Description |
|---|---|
| `rag_add_document` | Ingest plain text into pgvector |
| `rag_ingest_s3` | Fetch a PDF, DOCX or text file from S3, then parse, chunk, embed and store it |
| `rag_search` | Hybrid vector + full-text search over the knowledge base |
| `rag_list_documents` | List ingested documents |

`src/mcp/tools.ts` also registers non-RAG sample tools (`add`, `echo`, `calculate-bmi`, `days-to-due-date`, `get_available_reports`, `generate_reports`); `resources.ts` exposes `info://server` and `prompts.ts` a `review-code` prompt.

```bash
npx @modelcontextprotocol/inspector   # → Streamable HTTP, http://localhost:3200/mcp
```

## src/a2a/ — A2A agents

Each agent is a standalone Express server implementing the [Agent-to-Agent (A2A) protocol](https://google.github.io/A2A/):

| Method | Path | Description |
|---|---|---|
| `GET` | `/.well-known/agent.json` | AgentCard: name, description, skills |
| `POST` | `/` | `tasks/send` (JSON-RPC 2.0): submit a task, receive result artifacts |

**Supervisor** (`:3201`): classifies the query as `document-qa` or `general` with `gpt-4o-mini`, delegates `document-qa` to the specialist, then synthesizes the final answer.

**Specialist** (`:3202`): calls `rag_search` on the MCP server, generates an answer from the retrieved chunks with `gpt-4o-mini` (`rag.ts`), and returns it as an artifact.

```
User ──tasks/send──► Supervisor (3201) ── classify (gpt-4o-mini)
                         │ tasks/send
                         ▼
                     Specialist (3202) ── rag_search ──► MCP (3200) ──► pgvector + FTS
                         │                generate (gpt-4o-mini)
                         └─► answer ──► Supervisor ── synthesize ──► User
```

```bash
curl http://localhost:3201/.well-known/agent.json | jq .

curl -s -X POST http://localhost:3201/ -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0","id":"t1","method":"tasks/send",
  "params":{"id":"t1","message":{"role":"user","parts":[{"type":"text","text":"What is hybrid search?"}]}}
}' | jq '.result.artifacts[0].parts[0].text'
```

## Design notes

**Why separate ingestion from retrieval?** Ingestion is a batch/async operation that often runs outside the request path (S3 events, uploads, scheduled jobs); retrieval is synchronous and latency-sensitive. Keeping them apart lets each scale independently while sharing one database.

**Why hybrid search?** Vector search handles semantic similarity but can miss exact matches (proper nouns, version numbers); full-text search catches those. `src/lib/search.ts` merges both ranked lists with Reciprocal Rank Fusion, `score = 1/(60+rank_vector) + 1/(60+rank_fts)`, so there's no weight to tune.

**Why does the supervisor classify at all?** It demonstrates the routing pattern. In practice you would add more specialists (code search, calendar, …) and route by intent.

**Why `text-embedding-3-small`?** 1536-dim vectors at roughly 5× lower cost than the large model, with marginal quality difference for most knowledge-base RAG. The embedding column must match the model's dimension.
