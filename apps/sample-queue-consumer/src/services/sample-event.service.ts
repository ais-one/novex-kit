import type { ContextLogger } from '@common/node/logging/context';
import { z } from 'zod';

export const sampleEventSchema = z.object({
  id: z.string(),
  occurredAt: z.iso.datetime(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type SampleEvent = z.infer<typeof sampleEventSchema>;

/**
 * Business logic for one consumed event — no queue/HTTP/Express concepts here, so this is
 * testable and reusable on its own. `log` is injected (not the bare global `logger`) so every
 * log line carries this event's requestId — see the structured-logging skill. Replace the
 * body with real behaviour; this sample only logs a domain event, to prove the
 * consumer → service → repository wiring end to end.
 */
export const processSampleEvent = async (event: SampleEvent, log: ContextLogger): Promise<void> => {
  log.info('sample-event.processed', { eventId: event.id, occurredAt: event.occurredAt });
};
