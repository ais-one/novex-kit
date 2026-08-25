import '@common/node/logger'; // sets up global logger
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

class FakeProducer {
  connected = false;
  calls: Array<{ topic: string; messages: unknown[] }> = [];
  async connect() {
    this.connected = true;
  }
  async disconnect() {
    this.connected = false;
  }
  async send(payload: { topic: string; messages: unknown[] }) {
    this.calls.push(payload);
  }
}

class FakeConsumer {
  subscribedTo: unknown[] = [];
  eachMessage: ((args: { message: Record<string, unknown> }) => Promise<void>) | null = null;
  async connect() {}
  async disconnect() {}
  async subscribe(opts: unknown) {
    this.subscribedTo.push(opts);
  }
  async run({ eachMessage }: { eachMessage: (args: { message: Record<string, unknown> }) => Promise<void> }) {
    this.eachMessage = eachMessage;
  }
}

class FakeKafka {
  producerInstance = new FakeProducer();
  consumerInstance = new FakeConsumer();
  producer() {
    return this.producerInstance;
  }
  consumer() {
    return this.consumerInstance;
  }
}

mock.module('kafkajs', {
  namedExports: {
    Kafka: FakeKafka,
    logLevel: { NOTHING: 0, ERROR: 1, WARN: 2, INFO: 4, DEBUG: 5 },
  },
});

const { default: MqKafka } = await import('../../kafka.ts');

const configure = () => {
  globalThis.__config = { KAFKA_TEST: { clientId: 'test', brokers: ['broker:9092'] } };
};

describe.only('apps/sample-common services/mq/kafka', () => {
  it.only('open() connects the producer and exposes the underlying client via get()', async () => {
    configure();
    const mq = new MqKafka('KAFKA_TEST');
    await mq.open();
    const fake = mq.get() as unknown as FakeKafka;
    assert.ok(fake);
    assert.equal(fake.producerInstance.connected, true);
  });

  it.only('open() no-ops when unconfigured instead of throwing', async () => {
    const mq = new MqKafka('KAFKA_MISSING');
    await mq.open();
    assert.equal(mq.get(), null);
  });

  it.only('publish() sends key/value/headers to the given topic', async () => {
    configure();
    const mq = new MqKafka('KAFKA_TEST');
    await mq.open();
    await mq.publish('my-topic', { key: 'k1', value: 'hello', headers: { a: 'b' } });
    const fake = mq.get() as unknown as FakeKafka;
    assert.deepEqual(fake.producerInstance.calls.at(-1), {
      topic: 'my-topic',
      messages: [{ key: 'k1', value: 'hello', headers: { a: 'b' } }],
    });
  });

  it.only('publish() throws when called before open()', async () => {
    const mq = new MqKafka('KAFKA_TEST');
    await assert.rejects(() => mq.publish('t', { value: 'x' }));
  });

  it.only('subscribe() registers a consumer and forwards normalized messages to the handler', async () => {
    configure();
    const mq = new MqKafka('KAFKA_TEST');
    await mq.open();
    const received: unknown[] = [];
    await mq.subscribe('my-topic', message => {
      received.push(message);
    });
    const fake = mq.get() as unknown as FakeKafka;
    assert.deepEqual(fake.consumerInstance.subscribedTo, [{ topic: 'my-topic' }]);

    const { eachMessage } = fake.consumerInstance;
    assert.ok(eachMessage, 'expected subscribe() to have captured eachMessage');
    await eachMessage({
      message: { key: Buffer.from('k1'), value: Buffer.from('hello'), headers: { a: Buffer.from('b') } },
    });
    assert.deepEqual(received, [{ key: 'k1', value: Buffer.from('hello'), headers: { a: 'b' } }]);
  });

  it.only("subscribe()'s handler errors are caught and logged, not thrown", async () => {
    configure();
    const mq = new MqKafka('KAFKA_TEST');
    await mq.open();
    await mq.subscribe('my-topic', () => {
      throw new Error('boom');
    });
    const fake = mq.get() as unknown as FakeKafka;
    const { eachMessage } = fake.consumerInstance;
    assert.ok(eachMessage, 'expected subscribe() to have captured eachMessage');
    await assert.doesNotReject(() => eachMessage({ message: { key: null, value: Buffer.from('x'), headers: {} } }));
  });
});
