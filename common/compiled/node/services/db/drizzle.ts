import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './schema.ts';

/** Wraps a Drizzle + pg Pool connection, opened/closed by the services lifecycle. */
export default class StoreDrizzle {
  private _db: (NodePgDatabase<typeof schema> & { $client: Pool }) | null = null;
  private readonly _connectionString: string | null;
  private readonly _poolOptions: Omit<PoolConfig, 'connectionString'>;
  name: string;

  constructor(optionName?: string) {
    this._connectionString = process.env[optionName ?? ''] ?? null;
    this._poolOptions = optionName ? (globalThis.__config?.[optionName] ?? {}) : {};
    this.name = optionName ?? '';
  }

  /** Connect to the database using a pg Pool and verify with SELECT 1. */
  async open(): Promise<void> {
    if (!this._connectionString) {
      logger.info(`StoreDrizzle(${this.name}): connection string missing — skipping`);
      return;
    }
    try {
      const pool = new Pool({ ...this._poolOptions, connectionString: this._connectionString });
      this._db = drizzle(pool, { schema });
      this._db.$client.on('error', (err: Error) => logger.error(`pg pool error(${this.name}): ${err.message}`));
      await this._db.$client.query('SELECT 1');
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
    await this._db?.$client.end();
    this._db = null;
    logger.info(`drizzle CLOSED(${this.name})`);
  }
}
