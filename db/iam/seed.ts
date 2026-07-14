/**
 * Drizzle seed runner for db-iam.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node db-iam/seed.ts [seed-name]
 *
 * Examples:
 *   node db-iam/seed.ts                  # run all seeds in order
 *   node db-iam/seed.ts initial_roles    # run a single seed
 */

// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { seed as seedIamUsers } from './seeds/initial_iam_users.ts';
import { seed as seedOpenfga } from './seeds/initial_openfga.ts';
import { seed as seedRbac } from './seeds/initial_rbac.ts';
import { seed as seedRoles } from './seeds/initial_roles.ts';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
const seeds: Record<string, (db: NodePgDatabase<any>) => Promise<void>> = {
  initial_iam_users: seedIamUsers,
  initial_roles: seedRoles,
  initial_rbac: seedRbac,
  initial_openfga: seedOpenfga,
};

const target = process.argv[2];
const toRun = target ? [target] : Object.keys(seeds);

const unknown = toRun.filter(name => !seeds[name]);
if (unknown.length > 0) {
  console.error(`Unknown seed: ${unknown.join(', ')}. Available: ${Object.keys(seeds).join(', ')}`);
  process.exit(1);
}

for (const name of toRun) {
  console.log(`[seed] running ${name}...`);
  await seeds[name](db);
  console.log(`[seed] ${name} done`);
}

await pool.end();
