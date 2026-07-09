import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

// ─── tenant_comms_config ──────────────────────────────────────────────────────

export const tenantCommsConfig = pgTable(
  'tenant_comms_config',
  {
    id: serial('id').primaryKey(),
    tenant_id: integer('tenant_id').notNull(),
    label: varchar('label', { length: 100 }).notNull(),
    channel: varchar('channel', { length: 50 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    credentials: text('credentials').notNull(),
    sender_identity: jsonb('sender_identity').notNull().default({}),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  t => [unique().on(t.tenant_id, t.channel, t.label)],
);

// ─── comms_outbox (broadcast queue) ───────────────────────────────────────────

export const commsOutbox = pgTable(
  'comms_outbox',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenant_id: integer('tenant_id').notNull(),
    channel: varchar('channel', { length: 50 }).notNull(),
    config_label: varchar('config_label', { length: 100 }),
    recipient: text('recipient').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    max_attempts: integer('max_attempts').notNull().default(3),
    last_error: text('last_error'),
    scheduled_at: timestamp('scheduled_at', { withTimezone: true }).notNull().default(sql`now()`),
    sent_at: timestamp('sent_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  t => [
    index('idx_comms_outbox_status_scheduled').on(t.status, t.scheduled_at),
    index('idx_comms_outbox_tenant').on(t.tenant_id),
  ],
);
