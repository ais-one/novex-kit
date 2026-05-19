import { sql } from 'drizzle-orm';
import { bigserial, customType, jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const auditSchema = pgSchema('audit');

// ─── Custom PostgreSQL types ──────────────────────────────────────────────────

const inet = customType<{ data: string }>({
  dataType() {
    return 'inet';
  },
});

const textArray = customType<{ data: string[] }>({
  dataType() {
    return 'text[]';
  },
});

// ─── audit_log ────────────────────────────────────────────────────────────────
// Written by the `audit_users` PostgreSQL trigger on db-sample's `users` table.
// The trigger and function (audit_trigger_func) are defined in db-audit migration
// 0001_public_triggers.sql. Run db:sample:migrate before db:audit:migrate.

export const auditLog = auditSchema.table('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  changed_at: timestamp('changed_at', { withTimezone: true }).notNull().default(sql`now()`),
  table_name: text('table_name').notNull(),
  operation: text('operation').notNull(),
  app_user_id: text('app_user_id'),
  tenant_id: text('tenant_id'),
  session_id: text('session_id'),
  transaction_id: uuid('transaction_id'),
  db_user: text('db_user').notNull().default(sql`session_user`),
  ip_addr: inet('ip_addr').default(sql`inet_client_addr()`),
  app_name: text('app_name').default(sql`current_setting('application_name', true)`),
  old_data: jsonb('old_data'),
  new_data: jsonb('new_data'),
  changed_fields: textArray('changed_fields'),
});

// ─── hard_delete_log ──────────────────────────────────────────────────────────
// Written by `hardDelete()` in `common/compiled/node/db-audit.ts` whenever a
// hard delete is performed. Append-only — no UPDATE/DELETE allowed.

export const hardDeleteLog = auditSchema.table('hard_delete_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }).notNull().default(sql`now()`),
  table_name: text('table_name').notNull(),
  record_id: text('record_id').notNull(),
  deleted_by: text('deleted_by').notNull(),
  reason: text('reason').notNull(),
  deleted_data: jsonb('deleted_data').notNull(),
});

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type AuditLog = typeof auditLog.$inferSelect;
export type HardDeleteLog = typeof hardDeleteLog.$inferSelect;
