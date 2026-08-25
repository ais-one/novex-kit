# sample-a2a-rag-mcp

A single demo showing RAG, MCP, and A2A working together: documents are ingested into pgvector, exposed for retrieval through an MCP tool server, and queried through a two-agent A2A (Agent-to-Agent) pipeline.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                              a2a/                                    │
│                                                                       │
│  User query                                                          │
│      │                                                                │
│      ▼                                                                │
│  ┌───────────┐   A2A JSON-RPC   ┌──────────────┐                     │
│  │ Supervisor │ ──────────────► │  Specialist  │                     │
│  │  (Claude)  │ ◄────────────── │  (OpenAI)    │                     │
│  └───────────┘   answer         └──────┬───────┘                     │
│       │                                │ MCP callTool                │
│       │ synthesize                     │                             │
│       ▼                                ▼                             │
│  Final answer              ┌─────────────────────┐                   │
│                             │    mcp-server/       │                  │
│                             │  rag_search tool      │                 │
│                             └──────────┬───────────┘                 │
└────────────────────────────────────────│─────────────────────────────┘
                                         ▼
                             ┌─────────────────────┐
                             │   PostgreSQL          │
                             │   + pgvector          │
                             │   (chunks table)      │
                             └─────────────────────┘
                                         ▲
                             ┌───────────┴──────────┐
                             │       ingest/          │
                             │  ingestion pipeline    │
                             │  S3 / PDF / DOCX       │
                             └───────────────────────┘
```

### How the pieces relate

- **`ingest/`** owns the ingestion path: it fetches documents from S3 (or accepts raw text/buffers), parses them, chunks them, generates OpenAI embeddings, and stores everything in PostgreSQL with pgvector. This runs as a batch/offline pipeline, independent of the request path.
- **`mcp-server/`** owns the retrieval path as an MCP server: its `rag_search` tool queries the same PostgreSQL database and returns the top-k relevant chunks to any MCP-capable client. All retrieval in this demo goes through MCP — there is no separate direct-DB query path.
- **`a2a/`** demonstrates multi-agent orchestration: a supervisor agent (Claude) classifies and routes a user query to a specialist agent (OpenAI), which calls the MCP server's `rag_search` tool and returns an answer. The supervisor then polishes the result with Claude.

---

## Key packages

| Package | Used in | Purpose |
|---|---|---|
| `@modelcontextprotocol/sdk` | mcp-server, a2a | Official MCP SDK — `McpServer` for building tool servers; `Client` + `StreamableHTTPClientTransport` for connecting as a client |
| `openai` | mcp-server, ingest, a2a | Official OpenAI SDK — `embeddings.create` for `text-embedding-3-small` vectors; `chat.completions.create` for `gpt-4o-mini` generation |
| `@anthropic-ai/sdk` | a2a | Official Anthropic SDK — `messages.create` for Claude Haiku query classification and answer synthesis |
| `pg` | mcp-server, ingest | PostgreSQL client for Node.js — `pg.Pool` manages connections; used for all DB reads and writes |
| `pgvector` | mcp-server, ingest | Adds vector support to the `pg` driver — `pgvector.toSql(embedding)` serialises a `number[]` for storage; registers the `vector` type so results are automatically parsed back to arrays |
| `@aws-sdk/client-s3` | mcp-server, ingest | AWS SDK S3 client — `GetObjectCommand` streams object bytes from a bucket into a `Buffer` for parsing |
| `pdf-parse` | mcp-server, ingest | Extracts plain text from PDF buffers; returns `{ text, numpages }` |
| `mammoth` | mcp-server, ingest | Converts Word (`.docx`) buffers to plain text via `extractRawText({ buffer })` |
| `@langchain/textsplitters` | mcp-server, ingest | `RecursiveCharacterTextSplitter` splits long text at natural boundaries (paragraphs → sentences → words) before falling back to character splits; preserves context with configurable overlap |
| `express` | mcp-server, a2a | HTTP framework for the MCP server and the A2A agent servers (supervisor and specialist) |
| `zod` | mcp-server | Schema validation for MCP tool `inputSchema` definitions |

---

## Shared infrastructure

All parts share the same PostgreSQL database and the same OpenAI embedding model, so documents ingested via `ingest/` are immediately searchable by `mcp-server/` and `a2a/`.

```
PostgreSQL 15+ with pgvector
  └── documents   — one row per ingested file (id, filename, s3_key)
  └── chunks      — text chunks with vector(1536) embeddings (HNSW index)

OpenAI
  ├── text-embedding-3-small  — 1536-dim embeddings (ingestion + search)
  └── gpt-4o-mini             — answer generation (a2a specialist)

Anthropic Claude
  └── claude-haiku-4-5-20251001  — query classification + answer synthesis (a2a supervisor)

AWS S3 (optional)
  └── source documents (PDF, DOCX, TXT) — also works with LocalStack / MinIO
```

### Quick-start: local infrastructure

```bash
# PostgreSQL with pgvector (Docker)
docker run -d --name pgvector \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  pgvector/pgvector:pg17

# LocalStack for S3 (optional)
docker run -d --name localstack \
  -p 4566:4566 \
  -e SERVICES=s3 \
  localstack/localstack
```

---

## Environment variables

| Variable | Required by | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | mcp-server, ingest | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | mcp-server, a2a | — | OpenAI API key |
| `ANTHROPIC_API_KEY` | a2a (supervisor) | — | Anthropic API key |
| `API_PORT` | mcp-server | 443 | MCP server HTTP port |
| `MCP_SERVER_URL` | a2a | `http://localhost:3000/mcp` | URL of the running MCP server |
| `SPECIALIST_PORT` | a2a | 3101 | Specialist agent port |
| `SUPERVISOR_PORT` | a2a | 3100 | Supervisor agent port |
| `SPECIALIST_URL` | a2a | `http://localhost:3101` | Supervisor → specialist base URL |
| `AWS_REGION` | mcp-server, ingest | `us-east-1` | S3 region |
| `AWS_ENDPOINT_URL` | mcp-server, ingest | — | Custom S3 endpoint (LocalStack / MinIO) |
| `S3_BUCKET` | ingest demo | — | S3 bucket for demo S3 ingestion |
| `S3_KEY` | ingest demo | — | S3 key for demo S3 ingestion |
| `HTTPS` | mcp-server | — | Set to any value to enable HTTPS (requires `pems/`) |

---

## mcp-server/

An MCP (Model Context Protocol) server exposing RAG tools over Streamable HTTP. Any MCP-compatible client — Claude Desktop, an OpenAI Responses API call, or the a2a specialist — can discover and invoke these tools.

### Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/mcp` | Handle MCP client messages (initialize, tool calls) |
| `GET` | `/mcp` | Open SSE stream for server-to-client notifications |
| `DELETE` | `/mcp` | Terminate a session |
| `GET` | `/status` | Health check |

### Tools

| Tool | Description |
|---|---|
| `rag_add_document` | Ingest plain text into pgvector |
| `rag_ingest_s3` | Fetch a PDF, DOCX, or text file from S3, parse, chunk, embed, and store |
| `rag_search` | Hybrid vector + full-text search over the knowledge base |
| `rag_list_documents` | List all ingested documents |

### File map

```
mcp-server/
├── index.ts              — Express server, MCP session management
├── tools/
│   ├── index.ts          — Registers tools; entry point called by createMcpServer()
│   └── rag.ts            — pgvector-backed RAG tools (ingest, search, list)
├── resources/index.ts    — MCP resource: server-info
└── prompts/index.ts      — MCP prompt: review-code
```

### Run

```bash
# default port 3000
API_PORT=3000 \
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
OPENAI_API_KEY=sk-... \
npm run start

# Verify
curl http://localhost:3000/status
```

### Connect via MCP Inspector

```bash
npx @modelcontextprotocol/inspector
# → Select "Streamable HTTP", enter http://localhost:3000/mcp
```

### Connect via Claude Desktop

```json
{
  "mcpServers": {
    "sample-a2a-rag-mcp": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3000/mcp"]
    }
  }
}
```

---

## ingest/

The RAG ingestion pipeline as a TypeScript library and CLI demo. Documents are fetched from S3, parsed, chunked, embedded, and stored in PostgreSQL with pgvector directly (independent of the MCP server, since ingestion is typically a batch/async operation off the request path).

### Ingestion pipeline

```
S3 / local buffer / raw text
        │
        ▼
   extractText()          ← pdf-parse (PDF), mammoth (DOCX), UTF-8 (TXT/MD)
        │
        ▼
  splitText()             ← @langchain/textsplitters RecursiveCharacterTextSplitter
  (chunkSize=500, overlap=50)
        │
        ▼
  embedChunks()           ← OpenAI text-embedding-3-small (batches of 100)
        │
        ▼
  storeChunks()           ← INSERT INTO chunks (content, embedding, chunk_index)
```

### File map

```
ingest/
├── db.ts         — pg.Pool + pgvector type registration + initDb() (auto-creates schema)
├── s3.ts         — fetchFromS3(bucket, key) → Buffer
├── ingest.ts     — ingestText / ingestBuffer / ingestS3
├── demo.ts       — runnable demo: init DB → ingest sample docs
└── rag.sql       — standalone SQL schema (alternative to initDb())
```

### Run

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
OPENAI_API_KEY=sk-... \
node ingest/demo.ts

# With S3 ingestion
DATABASE_URL=... OPENAI_API_KEY=... \
AWS_ENDPOINT_URL=http://localhost:4566 \
S3_BUCKET=my-bucket S3_KEY=docs/report.pdf \
node ingest/demo.ts
```

### Apply schema manually (alternative to initDb)

```bash
psql postgres://postgres:postgres@localhost:5432/postgres -f ingest/rag.sql
```

### Ingesting your own files in code

```ts
import { ingestBuffer, ingestS3, ingestText } from './ingest.ts';
import { initDb } from './db.ts';

await initDb();

// Plain text
await ingestText('doc-1', 'My Document', 'The full text content...');

// Local file (PDF or DOCX)
import { readFileSync } from 'node:fs';
await ingestBuffer('doc-2', 'report.pdf', readFileSync('./report.pdf'));

// From S3
await ingestS3('my-bucket', 'documents/spec.docx');
```

Querying the ingested documents happens through the MCP server's `rag_search` tool — see `a2a/` below.

---

## a2a/

A two-agent system demonstrating the [Agent-to-Agent (A2A) protocol](https://google.github.io/A2A/).
Each agent is a standalone Express HTTP server with a JSON-RPC 2.0 task endpoint.

### A2A protocol

Agents expose two endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/.well-known/agent.json` | AgentCard — name, description, skills, capabilities |
| `POST` | `/` | `tasks/send` (JSON-RPC 2.0) — submit a task, receive result artifacts |

### Agent roles

**Supervisor** (port 3100, Claude Haiku)

1. Receives user query via `tasks/send`
2. Classifies it as `document-qa` or `general` using Claude
3. Delegates `document-qa` queries to the specialist via `sendTask`
4. Polishes the specialist's answer using Claude
5. Returns the final artifact

**Specialist** (port 3101, OpenAI)

1. Receives a delegated task from the supervisor
2. Connects to the `mcp-server`
3. Calls the `rag_search` MCP tool to retrieve relevant chunks
4. Generates an answer with `gpt-4o-mini`
5. Returns the answer as an artifact

### Data flow

```
User
 │  tasks/send  POST /
 ▼
Supervisor (3100)
 │  classify query → Claude Haiku
 │
 │  tasks/send  POST /
 ▼
Specialist (3101)
 │  rag_search → MCP (mcp-server :3000)
 │             → pgvector cosine + FTS
 │  generate   → OpenAI gpt-4o-mini
 │
 └─► answer → Supervisor
              │  synthesize → Claude Haiku
              └─► final answer → User
```

### File map

```
a2a/
├── a2a-client.ts   — getAgentCard() + sendTask() (A2A JSON-RPC 2.0 client)
├── mcp-client.ts   — connectMcp(url) → MCP Client
├── rag.ts          — ragQuery() via MCP rag_search + OpenAI (used by specialist)
├── specialist.ts   — Express server :3101, document-qa skill
├── supervisor.ts   — Express server :3100, general-query skill
└── demo.ts         — seeds DB via MCP, spawns both agents, runs 3 queries end-to-end
```

### Run

```bash
# Terminal 1 — MCP server (required by specialist)
API_PORT=3000 DATABASE_URL=... OPENAI_API_KEY=... npm run start

# Terminal 2 — Specialist
SPECIALIST_PORT=3101 MCP_SERVER_URL=http://localhost:3000/mcp \
OPENAI_API_KEY=sk-... npm run a2a:specialist

# Terminal 3 — Supervisor
SUPERVISOR_PORT=3100 SPECIALIST_URL=http://localhost:3101 \
ANTHROPIC_API_KEY=sk-ant-... npm run a2a:supervisor

# Or run everything with the demo (spawns both agents automatically)
MCP_SERVER_URL=http://localhost:3000/mcp \
OPENAI_API_KEY=sk-... \
ANTHROPIC_API_KEY=sk-ant-... \
npm run a2a:demo
```

### Fetch an agent card

```bash
curl http://localhost:3100/.well-known/agent.json | jq .
curl http://localhost:3101/.well-known/agent.json | jq .
```

### Send a task directly

```bash
curl -s -X POST http://localhost:3100/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":"t1","method":"tasks/send",
    "params":{
      "id":"t1",
      "message":{"role":"user","parts":[{"type":"text","text":"What is hybrid search?"}]}
    }
  }' | jq '.result.artifacts[0].parts[0].text'
```

---

## Full end-to-end demo

Run everything together to see the complete flow: documents ingested, exposed via MCP, queried through A2A.

```bash
# 1. Start infrastructure
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg17

# 2. Start the MCP server
API_PORT=3000 \
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
OPENAI_API_KEY=sk-... \
npm run start &

# 3. Ingest documents
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
OPENAI_API_KEY=sk-... \
npm run ingest:demo

# 4. Run the A2A demo (queries the ingested documents through MCP)
MCP_SERVER_URL=http://localhost:3000/mcp \
OPENAI_API_KEY=sk-... \
ANTHROPIC_API_KEY=sk-ant-... \
npm run a2a:demo
```

---

## Design notes

**Why separate ingestion (`ingest/`) from retrieval (`mcp-server/`)?**
Ingestion is a batch / async operation that often runs outside the request path (triggered by S3 events, uploads, or scheduled jobs). Retrieval is synchronous and latency-sensitive. Keeping them separate lets you scale and deploy them independently, while both share the same database.

**Why hybrid search instead of pure vector search?**
Vector search excels at semantic similarity but can miss exact matches for proper nouns, version numbers, or unusual terms. Full-text search handles those well. Reciprocal Rank Fusion (RRF) merges both ranked lists without needing to tune a weight parameter: `score = 1/(60+rank_vector) + 1/(60+rank_fts)`.

**Why does the supervisor always delegate to the specialist?**
The classification step (`document-qa` vs `general`) demonstrates the routing pattern. In practice you would add more specialists — a code-search agent, a calendar agent, etc. — and route based on query intent.

**Why `text-embedding-3-small` and not `text-embedding-3-large`?**
`text-embedding-3-small` produces 1536-dimensional vectors and is ~5× cheaper than the large variant. For most knowledge-base RAG tasks the quality difference is marginal. The `vector(1536)` column type in the schema must match the chosen model.
