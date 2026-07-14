import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

// Usage: npm run serve -- --dbpath ../../db/dev.db
const dbpathFlagIndex = process.argv.indexOf('--dbpath');
const dbPath = dbpathFlagIndex !== -1 ? process.argv[dbpathFlagIndex + 1] : '../../db/dev.db';

// Single shared database — sample (public schema), iam (iam schema),
// and audit (audit schema) all live in this one PGlite instance.
const db = new PGlite(dbPath);
const server = new PGLiteSocketServer({
  db,
  port: 5432,
  host: '127.0.0.1',
});

await server.start();
console.log(`[serve-db] listening on 127.0.0.1:5432 (public + iam + audit schemas), db: ${dbPath}`);

process.on('SIGINT', async () => {
  await server.stop();
  await db.close();
  process.exit(0);
});
