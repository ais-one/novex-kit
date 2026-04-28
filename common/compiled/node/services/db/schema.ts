import { relations, sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  customType,
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
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ─── Custom PostgreSQL types ──────────────────────────────────────────────────

const inet = customType<{ data: string }>({
  dataType() {
    return 'INET';
  },
});

const textArray = customType<{ data: string[] }>({
  dataType() {
    return 'TEXT[]';
  },
});

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

// ─── audit_log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
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

export const hardDeleteLog = pgTable('hard_delete_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }).notNull().default(sql`now()`),
  table_name: text('table_name').notNull(),
  record_id: text('record_id').notNull(),
  deleted_by: text('deleted_by').notNull(),
  reason: text('reason').notNull(),
  deleted_data: jsonb('deleted_data').notNull(),
});

// ─── fga_config ───────────────────────────────────────────────────────────────

export const fgaConfig = pgTable('fga_config', {
  id: serial('id').primaryKey(),
  store_id: varchar('store_id', { length: 64 }).notNull(),
  auth_model_id: varchar('auth_model_id', { length: 64 }).notNull(),
  label: varchar('label', { length: 80 }).notNull().default('default'),
  api_url: varchar('api_url', { length: 255 }).notNull().default('http://127.0.0.1:8080'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
});

// ─── tenants ──────────────────────────────────────────────────────────────────

export const tenants = pgTable(
  'tenants',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    plan: varchar('plan', { length: 50 }),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  t => [unique().on(t.slug)],
);

// ─── roles ────────────────────────────────────────────────────────────────────

export const roles = pgTable(
  'roles',
  {
    id: serial('id').primaryKey(),
    tenant_id: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 255 }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  t => [unique().on(t.tenant_id, t.name)],
);

// ─── permissions ──────────────────────────────────────────────────────────────

export const permissions = pgTable(
  'permissions',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 255 }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  t => [unique().on(t.name)],
);

// ─── role_permissions ─────────────────────────────────────────────────────────

export const rolePermissions = pgTable(
  'role_permissions',
  {
    role_id: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permission_id: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  t => [primaryKey({ columns: [t.role_id, t.permission_id] })],
);

// ─── user_tenant_roles ────────────────────────────────────────────────────────

export const userTenantRoles = pgTable(
  'user_tenant_roles',
  {
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenant_id: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role_id: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  t => [
    primaryKey({ columns: [t.user_id, t.tenant_id, t.role_id] }),
    index('idx_user_tenant_roles_lookup').on(t.user_id, t.tenant_id),
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

export const tenantsRelations = relations(tenants, ({ many }) => ({
  roles: many(roles),
  userTenantRoles: many(userTenantRoles),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [roles.tenant_id], references: [tenants.id] }),
  rolePermissions: many(rolePermissions),
  userTenantRoles: many(userTenantRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.role_id], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permission_id], references: [permissions.id] }),
}));

export const userTenantRolesRelations = relations(userTenantRoles, ({ one }) => ({
  user: one(users, { fields: [userTenantRoles.user_id], references: [users.id] }),
  tenant: one(tenants, { fields: [userTenantRoles.tenant_id], references: [tenants.id] }),
  role: one(roles, { fields: [userTenantRoles.role_id], references: [roles.id] }),
}));

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Student = typeof student.$inferSelect;
export type InsertStudent = typeof student.$inferInsert;
export type Subject = typeof subject.$inferSelect;
export type InsertSubject = typeof subject.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type FgaConfig = typeof fgaConfig.$inferSelect;
