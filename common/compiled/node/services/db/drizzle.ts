import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

/** Wraps a Drizzle + pg Pool connection, opened/closed by the services lifecycle. */
export default class StoreDrizzle {
  private _pool: Pool | null = null;
  private _db: NodePgDatabase<typeof schema> | null = null;
  private readonly _connectionString: string | null = null;
  name: string;

  constructor(optionName?: string) {
    const connectionString = process.env[optionName ?? ''] ?? null;
    this._connectionString = connectionString;
    this.name = optionName ?? '';
  }

  /** Connect to the database using a pg Pool and verify with SELECT 1. */
  async open(): Promise<void> {
    if (!this._connectionString) {
      logger.info(`StoreDrizzle(${this.name}): connection string missing — skipping`);
      return;
    }
    try {
      this._pool = new Pool({
        connectionString: this._connectionString,
        min: 2,
        max: 10,
      });
      this._pool.on('error', (err: Error) => logger.error(`pg pool error(${this.name}): ${err.message}`));
      this._db = drizzle(this._pool, { schema });
      // Verify connectivity
      await this._pool.query('SELECT 1');
      logger.info(`drizzle CONNECTED(${this.name})`);
    } catch (e) {
      logger.error(`drizzle ERROR(${this.name}): ${String(e)}`);
    }
  }

  /** Returns the Drizzle instance, or null if not yet connected. */
  get(): NodePgDatabase<typeof schema> | null {
    return this._db;
  }

  /** Gracefully drain the connection pool. */
  async close(): Promise<void> {
    await this._pool?.end();
    this._pool = null;
    this._db = null;
    logger.info(`drizzle CLOSED(${this.name})`);
  }
}
