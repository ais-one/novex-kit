import OpenAI from 'openai';
import pgvector from 'pgvector/pg';
import { pool } from './db.ts';

export interface SearchResult {
  content: string;
  filename: string;
  docId: string;
  similarity: number;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedQuery(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  return response.data[0].embedding;
}

export async function searchVector(query: string, topK = 5): Promise<SearchResult[]> {
  const embedding = await embedQuery(query);
  const { rows } = await pool.query(
    `SELECT c.content, d.filename, d.id AS doc_id,
            1 - (c.embedding <=> $1) AS similarity
     FROM chunks c
     JOIN documents d ON c.document_id = d.id
     ORDER BY c.embedding <=> $1
     LIMIT $2`,
    [pgvector.toSql(embedding), topK],
  );
  return rows.map(r => ({ content: r.content, filename: r.filename, docId: r.doc_id, similarity: r.similarity }));
}

// Hybrid search: vector + full-text via Reciprocal Rank Fusion.
// Outperforms pure vector search for queries with specific keywords.
export async function searchHybrid(query: string, topK = 5): Promise<SearchResult[]> {
  const embedding = await embedQuery(query);
  const { rows } = await pool.query(
    `WITH vector_search AS (
       SELECT c.id, c.content, d.filename, d.id AS doc_id,
              ROW_NUMBER() OVER (ORDER BY c.embedding <=> $1) AS rank
       FROM chunks c JOIN documents d ON c.document_id = d.id
       LIMIT 20
     ),
     fts_search AS (
       SELECT c.id, c.content, d.filename, d.id AS doc_id,
              ROW_NUMBER() OVER (
                ORDER BY ts_rank(to_tsvector('english', c.content),
                                 plainto_tsquery('english', $2)) DESC
              ) AS rank
       FROM chunks c JOIN documents d ON c.document_id = d.id
       WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', $2)
       LIMIT 20
     )
     SELECT
       COALESCE(v.content, f.content) AS content,
       COALESCE(v.filename, f.filename) AS filename,
       COALESCE(v.doc_id, f.doc_id) AS doc_id,
       (COALESCE(1.0 / (60 + v.rank), 0) + COALESCE(1.0 / (60 + f.rank), 0)) AS similarity
     FROM vector_search v
     FULL OUTER JOIN fts_search f ON v.id = f.id
     ORDER BY similarity DESC
     LIMIT $3`,
    [pgvector.toSql(embedding), query, topK],
  );
  return rows.map(r => ({ content: r.content, filename: r.filename, docId: r.doc_id, similarity: r.similarity }));
}
