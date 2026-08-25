import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import mammoth from 'mammoth';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import type { Pool } from 'pg';
import pgvector from 'pgvector/pg';
import { fetchFromS3 } from './s3.ts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ['\n\n', '\n', '. ', ' ', ''],
});

export async function embedChunks(text: string | string[]): Promise<number[][]> {
  const inputs = Array.isArray(text) ? text : [text];
  const response = await openai.embeddings.create({ model: 'text-embedding-3-small', input: inputs });
  return response.data.map(d => d.embedding);
}

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
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

export async function storeChunks(
  docId: string,
  filename: string,
  chunks: string[],
  embeddings: number[][],
  pool: Pool,
): Promise<void> {
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

export async function ingestText(docId: string, title: string, text: string, pool: Pool): Promise<void> {
  const existing = await pool.query('SELECT id FROM documents WHERE id = $1', [docId]);
  if (existing.rows.length > 0) return;

  await pool.query('INSERT INTO documents (id, filename) VALUES ($1, $2)', [docId, title]);

  const chunks = await splitter.splitText(text);
  const embeddings = await embedChunks(chunks);
  await storeChunks(docId, title, chunks, embeddings, pool);

  console.log(`[ingest] stored ${chunks.length} chunks from "${title}"`);
}

export async function ingestBuffer(docId: string, filename: string, buffer: Buffer, pool: Pool): Promise<void> {
  const existing = await pool.query('SELECT id FROM documents WHERE id = $1', [docId]);
  if (existing.rows.length > 0) {
    console.log(`[ingest] already ingested: ${docId}`);
    return;
  }

  await pool.query('INSERT INTO documents (id, filename) VALUES ($1, $2)', [docId, filename]);

  const text = await extractText(buffer, filename);
  const chunks = await splitter.splitText(text);

  const BATCH = 100;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await embedChunks(batch);
    await storeChunks(docId, filename, batch, embeddings, pool);
  }

  console.log(`[ingest] stored ${chunks.length} chunks from ${filename}`);
}

export async function ingestS3(bucket: string, key: string, pool: Pool): Promise<void> {
  const docId = key;
  const filename = key.split('/').pop() ?? key;
  const existing = await pool.query('SELECT id FROM documents WHERE id = $1', [docId]);
  if (existing.rows.length > 0) {
    console.log(`[ingest] already ingested: ${key}`);
    return;
  }

  await pool.query('INSERT INTO documents (id, filename, s3_key) VALUES ($1, $2, $3)', [docId, filename, key]);

  const buffer = await fetchFromS3(bucket, key);
  const text = await extractText(buffer, filename);
  const chunks = await splitter.splitText(text);

  const BATCH = 100;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await embedChunks(batch);
    await storeChunks(docId, filename, batch, embeddings, pool);
  }

  console.log(`[ingest] stored ${chunks.length} chunks from s3://${bucket}/${key}`);
}
