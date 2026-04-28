/**
 * Drizzle seed runner — replaces `knex seed:run`.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node db-sample/seed.ts [seed-name]
 *
 * Examples:
 *   node db-sample/seed.ts                     # run all seeds in order
 *   node db-sample/seed.ts initial_users       # run a single seed
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { seed as seedOpenfga } from './seeds/initial_openfga.ts';
import { seed as seedRbac } from './seeds/initial_rbac.ts';
import { seed as seedTestdata } from './seeds/initial_testdata.ts';
import { seed as seedUsers } from './seeds/initial_users.ts';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const seeds: Record<string, (db: typeof db) => Promise<void>> = {
  initial_users: seedUsers,
  initial_testdata: seedTestdata,
  initial_rbac: seedRbac,
  initial_openfga: seedOpenfga,
};

const target = process.argv[2];

try {
  if (target) {
    const fn = seeds[target];
    if (!fn) {
      console.error(`Unknown seed: "${target}". Available: ${Object.keys(seeds).join(', ')}`);
      process.exit(1);
    }
    console.log(`Running seed: ${target}`);
    await fn(db);
    console.log(`Done: ${target}`);
  } else {
    for (const [name, fn] of Object.entries(seeds)) {
      console.log(`Running seed: ${name}`);
      await fn(db);
      console.log(`Done: ${name}`);
    }
  }
} finally {
  await pool.end();
}
