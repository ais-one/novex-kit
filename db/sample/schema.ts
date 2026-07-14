import { relations, sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  time,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

// ─── Custom PostgreSQL types ──────────────────────────────────────────────────

// (inet and textArray are defined in ../audit/schema.ts)

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    roles: varchar('roles', { length: 255 }),
    tenant_id: integer('tenant_id'),
    username: varchar('username', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull(),
    githubId: integer('githubId'),
    password: varchar('password', { length: 255 }),
    salt: varchar('salt', { length: 255 }),
    role: varchar('role', { length: 255 }),
    retryLimit: integer('retryLimit'),
    retryCount: integer('retryCount'),
    retryReset: integer('retryReset'),
    gaKey: varchar('gaKey', { length: 32 }),
    pnToken: varchar('pnToken', { length: 255 }).default(''),
    revoked: varchar('revoked', { length: 255 }).default(''),
    refreshToken: varchar('refreshToken', { length: 255 }).default(''),
    sms: varchar('sms', { length: 255 }),
    smsLastSent: timestamp('smsLastSent'),
    smsOtpPin: varchar('smsOtpPin', { length: 6 }),
    smsVerified: integer('smsVerified'),
    telegramId: varchar('telegramId', { length: 255 }),
    telegramUsername: varchar('telegramUsername', { length: 255 }),
  },
  t => [unique('users_email_unique').on(t.email)],
);

// ─── country ──────────────────────────────────────────────────────────────────

export const country = pgTable('country', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }),
  code: varchar('code', { length: 255 }),
  icc: varchar('icc', { length: 255 }),
  updated: timestamp('updated'),
});

// ─── state ───────────────────────────────────────────────────────────────────

export const state = pgTable(
  'state',
  {
    id: serial('id').primaryKey(),
    country_name: varchar('country_name', { length: 255 }),
    code: varchar('code', { length: 255 }),
    name: varchar('name', { length: 255 }),
  },
  t => [unique().on(t.country_name, t.code)],
);

// ─── student ──────────────────────────────────────────────────────────────────

export const student = pgTable(
  'student',
  {
    id: serial('id').primaryKey(),
    firstName: varchar('firstName', { length: 255 }),
    lastName: varchar('lastName', { length: 255 }),
    avatar: varchar('avatar', { length: 255 }).default(''),
    kyc: varchar('kyc', { length: 255 }).default(''),
    awards: varchar('awards', { length: 255 }).default(''),
    sex: varchar('sex', { length: 255 }),
    age: integer('age'),
    gpa: decimal('gpa'),
    birthDate: date('birthDate'),
    birthTime: time('birthTime'),
    country: varchar('country', { length: 255 }),
    state: varchar('state', { length: 255 }),
    dateTimeTz: timestamp('dateTimeTz'),
    secret: varchar('secret', { length: 255 }),
    remarks: varchar('remarks', { length: 255 }),
    updated_by: varchar('updated_by', { length: 255 }),
    updated_at: timestamp('updated_at'),
  },
  t => [unique().on(t.firstName, t.lastName)],
);

// ─── subject ──────────────────────────────────────────────────────────────────

export const subject = pgTable('subject', {
  code: varchar('code', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  passingGrade: integer('passingGrade'),
});

// ─── student_subject ──────────────────────────────────────────────────────────

export const studentSubject = pgTable(
  'student_subject',
  {
    studentId: integer('studentId')
      .notNull()
      .references(() => student.id),
    subjectCode: varchar('subjectCode', { length: 255 })
      .notNull()
      .references(() => subject.code),
    gradeFinal: varchar('gradeFinal', { length: 255 }),
    gradeDate: timestamp('gradeDate'),
  },
  t => [primaryKey({ columns: [t.studentId, t.subjectCode] }), index('idx_student_subject_student').on(t.studentId)],
);

// ─── award ────────────────────────────────────────────────────────────────────

export const award = pgTable('award', {
  code: varchar('code', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }),
});

// ─── categories ───────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ─── t4t_audit_logs ───────────────────────────────────────────────────────────

export const t4tAuditLogs = pgTable(
  't4t_audit_logs',
  {
    id: serial('id').primaryKey(),
    user: varchar('user', { length: 255 }),
    timestamp: timestamp('timestamp'),
    db_name: varchar('db_name', { length: 255 }),
    table_name: varchar('table_name', { length: 255 }),
    op: varchar('op', { length: 255 }),
    where_cols: varchar('where_cols', { length: 255 }),
    where_vals: varchar('where_vals', { length: 255 }),
    cols_changed: varchar('cols_changed', { length: 255 }),
    prev_values: text('prev_values'),
    new_values: text('new_values'),
  },
  t => [index('idx_t4t_audit_logs').on(t.timestamp, t.db_name, t.op)],
);

// ─── tenant_comms_config (moved from schema-iam.ts) ────────────────────────────

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

// ─── comms_outbox (broadcast queue, moved from schema-iam.ts) ──────────────────

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

// ─── Relations ────────────────────────────────────────────────────────────────

export const studentRelations = relations(student, ({ many }) => ({
  studentSubjects: many(studentSubject),
}));

export const subjectRelations = relations(subject, ({ many }) => ({
  studentSubjects: many(studentSubject),
}));

export const studentSubjectRelations = relations(studentSubject, ({ one }) => ({
  student: one(student, { fields: [studentSubject.studentId], references: [student.id] }),
  subject: one(subject, { fields: [studentSubject.subjectCode], references: [subject.code] }),
}));

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Student = typeof student.$inferSelect;
export type InsertStudent = typeof student.$inferInsert;
export type Subject = typeof subject.$inferSelect;
export type InsertSubject = typeof subject.$inferInsert;
