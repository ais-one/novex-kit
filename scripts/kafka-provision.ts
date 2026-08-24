#!/usr/bin/env node
// scripts/kafka-provision.ts
//
// Creates/aligns the Kafka topics a consumer app declares in its own `.env.json`'s
// KAFKA_TOPICS_CONFIG. Idempotent and safe to rerun: creates anything missing, tops up
// partition count on an existing topic if the config now asks for more, and syncs
// min.insync.replicas. Deliberately uses kafkajs's Admin API directly (via MqKafka.get()'s
// escape hatch) rather than the provider-agnostic QueueDriver — provisioning is inherently
// Kafka-specific, a deploy-time concern, not something the runtime driver should know about.
//
// Run from the target app's own directory so its .env.json/.env load correctly (see
// @common/node/config) — wired up in the root package.json's "kafka:provision" script.
//
// Raising replication factor on an *existing* topic is a separate, deliberate operation (it
// copies real data between brokers) — not part of this idempotent pass:
//   npm run kafka:provision -- reassign --topic=sample.events --replicationFactor=3
import '@common/node/logger'; // MqKafka logs via the global `logger` — must be initialized first
import '@common/node/config';
import MqKafka from '@apps/sample-common/services/mq/kafka';
import type { Admin } from 'kafkajs';
// `ConfigResourceTypes` doesn't resolve via Node's CJS→ESM named-export interop for this
// package (unlike `Kafka`/`logLevel` elsewhere in this repo) — default-import + destructure
// sidesteps it, per Node's own suggestion when this failed as a plain named import.
import kafkajs from 'kafkajs';
import { z } from 'zod';

const { ConfigResourceTypes } = kafkajs;

const topicSpecSchema = z.object({
  topic: z.string().min(1),
  partitions: z.number().int().positive(),
  replicationFactor: z.number().int().positive(),
  minInSyncReplicas: z.number().int().positive(),
});
type TopicSpec = z.infer<typeof topicSpecSchema>;

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const loadTopicSpecs = (): TopicSpec[] => {
  const raw = globalThis.__config?.KAFKA_TOPICS_CONFIG;
  if (!raw) throw new Error('KAFKA_TOPICS_CONFIG is missing from .env.json — nothing to provision');
  return z.array(topicSpecSchema).min(1).parse(raw);
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

const provision = async (): Promise<void> => {
  const specs = loadTopicSpecs();
  const { mq, admin } = await connectAdmin();
  try {
    const existingTopics = await admin.listTopics();

    const toCreate = specs.filter(spec => !existingTopics.includes(spec.topic));
    if (toCreate.length > 0) {
      await admin.createTopics({
        topics: toCreate.map(spec => ({
          topic: spec.topic,
          numPartitions: spec.partitions,
          replicationFactor: spec.replicationFactor,
          configEntries: [{ name: 'min.insync.replicas', value: String(spec.minInSyncReplicas) }],
        })),
      });
      console.log(`Created: ${toCreate.map(spec => spec.topic).join(', ')}`);
    }

    const { topics: metadata } = await admin.fetchTopicMetadata({ topics: specs.map(spec => spec.topic) });
    for (const spec of specs) {
      const topicMetadata = metadata.find(m => m.name === spec.topic);
      const currentPartitions = topicMetadata?.partitions.length ?? 0;
      if (currentPartitions > 0 && currentPartitions < spec.partitions) {
        await admin.createPartitions({ topicPartitions: [{ topic: spec.topic, count: spec.partitions }] });
        console.log(`${spec.topic}: partitions ${currentPartitions} -> ${spec.partitions}`);
      } else if (currentPartitions > spec.partitions) {
        console.warn(
          `${spec.topic}: has ${currentPartitions} partitions, config asks for ${spec.partitions} — partition count can only be raised, not lowered; leaving as-is`,
        );
      }

      await admin.alterConfigs({
        resources: [
          {
            type: ConfigResourceTypes.TOPIC,
            name: spec.topic,
            configEntries: [{ name: 'min.insync.replicas', value: String(spec.minInSyncReplicas) }],
          },
        ],
      });
    }
    console.log('min.insync.replicas synced for all configured topics.');
  } finally {
    await admin.disconnect();
    await mq.close();
  }
};

const reassign = async (topicName: string, replicationFactor: number): Promise<void> => {
  const { mq, admin } = await connectAdmin();
  try {
    const { brokers } = await admin.describeCluster();
    const brokerIds = brokers.map(broker => broker.nodeId);
    if (brokerIds.length < replicationFactor) {
      throw new Error(
        `cluster has only ${brokerIds.length} broker(s) — cannot satisfy replicationFactor=${replicationFactor}`,
      );
    }

    const { topics: metadata } = await admin.fetchTopicMetadata({ topics: [topicName] });
    const topicMetadata = metadata.find(m => m.name === topicName);
    if (!topicMetadata) throw new Error(`topic ${topicName} does not exist — create it first`);

    const partitionAssignment = topicMetadata.partitions.map(partition => ({
      partition: partition.partitionId,
      replicas: Array.from(
        { length: replicationFactor },
        (_, i) => brokerIds[(partition.partitionId + i) % brokerIds.length],
      ),
    }));

    console.log(`Reassigning ${topicName} to replicationFactor=${replicationFactor}:`, partitionAssignment);
    await admin.alterPartitionReassignments({ topics: [{ topic: topicName, partitionAssignment }] });

    console.log('Reassignment submitted — polling until complete (this copies real data between brokers)...');
    let stillMoving = true;
    while (stillMoving) {
      await sleep(2000);
      const status = await admin.listPartitionReassignments({
        topics: [{ topic: topicName, partitions: partitionAssignment.map(p => p.partition) }],
      });
      stillMoving = status.topics.some(t => t.partitions.length > 0);
      if (stillMoving) console.log('  ...still in progress');
    }
    console.log(`Reassignment complete: ${topicName} is now at replicationFactor=${replicationFactor}.`);
  } finally {
    await admin.disconnect();
    await mq.close();
  }
};

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

try {
  const [command] = process.argv.slice(2);
  if (command === 'reassign') {
    const args = parseArgs(process.argv.slice(3));
    if (!args.topic || !args.replicationFactor) {
      throw new Error('Usage: kafka-provision.ts reassign --topic=<name> --replicationFactor=<n>');
    }
    await reassign(args.topic, Number(args.replicationFactor));
  } else {
    await provision();
  }
} catch (e) {
  console.error(`kafka-provision failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
