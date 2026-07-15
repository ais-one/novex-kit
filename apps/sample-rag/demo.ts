/**
 * RAG demo — ingest documents then answer queries using pgvector + OpenAI.
 *
 * Prerequisites:
 *   1. PostgreSQL with pgvector:
 *        docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg17
 *   2. Apply schema:
 *        npm run db:migrate --workspace=db/rag
 *
 * Run:
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
 *   OPENAI_API_KEY=sk-... \
 *   node demo.ts
 *
 * S3 ingestion (optional — requires AWS credentials or LocalStack):
 *   AWS_REGION=us-east-1 \
 *   AWS_ENDPOINT_URL=http://localhost:4566 \   <- LocalStack
 *   node demo.ts --s3
 */

import '@common/node/logger';
import '@common/node/config';
import { ragQuery } from '@common/node/rag/rag-query';
import OpenAI from 'openai';
import { db } from './db.ts';
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

const QUERIES = [
  'What is RAG and how does it reduce hallucination?',
  'Which PostgreSQL index type should I use for fast vector search?',
  'How does hybrid search work and when is it better than pure vector search?',
  'How does the document parsing pipeline handle PDFs and Word documents?',
];

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Ingest: text strings (always) ────────────────────────────────────────────
console.log('── Ingesting text documents ─────────────────────────');
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

// ── Query ────────────────────────────────────────────────────────────────────
console.log('\n── RAG Queries (hybrid pgvector search + OpenAI) ────');
for (const query of QUERIES) {
  console.log(`\nQ: ${query}`);
  const answer = await ragQuery(db, openai, query);
  console.log(`A: ${answer}`);
  console.log('─'.repeat(54));
}

process.exit(0);
