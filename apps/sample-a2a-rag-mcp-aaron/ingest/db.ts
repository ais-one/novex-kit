import pg from 'pg';
import pgvector from 'pgvector/pg';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await pgvector.registerType(client);
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS vector;

      CREATE TABLE IF NOT EXISTS documents (
        id         TEXT PRIMARY KEY,
        filename   TEXT NOT NULL,
        s3_key     TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id          SERIAL PRIMARY KEY,
        document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
        content     TEXT NOT NULL,
        embedding   vector(1536),
        chunk_index INTEGER,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS chunks_embedding_idx
        ON chunks USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);

      CREATE INDEX IF NOT EXISTS chunks_fts_idx
        ON chunks USING gin(to_tsvector('english', content));
    `);
  } finally {
    client.release();
  }
}
