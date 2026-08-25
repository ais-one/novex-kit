/**
 * Ingestion demo — loads sample documents into the pgvector knowledge base.
 *
 * Retrieval happens through the MCP server's rag_search tool (see mcp-server/tools/rag.ts),
 * exercised end-to-end by ../a2a/demo.ts — this script only covers ingestion.
 *
 * Prerequisites:
 *   1. PostgreSQL with pgvector:
 *        docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg17
 *   2. Apply schema:
 *        psql $DATABASE_URL -f rag.sql
 *      (or let initDb() handle it automatically — see below)
 *
 * Run:
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
 *   OPENAI_API_KEY=sk-... \
 *   node ingest/demo.ts
 *
 * S3 ingestion (optional — requires AWS credentials or LocalStack):
 *   AWS_REGION=us-east-1 \
 *   AWS_ENDPOINT_URL=http://localhost:4566 \   ← LocalStack
 *   S3_BUCKET=my-bucket S3_KEY=docs/report.pdf \
 *   node ingest/demo.ts
 */

import { initDb } from './db.ts';
import { ingestS3, ingestText } from './ingest.ts';

const SAMPLE_DOCS = [
  {
    id: 'doc-rag',
    title: 'RAG Architecture',
    content:
      'Retrieval-Augmented Generation (RAG) combines a retrieval step with LLM generation. ' +
      'A query retrieves the most relevant document chunks from a knowledge base, which are then passed as context. ' +
      'This grounds responses in real data and reduces hallucination. ' +
      'Hybrid retrieval (vector + full-text) further improves accuracy for keyword-heavy queries.',
  },
  {
    id: 'doc-pgvector',
    title: 'pgvector Extension',
    content:
      'pgvector adds vector similarity search to PostgreSQL. ' +
      'The vector(1536) column stores OpenAI embeddings. ' +
      'HNSW indexes enable fast approximate nearest-neighbour queries. ' +
      'Cosine distance (<=> operator) is the correct metric for OpenAI text-embedding-3-small.',
  },
  {
    id: 'doc-chunking',
    title: 'Document Chunking Strategies',
    content:
      'RecursiveCharacterTextSplitter from @langchain/textsplitters splits text at natural boundaries ' +
      '(paragraphs, sentences, words) before falling back to character splits. ' +
      'Chunk size ~500 tokens balances context preservation with retrieval precision. ' +
      'A 50-token overlap prevents information loss at chunk boundaries.',
  },
  {
    id: 'doc-s3',
    title: 'S3 Document Storage',
    content:
      'Source documents are stored in Amazon S3 (or a compatible store like LocalStack / MinIO). ' +
      'The ingestion pipeline fetches the raw file via GetObjectCommand, ' +
      'detects the file type from the extension, ' +
      'parses it with pdf-parse (PDF) or mammoth (DOCX), ' +
      'then chunks and embeds the extracted text.',
  },
  {
    id: 'doc-hybrid',
    title: 'Hybrid Search with RRF',
    content:
      'Hybrid search combines dense vector search and sparse full-text search (PostgreSQL tsvector/tsquery). ' +
      'Reciprocal Rank Fusion (RRF) merges the two ranked lists: score = 1/(60+rank_vector) + 1/(60+rank_fts). ' +
      'This is more robust than pure vector search when queries contain exact keywords or entity names.',
  },
];

// ── Bootstrap ────────────────────────────────────────────────────────────────
console.log('── Initialising database ────────────────────────────');
await initDb();

// ── Ingest: text strings (always) ────────────────────────────────────────────
console.log('\n── Ingesting text documents ─────────────────────────');
for (const doc of SAMPLE_DOCS) {
  await ingestText(doc.id, doc.title, doc.content);
}

// ── Ingest: local buffer (shows PDF/DOCX path without real files) ─────────────
// To ingest a local PDF or DOCX, add this import at the top of the file:
//   import { ingestBuffer } from './ingest.ts';
//   import { readFileSync } from 'node:fs';
// Then call:
//   await ingestBuffer('local-pdf', 'sample.pdf', readFileSync('./sample.pdf'));

// ── Ingest: S3 (optional — set env vars to enable) ───────────────────────────
const S3_BUCKET = process.env.S3_BUCKET;
const S3_KEY = process.env.S3_KEY;
if (S3_BUCKET && S3_KEY) {
  console.log(`\n── Ingesting from S3: s3://${S3_BUCKET}/${S3_KEY} ─────`);
  await ingestS3(S3_BUCKET, S3_KEY);
}

console.log('\nDone. Query the ingested documents through the MCP server (rag_search) —');
console.log('see ../a2a/demo.ts for an end-to-end retrieval example.');

process.exit(0);
