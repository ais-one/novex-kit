import type { SASLOptions } from 'kafkajs';

// ─── Provider-agnostic contract ───────────────────────────────────────────────

/**
 * Same canonical name as `@common/node/express/requestId.ts`'s `REQUEST_ID_HEADER` — redefined
 * here rather than imported, since queue messages have nothing to do with Express. A producer
 * publishing a message that resulted from a traced HTTP request or another traced unit of work
 * should set `headers[REQUEST_ID_MESSAGE_HEADER]` to that requestId; a consumer should read it
 * back (falling back to a freshly minted id if absent) so the trace survives across the queue —
 * see the structured-logging skill.
 */
export const REQUEST_ID_MESSAGE_HEADER = 'x-request-id';

/** Message envelope every MQ backend publishes and receives — never a provider-specific shape. */
export type QueueMessage = {
  key?: string;
  value: string | Buffer;
  headers?: Record<string, string>;
};

export type QueueHandler = (message: QueueMessage) => Promise<void> | void;

export type SubscribeOptions = {
  /** Consumer group / subscription name. Backend-specific meaning (Kafka: consumer group). Defaults to `<service name>-group`. */
  groupId?: string;
};

/**
 * Contract every MQ backend implements, so a consuming app never depends on a specific
 * provider's client. To add a backend (e.g. SQS): create a class in this folder implementing
 * this interface and export it alongside `MqKafka` — see mq/README.md.
 */
export interface QueueDriver {
  open(): Promise<void>;
  close(): Promise<void>;
  publish(topic: string, message: QueueMessage): Promise<void>;
  subscribe(topic: string, handler: QueueHandler, options?: SubscribeOptions): Promise<void>;
  /** Escape hatch to the underlying client, for provider-specific needs not covered above. */
  get(): unknown;
}

// ─── Kafka backend config ─────────────────────────────────────────────────────

export type KafkaConfig = {
  clientId: string;
  brokers: string[];
  ssl?: boolean;
  /**
   * Only the username/password mechanisms — narrowed on purpose from kafkajs's full
   * `SASLOptions | Mechanism` union (which also covers AWS IAM and custom providers,
   * unneeded here), but derived from it via `Extract` so it can't drift out of sync.
   * `password` is required: if `sasl` is set, something must supply a password — see
   * the `<options key>_SASL_PASSWORD` env var override in kafka.ts.
   */
  sasl?: Extract<SASLOptions, { mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512' }>;
};
