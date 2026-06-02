// Unified comms service — broadcast (multi-recipient send)

import { sleep } from '@common/iso/sleep';
import { send } from './send.ts';
import type { BroadcastRecipientResult, BroadcastRequest, BroadcastResult, SendRequest } from './types.ts';

/**
 * Send the same message to multiple recipients.
 * Supports sequential (with delay) and concurrent (batched) modes.
 *
 * @example
 * import { broadcast } from '@common/node/comms/service/broadcast'
 *
 * const result = await broadcast({
 *   tenantId: 1,
 *   channel: 'whatsapp',
 *   recipients: ['+60111', '+60222', '+60333'],
 *   type: 'template',
 *   payload: { opts: { name: 'promo_blast', language: { code: 'en' }, components: [] } },
 *   options: { mode: 'sequential', delayMs: 1000 },
 * })
 *
 * console.log(result.sent, result.failed) // 3, 0
 */
export async function broadcast(req: BroadcastRequest): Promise<BroadcastResult> {
  const { recipients, options, ...sendParams } = req;
  const mode = options?.mode ?? 'sequential';
  const delayMs = options?.delayMs ?? 0;
  const concurrency = options?.concurrency ?? 5;

  const results: BroadcastRecipientResult[] = [];

  if (mode === 'sequential') {
    for (const to of recipients) {
      const result = await send({ ...sendParams, to } as SendRequest);
      results.push({ to, success: result.success, messageId: result.messageId, error: result.error });

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  } else {
    // Concurrent mode — process in batches of `concurrency`
    for (let i = 0; i < recipients.length; i += concurrency) {
      const batch = recipients.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(batch.map(to => send({ ...sendParams, to } as SendRequest)));

      for (let j = 0; j < batch.length; j++) {
        const settled = batchResults[j];
        if (settled.status === 'fulfilled') {
          results.push({
            to: batch[j],
            success: settled.value.success,
            messageId: settled.value.messageId,
            error: settled.value.error,
          });
        } else {
          results.push({
            to: batch[j],
            success: false,
            error: settled.reason?.message ?? 'Unknown error',
          });
        }
      }
    }
  }

  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    success: failed === 0,
    channel: req.channel,
    total: recipients.length,
    sent,
    failed,
    results,
  };
}
