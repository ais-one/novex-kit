import { randomUUID } from 'node:crypto';
import { REQUEST_ID_MESSAGE_HEADER } from '@apps/sample-common/services/mq/types';
import { ValidationError } from '@common/node/errors/AppError';
import { createLogger } from '@common/node/logging/context';
import { connectQueue, disconnectQueue, subscribeToSampleEvents } from '../repositories/external/queue.repository.ts';
import { processSampleEvent, sampleEventSchema } from '../services/sample-event.service.ts';

/**
 * The "controller" of a message-driven app: extract/mint the requestId, parse/validate the
 * raw message, call one service function, log the outcome — see the clean-architecture and
 * structured-logging skills. No business logic lives here.
 */
export const startSampleEventConsumer = async (): Promise<void> => {
  await connectQueue();
  await subscribeToSampleEvents(async message => {
    const requestId = message.headers?.[REQUEST_ID_MESSAGE_HEADER] ?? randomUUID();
    const log = createLogger(logger, { requestId, layer: 'controller', fn: 'sampleEventConsumer' });
    log.info('message received');

    let event: Awaited<ReturnType<typeof sampleEventSchema.parseAsync>>;
    try {
      event = sampleEventSchema.parse(JSON.parse(message.value.toString()));
    } catch (cause) {
      // Log once, here, with the full cause chain — the malformed message is expected to
      // sometimes happen (an external producer's bug), not a bug in this consumer.
      const error = new ValidationError('sample event failed schema validation', undefined, { cause });
      log.error(error.message, { code: error.code, stack: error.stack });
      return;
    }

    try {
      await processSampleEvent(event, log.scope({ layer: 'service', fn: 'processSampleEvent' }));
      log.info('message processed');
    } catch (cause) {
      log.error('message processing failed', { stack: cause instanceof Error ? cause.stack : String(cause) });
    }
  });
};

export const stopSampleEventConsumer = (): Promise<void> => disconnectQueue();
