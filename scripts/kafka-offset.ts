#!/usr/bin/env node
// scripts/kafka-offset.ts
//
// Inspects and resets a consumer group's committed offsets — for skipping a message stuck at
// the head of a partition, or replaying a range after a fix. Separate from
// scripts/kafka-provision.ts since this is about consumer-group state, not topic state.
//
// Run from the target app's own directory so its .env.json/.env load correctly (see
// @common/node/config) — wired up in the root package.json's "kafka:offset" script.
//
// Refuses to write while the consumer group still has active members — offsets set on a
// running group don't reliably stick (the group's own next commit can overwrite them). Stop
// the consumer app first:
//   npm run kafka:offset -- show --groupId=sample-queue-consumer --topic=sample.events
//   npm run kafka:offset -- set --groupId=sample-queue-consumer --topic=sample.events --partition=0 --offset=12345
//   npm run kafka:offset -- set --groupId=sample-queue-consumer --topic=sample.events --partition=0 --to=earliest
//   npm run kafka:offset -- set --groupId=sample-queue-consumer --topic=sample.events --partition=0 --timestamp=2026-08-01T00:00:00Z
import '@common/node/logger'; // MqKafka logs via the global `logger` — must be initialized first
import '@common/node/config';
import MqKafka from '@apps/sample-common/services/mq/kafka';
import type { Admin } from 'kafkajs';

const parseArgs = (argv: string[]): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eqIndex = arg.indexOf('=');
    const key = eqIndex === -1 ? arg.slice(2) : arg.slice(2, eqIndex);
    result[key] = eqIndex === -1 ? '' : arg.slice(eqIndex + 1);
  }
  return result;
};

const connectAdmin = async (): Promise<{ mq: MqKafka; admin: Admin }> => {
  const mq = new MqKafka('KAFKA_CONFIG');
  await mq.open();
  const kafka = mq.get();
  if (!kafka) throw new Error('could not connect to Kafka — check KAFKA_CONFIG and that the broker is reachable');
  const admin = kafka.admin();
  await admin.connect();
  return { mq, admin };
};

const assertGroupIsIdle = async (admin: Admin, groupId: string): Promise<void> => {
  const { groups } = await admin.describeGroups([groupId]);
  const group = groups.find(g => g.groupId === groupId);
  if (group && group.state !== 'Empty' && group.state !== 'Dead') {
    throw new Error(
      `consumer group "${groupId}" is "${group.state}" (has active members) — stop the consumer app first, offsets set while it's running don't reliably stick`,
    );
  }
};

const show = async (groupId: string, topic: string): Promise<void> => {
  const { mq, admin } = await connectAdmin();
  try {
    const [committed] = await admin.fetchOffsets({ groupId, topics: [topic] });
    const watermarks = await admin.fetchTopicOffsets(topic);
    for (const watermark of watermarks) {
      const committedOffset = committed?.partitions.find(p => p.partition === watermark.partition)?.offset ?? null;
      const lag = committedOffset !== null ? Number(watermark.high) - Number(committedOffset) : null;
      console.log(
        `partition ${watermark.partition}: committed=${committedOffset ?? '(none)'} low=${watermark.low} high=${watermark.high}${lag !== null ? ` lag=${lag}` : ''}`,
      );
    }
  } finally {
    await admin.disconnect();
    await mq.close();
  }
};

const set = async (groupId: string, topic: string, partition: number, args: Record<string, string>): Promise<void> => {
  const { mq, admin } = await connectAdmin();
  try {
    await assertGroupIsIdle(admin, groupId);

    let offset: string;
    if (args.offset) {
      offset = args.offset;
    } else if (args.to === 'earliest' || args.to === 'latest') {
      const watermarks = await admin.fetchTopicOffsets(topic);
      const watermark = watermarks.find(w => w.partition === partition);
      if (!watermark) throw new Error(`partition ${partition} not found on topic ${topic}`);
      offset = args.to === 'earliest' ? watermark.low : watermark.high;
    } else if (args.timestamp) {
      const timestampMs = Date.parse(args.timestamp);
      if (Number.isNaN(timestampMs)) throw new Error(`--timestamp is not a valid date: ${args.timestamp}`);
      const resolved = await admin.fetchTopicOffsetsByTimestamp(topic, timestampMs);
      const match = resolved.find(r => r.partition === partition);
      if (!match) throw new Error(`partition ${partition} not found on topic ${topic}`);
      offset = match.offset;
    } else {
      throw new Error('set requires one of --offset=<n>, --to=earliest|latest, or --timestamp=<iso8601>');
    }

    await admin.setOffsets({ groupId, topic, partitions: [{ partition, offset }] });
    console.log(`${groupId} / ${topic} / partition ${partition} -> offset ${offset}`);
  } finally {
    await admin.disconnect();
    await mq.close();
  }
};

try {
  const [command] = process.argv.slice(2);
  const args = parseArgs(process.argv.slice(3));
  if (!args.groupId || !args.topic) {
    throw new Error(
      'Usage: kafka-offset.ts <show|set> --groupId=<g> --topic=<t> [--partition=<p>] [--offset=<n> | --to=earliest|latest | --timestamp=<iso8601>]',
    );
  }

  if (command === 'show') {
    await show(args.groupId, args.topic);
  } else if (command === 'set') {
    if (!args.partition) throw new Error('set requires --partition=<p>');
    await set(args.groupId, args.topic, Number(args.partition), args);
  } else {
    throw new Error('Usage: kafka-offset.ts <show|set> --groupId=<g> --topic=<t> ...');
  }
} catch (e) {
  console.error(`kafka-offset failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
