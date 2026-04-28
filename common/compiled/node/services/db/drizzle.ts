import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';

/** Wraps a Drizzle ORM connection, opened/closed by the services lifecycle. */
export default class StoreOrm {
  _DRIZZLE: PoolConfig | null;
  _db: ReturnType<typeof drizzle> | null;
  name: string;

  constructor(optionName?: string) {
    const options = optionName ? globalThis.__config?.[optionName] : {};
    if (options) options.connection = process.env[optionName ?? ''];
    this._DRIZZLE = options ?? null;
    this._db = null;
    this.name = optionName ?? '';
  }

  /** Connect to the database and verify connectivity with a `SELECT 1`. */
  async open(): Promise<void> {
    if (!this._DRIZZLE) {
      logger.info('DRIZZLE property empty or undefined - not started');
      return;
    }
    try {
      const client = new Pool(this._DRIZZLE);
      this._db = drizzle({ client });
      await this._db
        .execute(sql`SELECT 1`)
        .then(() => logger.info(`drizzle CONNECTED(${this.name})`))
        .catch(err => logger.info(`drizzle ERROR1(${this.name}): ${err.toString()}`));
    } catch (e) {
      logger.info(`drizzle ERROR2(${this.name}): ${String(e)}`);
    }
  }

  /** Returns the underlying Drizzle instance, or null if not yet connected. */
  get(): ReturnType<typeof drizzle> | null {
    return this._db;
  }

  /** Destroy the connection pool and release all resources. */
  async close(): Promise<void> {
    if (this._db) await this._db?.$client.end();
    logger.info(`drizzle CLOSED(${this.name})`);
  }
}
