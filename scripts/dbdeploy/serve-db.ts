import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

// Single shared database — db-sample (public schema), db-iam (iam schema),
// and db-audit (audit schema) all live in this one PGlite instance.
const db = new PGlite('./db-sample/dev.db');
const server = new PGLiteSocketServer({
  db,
  port: 55432,
  host: '127.0.0.1',
});

await server.start();
console.log('[serve-db] listening on 127.0.0.1:55432 (public + iam + audit schemas)');

process.on('SIGINT', async () => {
  await server.stop();
  await db.close();
  process.exit(0);
});
