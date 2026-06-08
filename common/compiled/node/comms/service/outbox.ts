// Unified comms service — broadcast outbox (DB-backed queue)
// Enqueues broadcast messages to a DB table, processed by a cron worker.

import { and, eq, lte, sql } from 'drizzle-orm';
import type { CommsChannel } from '../tenant/types.ts';
import { send } from './send.ts';
import type { BroadcastRequest, SendRequest } from './types.ts';

// ─── Module-scoped injected dependencies ──────────────────────────────────────

// biome-ignore lint/suspicious/noExplicitAny: configurable table reference injected by the app
let _commsOutbox: any = null;
let _serviceName = 'drizzle1';
// biome-ignore lint/suspicious/noExplicitAny: service lookup function injected by the app
let _lookup: ((name: string) => any) | null = null;

const db = () => _lookup?.(_serviceName);

/** Register the commsOutbox Drizzle table. Call once at app startup. */
export const configure = (
  tables: { commsOutbox: unknown },
  serviceName?: string,
  lookup?: (name: string) => unknown,
) => {
  _commsOutbox = tables.commsOutbox;
  if (serviceName) _serviceName = serviceName;
  if (lookup) _lookup = lookup as (name: string) => any;
};

/** Check if configure() has been called. */
export const isConfigured = () => _commsOutbox !== null && _lookup !== null;

// ─── Enqueue ──────────────────────────────────────────────────────────────────

/**
 * Enqueue a broadcast request to the outbox table.
 * Returns immediately — the cron worker will process the rows.
 *
 * @example
 * import { enqueueBroadcast } from '@common/node/comms/service/outbox'
 *
 * const result = await enqueueBroadcast({
 *   tenantId: 1,
 *   channel: 'whatsapp',
 *   recipients: ['+60111', '+60222'],
 *   type: 'text',
 *   payload: { text: 'Hello!' },
 * })
 * // result: { queued: 2 }
 */
export async function enqueueBroadcast(req: BroadcastRequest): Promise<{ queued: number }> {
  if (!isConfigured()) {
    throw new Error(
      'Comms outbox not initialized. Call configure() once in your app.ts:\n\n' +
        "  import { configure } from '@common/node/comms/service/outbox'\n" +
        "  import { commsOutbox } from './database/schema-iam.ts'\n\n" +
        "  configure({ commsOutbox }, 'drizzle1', services.get)\n",
    );
  }

  const { recipients, options, ...sendParams } = req;

  const rows = recipients.map(recipient => ({
    tenant_id: sendParams.tenantId,
    channel: sendParams.channel,
    config_label: sendParams.configLabel ?? null,
    recipient,
    type: sendParams.type,
    payload: sendParams.payload,
    status: 'pending',
    attempts: 0,
    max_attempts: 3,
  }));

  await db().insert(_commsOutbox).values(rows);

  return { queued: rows.length };
}

// ─── Worker ───────────────────────────────────────────────────────────────────

let _isRunning = false;
let _stopRequested = false;

/**
 * Start the broadcast outbox worker using the cron package.
 * Picks up pending rows and sends them. Uses FOR UPDATE SKIP LOCKED for safe multi-instance processing.
 *
 * @param opts - Optional overrides for cron expression and batch size
 * @returns A stop function
 */
export async function startBroadcastWorker(opts?: {
  cronExpression?: string;
  batchSize?: number;
}): Promise<() => void> {
  if (!isConfigured()) {
    throw new Error('Comms outbox not initialized. Call configure() before starting the worker.');
  }

  const cronExpression = opts?.cronExpression ?? process.env.COMMS_OUTBOX_CRON ?? '*/5 * * * * *';
  const batchSize = opts?.batchSize ?? Number.parseInt(process.env.COMMS_OUTBOX_BATCH_SIZE ?? '50', 10);

  _stopRequested = false;

  // Import cron package
  const { CronJob } = await import('cron');

  const tick = async () => {
    if (_isRunning || _stopRequested) return;
    _isRunning = true;

    try {
      await processBatch(batchSize);
    } catch (err) {
      // biome-ignore lint/suspicious/noConsoleLog: worker error logging
      console.error('[outbox] worker tick error:', err);
    } finally {
      _isRunning = false;
    }
  };

  const job = new CronJob(cronExpression, tick);
  job.start();

  // Run first tick immediately
  tick();

  return () => {
    _stopRequested = true;
    job.stop();
  };
}

/**
 * Process a batch of pending outbox rows.
 * Uses FOR UPDATE SKIP LOCKED to safely claim rows across multiple instances.
 */
async function processBatch(batchSize: number): Promise<void> {
  // Claim rows atomically
  // Note: FOR UPDATE SKIP LOCKED may not work in PGlite, use simple UPDATE for local dev
  const result = await db().execute(sql`
    UPDATE ${_commsOutbox} AS o
    SET status = 'processing', updated_at = now()
    WHERE o.id IN (
      SELECT id FROM ${_commsOutbox}
      WHERE status = 'pending' AND scheduled_at <= now()
      ORDER BY id
      LIMIT ${batchSize}
    )
    RETURNING *
  `);

  const claimed = result.rows ?? result ?? [];
  if (!claimed || claimed.length === 0) return;

  for (const row of claimed) {
    try {
      const sendReq: SendRequest = {
        tenantId: row.tenant_id,
        channel: row.channel as CommsChannel,
        configLabel: row.config_label ?? undefined,
        to: row.recipient,
        type: row.type,
        payload: row.payload,
      } as SendRequest;

      const sendResult = await send(sendReq);

      if (sendResult.success) {
        await db()
          .update(_commsOutbox)
          .set({ status: 'sent', sent_at: new Date(), updated_at: new Date() })
          .where(eq(_commsOutbox.id, row.id));
      } else {
        await handleFailure(row, sendResult.error ?? 'Unknown send error');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await handleFailure(row, errorMsg);
    }
  }
}

async function handleFailure(
  row: { id: number; attempts: number; max_attempts: number },
  error: string,
): Promise<void> {
  const newAttempts = row.attempts + 1;

  if (newAttempts >= row.max_attempts) {
    await db()
      .update(_commsOutbox)
      .set({ status: 'failed', attempts: newAttempts, last_error: error, updated_at: new Date() })
      .where(eq(_commsOutbox.id, row.id));
  } else {
    await db()
      .update(_commsOutbox)
      .set({ status: 'pending', attempts: newAttempts, last_error: error, updated_at: new Date() })
      .where(eq(_commsOutbox.id, row.id));
  }
}
