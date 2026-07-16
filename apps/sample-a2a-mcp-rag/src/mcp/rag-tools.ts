import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import OpenAI from 'openai';
import { z } from 'zod';
import { searchHybrid } from '../lib/search.ts';
import { embedChunks, extractText, storeChunks } from '../rag/ingest.ts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  ...(process.env.AWS_ENDPOINT_URL ? { endpoint: process.env.AWS_ENDPOINT_URL, forcePathStyle: true } : {}),
});

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ['\n\n', '\n', '. ', ' ', ''],
});

export default function initRagTools(
  server: McpServer,
  // biome-ignore lint/suspicious/noExplicitAny: db comes from services.get() with dynamic type
  db: any,
) {
  const pool = db ? db.$client : null;

  // ── rag_add_document ──────────────────────────────────────────────────────
  server.registerTool(
    'rag_add_document',
    {
      title: 'Add Document',
      description: 'Ingest a plain-text document into the pgvector knowledge base',
      inputSchema: {
        id: z.string().describe('Unique document identifier'),
        title: z.string().describe('Document title (used as filename)'),
        content: z.string().describe('Document text content'),
      },
    },
    async ({ id, title, content }) => {
      const chunks = await splitter.splitText(content);
      const embeddings = await embedChunks(chunks);
      await storeChunks(id, title, chunks, embeddings, pool);
      return {
        content: [{ type: 'text', text: `Document "${id}" ingested (${chunks.length} chunks)` }],
      };
    },
  );

  // ── rag_ingest_s3 ─────────────────────────────────────────────────────────
  server.registerTool(
    'rag_ingest_s3',
    {
      title: 'Ingest Document from S3',
      description: 'Fetch a PDF, DOCX, or text file from S3, parse, chunk, embed, and store in pgvector',
      inputSchema: {
        bucket: z.string().describe('S3 bucket name'),
        key: z.string().describe('S3 object key / path'),
      },
    },
    async ({ bucket, key }) => {
      const filename = key.split('/').pop() ?? key;
      const existing = await pool.query('SELECT id FROM documents WHERE id = $1', [key]);
      if (existing.rows.length > 0) {
        return { content: [{ type: 'text', text: `Already ingested: ${key}` }] };
      }

      const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const parts: Buffer[] = [];
      for await (const chunk of Body as AsyncIterable<Buffer>) parts.push(chunk);
      const buffer = Buffer.concat(parts);

      const text = await extractText(buffer, filename);
      const chunks = await splitter.splitText(text);

      const BATCH = 100;
      for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH);
        const embeddings = await embedChunks(batch);
        await storeChunks(key, filename, batch, embeddings, pool);
      }

      return {
        content: [{ type: 'text', text: `Ingested s3://${bucket}/${key} (${chunks.length} chunks)` }],
      };
    },
  );

  // ── rag_search ────────────────────────────────────────────────────────────
  server.registerTool(
    'rag_search',
    {
      title: 'Search Documents',
      description: 'Hybrid vector + full-text search over the pgvector knowledge base',
      inputSchema: {
        query: z.string().describe('Search query text'),
        top_k: z.number().int().min(1).max(20).default(5).describe('Number of results to return'),
      },
    },
    async ({ query, top_k }) => {
      const rows = await searchHybrid(db, openai, query, top_k);
      return { content: [{ type: 'text', text: JSON.stringify(rows) }] };
    },
  );

  // ── rag_list_documents ────────────────────────────────────────────────────
  server.registerTool(
    'rag_list_documents',
    {
      title: 'List Documents',
      description: 'List all documents currently in the pgvector knowledge base',
      inputSchema: {},
    },
    async () => {
      const { rows } = await pool.query('SELECT id, filename, created_at FROM documents ORDER BY created_at DESC');
      return { content: [{ type: 'text', text: JSON.stringify(rows) }] };
    },
  );
}
