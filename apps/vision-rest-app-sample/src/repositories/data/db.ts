import Knex, { type Knex as KnexType } from 'knex';

// This app's database is always PostgreSQL — never sqlite, never another RDBMS, never an
// in-memory store. Knex (not drizzle) is required here so `getDb()` can be handed straight to
// `@apps/vision-common/express/audit/audit-context.ts`'s `auditContext()`, which every mutating
// route in this app goes through — see docs/design/pg-audit-implementation.md §6. This is a
// local, standalone Knex instance rather than the shared `common/compiled/node/services/db/knex.ts`
// (`StoreKnex`) wrapper: that class exists so multiple unrelated cross-app config blocks can
// share one lifecycle shape, but this app has exactly one, simple `DATABASE_URL`-driven
// connection with no `globalThis.__config` block of its own to look up.

let db: KnexType | null = null;

/**
 * Connects to PostgreSQL (via `DATABASE_URL`) and ensures the `orders` table exists. A real
 * app would use a proper migration tool (e.g. `knex migrate`) instead of the inline
 * `createTableIfNotExists` below; this sample inlines it so it's runnable with nothing but a
 * running Postgres.
 */
export const openDb = async (): Promise<void> => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required — this app always runs against PostgreSQL. Copy .env.sample to .env and fill it in.',
    );
  }

  const connected = Knex({
    client: 'pg',
    connection: connectionString,
    pool: { min: 2, max: 10 },
  });

  await connected.raw('SELECT 1');
  if (!(await connected.schema.hasTable('orders'))) {
    await connected.schema.createTable('orders', table => {
      table.increments('id').primary();
      table.string('customer_email', 255).notNullable();
      table.jsonb('items').notNullable();
      table.integer('total_cents').notNullable();
      table.integer('total_eur_cents');
      table.integer('internal_risk_score').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
    });
  }

  db = connected;
  logger.info('postgres CONNECTED(vision-rest-app-sample)');
};

/** Returns the connected Knex instance. Throws if `openDb()` hasn't been called yet — a programmer error. */
export const getDb = (): KnexType => {
  if (!db) throw new Error('Database not connected — call openDb() first');
  return db;
};

/** Gracefully drains the connection pool. */
export const closeDb = async (): Promise<void> => {
  await db?.destroy();
  db = null;
  logger.info('postgres CLOSED(vision-rest-app-sample)');
};
