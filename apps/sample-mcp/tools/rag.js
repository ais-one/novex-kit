import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { searchHybrid } from '@common/node/rag/search';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import mammoth from 'mammoth';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import pgvector from 'pgvector/pg';
import { z } from 'zod';

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

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * @param {string} text
 * @returns {Promise<number[][]>}
 */
async function embedChunks(text) {
  const inputs = Array.isArray(text) ? text : [text];
  const response = await openai.embeddings.create({ model: 'text-embedding-3-small', input: inputs });
  return response.data.map(d => d.embedding);
}

/**
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {Promise<string>}
 */
async function extractText(buffer, filename) {
  if (filename.endsWith('.pdf')) {
    const pdf = new PDFParse(new Uint8Array(buffer));
    const result = await pdf.getText();
    return result.text;
  }
  if (filename.endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  return buffer.toString('utf-8');
}

/**
 * @param {string} docId
 * @param {string} filename
 * @param {string[]} chunks
 * @param {number[][]} embeddings
 * @param {import('pg').Pool} pool
 */
async function storeChunks(docId, filename, chunks, embeddings, pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO documents (id, filename) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [
      docId,
      filename,
    ]);
    for (let i = 0; i < chunks.length; i++) {
      await client.query(`INSERT INTO chunks (document_id, content, embedding, chunk_index) VALUES ($1, $2, $3, $4)`, [
        docId,
        chunks[i],
        pgvector.toSql(embeddings[i]),
        i,
      ]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server */
export default function initRagTools(server, db) {
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
      const parts = [];
      for await (const chunk of Body) parts.push(chunk);
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
