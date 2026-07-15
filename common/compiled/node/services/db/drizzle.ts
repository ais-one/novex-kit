import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';

/** Wraps a Drizzle + pg Pool connection, opened/closed by the services lifecycle. */
export default class StoreDrizzle {
  private _db: (NodePgDatabase & { $client: Pool }) | null = null;
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
      this._db = drizzle(pool);
      this._db.$client.on('error', (err: Error) => logger.error(`pg pool error(${this.name}): ${err.message}`));
      await this._db.$client.query('SELECT 1');
      try {
        const pgvector = await import('pgvector/pg');
        const client = await pool.connect();
        try {
          await pgvector.registerTypes(client);
        } finally {
          client.release();
        }
        logger.info(`pgvector registered(${this.name})`);
      } catch {
        // pgvector not required — silent skip for apps that don't use vector columns
      }
      logger.info(`drizzle CONNECTED(${this.name})`);
    } catch (e) {
      logger.error(`drizzle ERROR(${this.name}): ${String(e)}`);
    }
  }

  /** Returns the Drizzle instance, or null if not yet connected. */
  get(): NodePgDatabase | null {
    return this._db;
  }

  /** Gracefully drain the connection pool. */
  async close(): Promise<void> {
    await this._db?.$client.end();
    this._db = null;
    logger.info(`drizzle CLOSED(${this.name})`);
  }
}
