import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './schema.ts',
  out: './drizzle',
  schemaFilter: ['iam'],
  migrations: { schema: 'drizzle_iam' },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/db_express?sslmode=disable',
  },
});
