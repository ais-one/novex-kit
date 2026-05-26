// Multi-tenant communications — credential resolver
// Uses configure/setup injection pattern (same as auth/rbac.ts)

import { and, eq } from 'drizzle-orm';
import { decryptCredentials } from './crypto.ts';
import type { CommsChannel, CommsProvider, TenantCommsConfig } from './types.ts';

// ─── Module-scoped injected dependencies ──────────────────────────────────────

// biome-ignore lint/suspicious/noExplicitAny: configurable table reference injected by the app
let _tenantCommsConfig: any = null;
let _serviceName = 'drizzle1';
// biome-ignore lint/suspicious/noExplicitAny: service lookup function injected by the app
let _lookup: ((name: string) => any) | null = null;

const db = () => _lookup?.(_serviceName);

/** Register the tenantCommsConfig Drizzle table. Call once at app startup. */
export const configure = (tables: { tenantCommsConfig: unknown }) => {
  _tenantCommsConfig = tables.tenantCommsConfig;
};

/** Register the DB service lookup. Call once at app startup. */
export const setup = (serviceName: string, lookup: (name: string) => unknown) => {
  _serviceName = serviceName;
  _lookup = lookup as (name: string) => any;
};

/** Check if both configure() and setup() have been called. */
export const isConfigured = () => _tenantCommsConfig !== null && _lookup !== null;

/**
 * Resolve communication credentials for a tenant + channel.
 *
 * @param tenantId - The tenant's ID (from req.user.tenant_id)
 * @param channel - The communication channel ('telegram', 'email', 'whatsapp', 'sms')
 * @param label - Optional label to select a specific config (e.g., 'Support WA', 'Marketing WA'). If omitted, returns the first active config for the channel.
 * @returns Decrypted tenant comms config
 * @throws Error if not configured or no active config found
 */
export async function resolveCommsCredentials(
  tenantId: number,
  channel: CommsChannel,
  label?: string,
): Promise<TenantCommsConfig> {
  if (!isConfigured()) {
    throw new Error('Comms tenant module is not configured. Call configure() and setup() at app startup.');
  }

  const conditions = [
    eq(_tenantCommsConfig.tenant_id, tenantId),
    eq(_tenantCommsConfig.channel, channel),
    eq(_tenantCommsConfig.is_active, true),
  ];
  if (label) {
    conditions.push(eq(_tenantCommsConfig.label, label));
  }

  const [config] = await db()
    .select()
    .from(_tenantCommsConfig)
    .where(and(...conditions))
    .limit(1);

  if (!config) {
    const labelMsg = label ? ` with label "${label}"` : '';
    throw new Error(
      `No active ${channel} configuration${labelMsg} found for tenant ${tenantId}. Each tenant must configure their own communication credentials.`,
    );
  }

  return {
    id: config.id,
    tenantId: config.tenant_id,
    label: config.label,
    channel: config.channel as CommsChannel,
    provider: config.provider as CommsProvider,
    credentials: decryptCredentials(config.credentials),
    senderIdentity: config.sender_identity as Record<string, string>,
    isActive: config.is_active,
  };
}

/**
 * List all active configs for a tenant + channel.
 * Useful for populating a dropdown selector in the UI.
 * Returns configs WITHOUT decrypted credentials (only id, label, senderIdentity).
 */
export async function listCommsConfigs(
  tenantId: number,
  channel?: CommsChannel,
): Promise<
  Array<{
    id: number;
    label: string;
    channel: CommsChannel;
    provider: CommsProvider;
    senderIdentity: Record<string, string>;
    isActive: boolean;
  }>
> {
  if (!isConfigured()) {
    throw new Error('Comms tenant module is not configured. Call configure() and setup() at app startup.');
  }

  const conditions = [eq(_tenantCommsConfig.tenant_id, tenantId), eq(_tenantCommsConfig.is_active, true)];
  if (channel) {
    conditions.push(eq(_tenantCommsConfig.channel, channel));
  }

  const configs = await db()
    .select()
    .from(_tenantCommsConfig)
    .where(and(...conditions));

  return configs.map((c: any) => ({
    id: c.id,
    label: c.label,
    channel: c.channel as CommsChannel,
    provider: c.provider as CommsProvider,
    senderIdentity: c.sender_identity as Record<string, string>,
    isActive: c.is_active,
  }));
}
