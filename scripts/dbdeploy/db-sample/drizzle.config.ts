import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: '../../../common/compiled/node/services/db/schema.ts',
  out: './drizzle',
  schemaFilter: ['public'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/dev',
  },
});
