import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const dbPath = './dev.db';
// Single shared database — sample (public schema), iam (iam schema),
// and audit (audit schema) all live in this one PGlite instance.
const db = new PGlite(dbPath);
const server = new PGLiteSocketServer({
  db,
  port: 5432,
  host: '127.0.0.1',
});

await server.start();
console.log('[serve-db] listening on 127.0.0.1:5432 (public + iam + audit schemas)');

process.on('SIGINT', async () => {
  await server.stop();
  await db.close();
  process.exit(0);
});
