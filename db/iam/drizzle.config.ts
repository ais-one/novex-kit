import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './schema.ts',
  out: './drizzle',
  schemaFilter: ['iam'],
  // Own history table: drizzle skips migrations older than the newest recorded one, so sharing the default table with db/sample skips iam's on a fresh DB
  migrations: { table: '__drizzle_migrations_iam', schema: 'drizzle' },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/db_express',
  },
});
