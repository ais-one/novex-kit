-- Run once to set up the RAG schema.
-- Requires PostgreSQL 15+ with the pgvector extension installed.
-- With Docker: docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg17

CREATE EXTENSION IF NOT EXISTS vector;

-- Source documents (one row per ingested file)
CREATE TABLE IF NOT EXISTS documents (
  id         TEXT PRIMARY KEY,        -- e.g. S3 key or a user-supplied ID
  filename   TEXT NOT NULL,
  s3_key     TEXT,                    -- null for directly ingested text
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Text chunks with vector embeddings (1536 dims = text-embedding-3-small)
CREATE TABLE IF NOT EXISTS chunks (
  id          SERIAL PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   vector(1536),
  chunk_index INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast approximate nearest-neighbour search (cosine distance)
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN index for full-text search (hybrid retrieval)
CREATE INDEX IF NOT EXISTS chunks_fts_idx
  ON chunks USING gin(to_tsvector('english', content));
