import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: '../../../apps/base-iam/src/database/schema-iam.ts',
  out: './drizzle',
  schemaFilter: ['iam'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/db_express',
  },
});
