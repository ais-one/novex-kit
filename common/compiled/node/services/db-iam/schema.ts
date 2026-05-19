import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  index,
  integer,
  json,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ─── users ──────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    username: varchar('username', { length: 50 }).unique(),
    email: varchar('email', { length: 255 }).unique(),
    email_verified_at: timestamp('email_verified_at', { withTimezone: true }),
    phone: varchar('phone', { length: 20 }).unique(),
    phone_verified_at: timestamp('phone_verified_at', { withTimezone: true }),
    display_name: varchar('display_name', { length: 100 }),
    avatar_url: text('avatar_url'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    locale: varchar('locale', { length: 10 }).notNull().default('en'),
    timezone: varchar('timezone', { length: 50 }),
    metadata: json('metadata').notNull().default(sql`'{}'`),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  t => [index('idx_iam_users_status').on(t.status)],
);

// ─── user_credentials ─────────────────────────────────────────────────────────

export const userCredentials = pgTable(
  'user_credentials',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    credential_type: varchar('credential_type', { length: 20 }).notNull().default('password'),
    credential_hash: text('credential_hash').notNull(),
    must_change: boolean('must_change').notNull().default(false),
    last_changed_at: timestamp('last_changed_at', { withTimezone: true }).notNull().default(sql`now()`),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  t => [unique().on(t.user_id, t.credential_type)],
);

// ─── user_mfa_totp ────────────────────────────────────────────────────────────────

export const userMfaTotp = pgTable(
  'user_mfa_totp',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 100 }),
    secret_encrypted: text('secret_encrypted').notNull(),
    algorithm: varchar('algorithm', { length: 10 }).notNull().default('SHA1'),
    digits: integer('digits').notNull().default(6),
    period: integer('period').notNull().default(30),
    is_active: boolean('is_active').notNull().default(false),
    verified_at: timestamp('verified_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  t => [index('idx_iam_user_mfa_totp_user').on(t.user_id)],
);

// ─── user_mfa_recovery_codes ──────────────────────────────────────────────────────

export const userMfaRecoveryCodes = pgTable(
  'user_mfa_recovery_codes',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    code_hash: text('code_hash').notNull(),
    used_at: timestamp('used_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  t => [index('idx_iam_recovery_codes_user').on(t.user_id)],
);

// ─── user_otp_challenges ──────────────────────────────────────────────────────────

export const userOtpChallenges = pgTable(
  'user_otp_challenges',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    channel: varchar('channel', { length: 10 }).notNull(),
    recipient: text('recipient').notNull(),
    purpose: varchar('purpose', { length: 30 }).notNull(),
    code_hash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    max_attempts: integer('max_attempts').notNull().default(5),
    ip_address: varchar('ip_address', { length: 45 }),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    used_at: timestamp('used_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  t => [index('idx_iam_otp_challenges_expires').on(t.expires_at)],
);

// ─── user_federated_identities ─────────────────────────────────────────────────────

export const userFederatedIdentities = pgTable(
  'user_federated_identities',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 80 }).notNull(),
    provider_user_id: varchar('provider_user_id', { length: 255 }).notNull(),
    provider_email: varchar('provider_email', { length: 255 }),
    provider_display_name: varchar('provider_display_name', { length: 100 }),
    access_token_encrypted: text('access_token_encrypted'),
    refresh_token_encrypted: text('refresh_token_encrypted'),
    token_expires_at: timestamp('token_expires_at', { withTimezone: true }),
    scopes: json('scopes').notNull().default(sql`'[]'`),
    metadata: json('metadata').notNull().default(sql`'{}'`),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  t => [unique().on(t.provider, t.provider_user_id), index('idx_iam_federated_user').on(t.user_id)],
);

// ─── rsa_signing_keys ─────────────────────────────────────────────────────────────

export const rsaSigningKeys = pgTable(
  'rsa_signing_keys',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    kid: varchar('kid', { length: 64 }).unique().notNull(),
    algorithm: varchar('algorithm', { length: 10 }).notNull().default('RS256'),
    key_use: varchar('key_use', { length: 5 }).notNull().default('sig'),
    public_key_pem: text('public_key_pem').notNull(),
    private_key_encrypted: text('private_key_encrypted').notNull(),
    key_size_bits: integer('key_size_bits').notNull().default(2048),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    valid_from: timestamp('valid_from', { withTimezone: true }).notNull().default(sql`now()`),
    valid_until: timestamp('valid_until', { withTimezone: true }),
    rotated_at: timestamp('rotated_at', { withTimezone: true }),
    revoked_at: timestamp('revoked_at', { withTimezone: true }),
  },
  t => [index('idx_iam_signing_keys_active').on(t.is_active)],
);

// ─── user_sessions ───────────────────────────────────────────────────────────────

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    signing_key_id: uuid('signing_key_id')
      .notNull()
      .references(() => rsaSigningKeys.id),
    refresh_token_hash: text('refresh_token_hash'),
    refresh_expires_at: timestamp('refresh_expires_at', { withTimezone: true }),
    ip_address: varchar('ip_address', { length: 45 }),
    user_agent: text('user_agent'),
    device_id: varchar('device_id', { length: 64 }),
    issued_at: timestamp('issued_at', { withTimezone: true }).notNull().default(sql`now()`),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    last_active_at: timestamp('last_active_at', { withTimezone: true }).notNull().default(sql`now()`),
    revoked_at: timestamp('revoked_at', { withTimezone: true }),
    revoke_reason: varchar('revoke_reason', { length: 30 }),
  },
  t => [index('idx_iam_sessions_user').on(t.user_id), index('idx_iam_sessions_expires').on(t.expires_at)],
);

// ─── roles (IAM system roles) ───────────────────────────────────────────────────────

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 50 }).unique().notNull(),
  description: text('description'),
  permissions: json('permissions').notNull().default(sql`'[]'`),
  is_system: boolean('is_system').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

// ─── user_roles ─────────────────────────────────────────────────────────────────

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role_id: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    granted_by: uuid('granted_by').references(() => users.id, { onDelete: 'set null' }),
    granted_at: timestamp('granted_at', { withTimezone: true }).notNull().default(sql`now()`),
    expires_at: timestamp('expires_at', { withTimezone: true }),
  },
  t => [unique().on(t.user_id, t.role_id), index('idx_iam_user_roles_user').on(t.user_id)],
);

// ─── auth_audit_log ──────────────────────────────────────────────────────────────

export const authAuditLog = pgTable(
  'auth_audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    actor_id: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    event_type: varchar('event_type', { length: 50 }).notNull(),
    channel: varchar('channel', { length: 20 }),
    provider: varchar('provider', { length: 80 }),
    session_id: uuid('session_id').references(() => userSessions.id, { onDelete: 'set null' }),
    ip_address: varchar('ip_address', { length: 45 }),
    user_agent: text('user_agent'),
    metadata: json('metadata').notNull().default(sql`'{}'`),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  t => [
    index('idx_iam_audit_user_created').on(t.user_id, t.created_at),
    index('idx_iam_audit_event_created').on(t.event_type, t.created_at),
    index('idx_iam_audit_created').on(t.created_at),
  ],
);

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

// ─── tenant_roles ───────────────────────────────────────────────────────────────

export const tenantRoles = pgTable(
  'tenant_roles',
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
      .references(() => tenantRoles.id, { onDelete: 'cascade' }),
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
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenant_id: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role_id: integer('role_id')
      .notNull()
      .references(() => tenantRoles.id, { onDelete: 'cascade' }),
  },
  t => [
    primaryKey({ columns: [t.user_id, t.tenant_id, t.role_id] }),
    index('idx_user_tenant_roles_lookup').on(t.user_id, t.tenant_id),
  ],
);
