/**
 * Drizzle seed runner for db-audit.
 *
 * Audit tables are append-only and do not need application-level seeds.
 * This file exists as a placeholder and for any future reference data seeds.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node db-audit/seed.ts
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  console.log('[db-audit] No seeds to run — audit tables are append-only.');
  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
