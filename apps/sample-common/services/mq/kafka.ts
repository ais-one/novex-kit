import { type Consumer, Kafka, type LogEntry, logLevel, type Producer } from 'kafkajs';
import type { KafkaConfig, QueueDriver, QueueHandler, QueueMessage, SubscribeOptions } from './types.ts';

const toLoggerLevel = (level: logLevel): 'error' | 'warn' | 'info' | 'debug' => {
  switch (level) {
    case logLevel.ERROR:
    case logLevel.NOTHING:
      return 'error';
    case logLevel.WARN:
      return 'warn';
    case logLevel.DEBUG:
      return 'debug';
    default:
      return 'info';
  }
};

/** Forwards kafkajs's internal logs into the global `logger` instead of stdout — see docs/conventions.md's no-console rule. */
const logCreator =
  () =>
  ({ namespace, level, log }: LogEntry) => {
    const { message, ...meta } = log;
    logger[toLoggerLevel(level)](`kafka[${namespace}] ${message}`, meta);
  };

const normalizeHeaders = (headers?: Record<string, unknown>): Record<string, string> | undefined => {
  if (!headers) return undefined;
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, Buffer.isBuffer(value) ? value.toString() : String(value)]),
  );
};

/**
 * Wraps a KafkaJS producer + consumer(s). Implements the shared `QueueDriver` contract —
 * see mq/types.ts and mq/README.md. Each app that uses this owns and manages its own
 * instance (call `open()` on startup, `close()` on shutdown) — there is no shared registry,
 * since every consuming app is meant to be its own independent deployment unit.
 */
export default class MqKafka implements QueueDriver {
  _config: KafkaConfig | null;
  _kafka: Kafka | null;
  _producer: Producer | null;
  _consumers: Consumer[];
  name: string;

  constructor(optionName?: string) {
    const raw = optionName ? (globalThis.__config?.[optionName] as KafkaConfig | undefined) : undefined;
    const envPassword = optionName ? process.env[`${optionName}_SASL_PASSWORD`] : undefined;
    this._config = raw
      ? { ...raw, sasl: raw.sasl && { ...raw.sasl, password: envPassword ?? raw.sasl.password } }
      : null;
    this._kafka = null;
    this._producer = null;
    this._consumers = [];
    this.name = optionName ?? '';
  }

  /** Connect the producer. Consumers are created lazily, one per `subscribe()` call. */
  async open(): Promise<void> {
    if (!this._config) {
      logger.info('KAFKA_CONFIG property empty or undefined - kafka not started');
      return;
    }
    try {
      this._kafka = new Kafka({ ...this._config, logCreator });
      this._producer = this._kafka.producer();
      await this._producer.connect();
      logger.info(`kafka CONNECTED(${this.name})`);
    } catch (e) {
      logger.info(`kafka ERROR(${this.name}): ${String(e)}`);
      // Kafka() itself never throws — only connect() can fail — so roll back to a clean
      // "not connected" state rather than leaving _kafka set with a producer that never connected.
      this._kafka = null;
      this._producer = null;
    }
  }

  /** Returns the underlying Kafka client, or null if not yet connected — escape hatch for provider-specific needs. */
  get(): Kafka | null {
    return this._kafka;
  }

  /** Publish one message to a topic. */
  async publish(topic: string, message: QueueMessage): Promise<void> {
    if (!this._producer) throw new Error(`kafka(${this.name}) producer not connected — call open() first`);
    await this._producer.send({
      topic,
      messages: [{ key: message.key, value: message.value, headers: message.headers }],
    });
  }

  /**
   * Subscribe to a topic with a consumer group. Throws only if `open()` was never called or
   * never successfully connected — a programmer error. A connection failure while actually
   * subscribing (broker unreachable) is logged, not thrown, matching `open()`'s resilience —
   * an unreachable broker must not crash the process. A `handler` error is likewise logged,
   * not rethrown, so one bad message doesn't crash the whole consumer run loop.
   */
  async subscribe(topic: string, handler: QueueHandler, options: SubscribeOptions = {}): Promise<void> {
    if (!this._kafka) throw new Error(`kafka(${this.name}) not connected — call open() first`);
    const groupId = options.groupId ?? `${this.name || 'default'}-group`;
    const consumer = this._kafka.consumer({ groupId });
    try {
      await consumer.connect();
      await consumer.subscribe({ topic });
      await consumer.run({
        eachMessage: async ({ message }) => {
          try {
            await handler({
              key: message.key?.toString(),
              value: message.value ?? Buffer.alloc(0),
              headers: normalizeHeaders(message.headers),
            });
          } catch (e) {
            logger.error(`kafka(${this.name}) handler error on topic ${topic}: ${String(e)}`);
          }
        },
      });
      this._consumers.push(consumer);
    } catch (e) {
      logger.info(`kafka(${this.name}) subscribe ERROR on topic ${topic}: ${String(e)}`);
    }
  }

  /** Disconnect the producer and every consumer created via `subscribe()`. */
  async close(): Promise<void> {
    await this._producer?.disconnect();
    await Promise.allSettled(this._consumers.map(consumer => consumer.disconnect()));
    this._consumers = [];
    logger.info(`kafka CLOSED(${this.name})`);
  }
}
