import MqKafka from '@apps/sample-common/services/mq/kafka';
import type { QueueHandler } from '@apps/sample-common/services/mq/types';

// Swapping the backend later (e.g. to SQS) means changing this one file — see
// apps/sample-common/services/mq/README.md — nothing in services/ or consumers/ changes.

const { topic = 'sample.events', groupId = 'sample-queue-consumer' } = globalThis.__config?.QUEUE_CONFIG ?? {};

const mq = new MqKafka('KAFKA_CONFIG');

export const connectQueue = (): Promise<void> => mq.open();

export const disconnectQueue = (): Promise<void> => mq.close();

export const subscribeToSampleEvents = (handler: QueueHandler): Promise<void> =>
  mq.subscribe(topic, handler, { groupId });
