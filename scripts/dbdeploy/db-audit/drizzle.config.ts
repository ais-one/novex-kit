import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: '../../../common/compiled/node/services/db-audit/schema.ts',
  out: './drizzle',
  schemaFilter: ['audit'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/db_express',
  },
});
