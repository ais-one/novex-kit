import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: '../../../apps/sample-api/src/database/schema-audit.ts',
  out: './drizzle',
  schemaFilter: ['audit'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/db_express',
  },
});
