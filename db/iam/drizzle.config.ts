import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './schema.ts',
  out: './drizzle',
  schemaFilter: ['iam'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/db_express',
  },
});
