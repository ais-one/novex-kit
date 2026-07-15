import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

// Register pgvector type parser for automatic vector column deserialization
try {
  const { default: pgvector } = await import('pgvector/pg');
  const client = await pool.connect();
  try {
    await pgvector.registerTypes(client);
  } finally {
    client.release();
  }
} catch {
  // pgvector not available — vector columns returned as strings instead of arrays
}
