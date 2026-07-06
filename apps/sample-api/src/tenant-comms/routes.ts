// Tenant Communications Config — Admin CRUD API
// Allows tenant admins to manage their own communication credentials.
//
// Endpoints:
//   GET    /tenant-comms           — list all channel configs for the authenticated tenant
//   GET    /tenant-comms/:channel  — get specific channel config (credentials masked)
//   POST   /tenant-comms           — create a new channel config
//   PUT    /tenant-comms/:id       — update an existing channel config
//   DELETE /tenant-comms/:id       — delete a channel config
//   POST   /tenant-comms/:id/register-webhook — manually (re-)register Telegram webhook

import { randomBytes } from 'node:crypto';
import { authUser } from '@common/node/auth/jwt';
import { deleteWebhook, setWebhook } from '@common/node/comms/telegram2/inbound';
import { decryptCredentials, encryptCredentials } from '@common/node/comms/tenant/crypto';
import type { CommsChannel, CommsProvider } from '@common/node/comms/tenant/types';
import * as realServices from '@common/node/services';
import { and, eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
import express from 'express';
import { tenantCommsConfig } from '../database/schema.ts';

// biome-ignore lint/suspicious/noExplicitAny: services interface varies by store type
const services: any = realServices;
const db = () => services.get('drizzle1');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mask a credential string — show only last 4 chars */
function maskCredential(value: string): string {
  if (value.length <= 4) return '****';
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

/** Mask all credential values in an object */
function maskCredentials(encrypted: string): Record<string, string> {
  try {
    const decrypted = decryptCredentials(encrypted);
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(decrypted)) {
      masked[key] = maskCredential(value);
    }
    return masked;
  } catch {
    return { error: '****' };
  }
}

/** Extract tenant_id from authenticated user. Falls back to 1 in development. */
function getTenantId(req: Request): number | null {
  const user = (req as any).user;
  return user?.tenant_id ?? user?.tenantId ?? (process.env.NODE_ENV === 'development' ? 1 : null);
}

/** Generate a URL-safe random secret token (64 chars, A-Za-z0-9_-) for Telegram webhook verification */
function generateWebhookSecret(): string {
  return randomBytes(48).toString('base64url').slice(0, 64);
}

/** Build the full webhook URL for a Telegram config */
function buildTelegramWebhookUrl(label: string): string {
  const domain = process.env.APP_DOMAIN || process.env.BASE_URL || '';
  if (!domain) throw new Error('APP_DOMAIN or BASE_URL env var must be set for Telegram webhook registration');
  const base = domain.replace(/\/$/, '');
  return `${base}/api/sample-api/telegram/webhook/${label}`;
}

/**
 * Register a Telegram webhook for a config.
 * Generates webhook_secret if not present, calls Telegram setWebhook API.
 * Returns the updated credentials with webhook_secret included.
 */
async function registerTelegramWebhook(
  credentials: Record<string, string>,
  label: string,
): Promise<{ credentials: Record<string, string>; webhookUrl: string }> {
  const webhookSecret = credentials.webhook_secret || generateWebhookSecret();
  const webhookUrl = buildTelegramWebhookUrl(label);

  await setWebhook(credentials.bot_token, webhookUrl, webhookSecret);

  return {
    credentials: { ...credentials, webhook_secret: webhookSecret },
    webhookUrl,
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_CHANNELS: CommsChannel[] = ['telegram', 'email', 'whatsapp', 'sms'];
const VALID_PROVIDERS: CommsProvider[] = ['telegram', 'sendgrid', 'meta', 'nexmo'];

function validateChannel(channel: string): channel is CommsChannel {
  return VALID_CHANNELS.includes(channel as CommsChannel);
}

function validateProvider(provider: string): provider is CommsProvider {
  return VALID_PROVIDERS.includes(provider as CommsProvider);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export default express
  .Router()

  // ── GET /tenant-comms ─────────────────────────────────────────────────────
  // List all channel configs for the authenticated tenant.
  // Credentials are masked in the response.
  .get('/', authUser, async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    try {
      const configs = await db().select().from(tenantCommsConfig).where(eq(tenantCommsConfig.tenant_id, tenantId));

      const result = configs.map(c => ({
        id: c.id,
        label: c.label,
        channel: c.channel,
        provider: c.provider,
        credentials: maskCredentials(c.credentials),
        senderIdentity: c.sender_identity,
        isActive: c.is_active,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      res.json({ ok: true, data: result });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  })

  // ── GET /tenant-comms/:channel ────────────────────────────────────────────
  // Get a specific channel config for the authenticated tenant.
  // Credentials are masked in the response.
  .get('/:channel', authUser, async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const { channel } = req.params;
    if (!validateChannel(channel)) {
      res.status(400).json({ ok: false, error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` });
      return;
    }

    try {
      const [config] = await db()
        .select()
        .from(tenantCommsConfig)
        .where(and(eq(tenantCommsConfig.tenant_id, tenantId), eq(tenantCommsConfig.channel, channel)))
        .limit(1);

      if (!config) {
        res.status(404).json({ ok: false, error: `No ${channel} configuration found for this tenant` });
        return;
      }

      res.json({
        ok: true,
        data: {
          id: config.id,
          label: config.label,
          channel: config.channel,
          provider: config.provider,
          credentials: maskCredentials(config.credentials),
          senderIdentity: config.sender_identity,
          isActive: config.is_active,
          createdAt: config.created_at,
          updatedAt: config.updated_at,
        },
      });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  })

  // ── POST /tenant-comms ────────────────────────────────────────────────────
  // Create a new channel config for the authenticated tenant.
  // Body: { channel, provider, credentials: {...}, senderIdentity: {...} }
  .post('/', authUser, async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const { label, channel, provider, credentials, senderIdentity } = req.body as {
      label?: string;
      channel?: string;
      provider?: string;
      credentials?: Record<string, string>;
      senderIdentity?: Record<string, string>;
    };

    // Validation
    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      res.status(400).json({ ok: false, error: 'label is required (e.g. "support-wa", "marketing-email")' });
      return;
    }
    const labelSlug = label.trim().toLowerCase().replace(/\s+/g, '-');
    if ((!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(labelSlug) && labelSlug.length > 1) || labelSlug.length === 0) {
      res.status(400).json({
        ok: false,
        error:
          'label must be slug format: lowercase letters, numbers, and hyphens only (e.g. "support-wa", "marketing-email"). No spaces or special characters.',
      });
      return;
    }
    if (!channel || !validateChannel(channel)) {
      res
        .status(400)
        .json({ ok: false, error: `channel is required and must be one of: ${VALID_CHANNELS.join(', ')}` });
      return;
    }
    if (!provider || !validateProvider(provider)) {
      res
        .status(400)
        .json({ ok: false, error: `provider is required and must be one of: ${VALID_PROVIDERS.join(', ')}` });
      return;
    }
    if (!credentials || typeof credentials !== 'object' || Object.keys(credentials).length === 0) {
      res.status(400).json({ ok: false, error: 'credentials object is required and must not be empty' });
      return;
    }
    if (!senderIdentity || typeof senderIdentity !== 'object') {
      res.status(400).json({ ok: false, error: 'senderIdentity object is required' });
      return;
    }

    try {
      // Check for existing config with same tenant_id + channel + label
      const [existing] = await db()
        .select({ id: tenantCommsConfig.id })
        .from(tenantCommsConfig)
        .where(
          and(
            eq(tenantCommsConfig.tenant_id, tenantId),
            eq(tenantCommsConfig.channel, channel),
            eq(tenantCommsConfig.label, labelSlug),
          ),
        )
        .limit(1);

      if (existing) {
        res.status(409).json({
          ok: false,
          error: `A ${channel} configuration with label "${labelSlug}" already exists for this tenant. Use a different label or PUT to update.`,
        });
        return;
      }

      // Encrypt credentials before storing
      const encrypted = encryptCredentials(credentials);

      const [created] = await db()
        .insert(tenantCommsConfig)
        .values({
          tenant_id: tenantId,
          label: labelSlug,
          channel,
          provider,
          credentials: encrypted,
          sender_identity: senderIdentity,
          is_active: true,
        })
        .returning({ id: tenantCommsConfig.id });

      // Auto-register Telegram webhook after config creation
      let webhookUrl: string | undefined;
      if (channel === 'telegram' && credentials.bot_token) {
        try {
          const result = await registerTelegramWebhook(credentials, labelSlug);
          webhookUrl = result.webhookUrl;
          // Update credentials with the generated webhook_secret
          await db()
            .update(tenantCommsConfig)
            .set({ credentials: encryptCredentials(result.credentials) })
            .where(eq(tenantCommsConfig.id, created.id));
        } catch (webhookErr: unknown) {
          // Webhook registration failed — config is saved but webhook is not active.
          // User can retry via the register-webhook endpoint.
          console.warn(
            'Telegram webhook registration failed:',
            webhookErr instanceof Error ? webhookErr.message : webhookErr,
          );
        }
      }

      res.status(201).json({ ok: true, data: { id: created.id, webhookUrl } });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  })

  // ── PUT /tenant-comms/:id ─────────────────────────────────────────────────
  // Update an existing channel config.
  // Body: { credentials?: {...}, senderIdentity?: {...}, isActive?: boolean }
  // Only fields provided will be updated.
  .put('/:id', authUser, async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      res.status(400).json({ ok: false, error: 'Valid numeric id is required' });
      return;
    }

    const { credentials, senderIdentity, isActive } = req.body as {
      credentials?: Record<string, string>;
      senderIdentity?: Record<string, string>;
      isActive?: boolean;
    };

    try {
      // Verify ownership — config must belong to this tenant
      const [existing] = await db()
        .select({ id: tenantCommsConfig.id, tenant_id: tenantCommsConfig.tenant_id })
        .from(tenantCommsConfig)
        .where(eq(tenantCommsConfig.id, id))
        .limit(1);

      if (!existing) {
        res.status(404).json({ ok: false, error: 'Configuration not found' });
        return;
      }
      if (existing.tenant_id !== tenantId) {
        res.status(403).json({ ok: false, error: 'You do not have permission to modify this configuration' });
        return;
      }

      // Build update payload
      const updates: Record<string, unknown> = {
        updated_at: new Date(),
      };

      if (credentials && typeof credentials === 'object' && Object.keys(credentials).length > 0) {
        updates.credentials = encryptCredentials(credentials);
      }
      if (senderIdentity && typeof senderIdentity === 'object') {
        updates.sender_identity = senderIdentity;
      }
      if (typeof isActive === 'boolean') {
        updates.is_active = isActive;
      }

      await db().update(tenantCommsConfig).set(updates).where(eq(tenantCommsConfig.id, id));

      res.json({ ok: true });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  })

  // ── DELETE /tenant-comms/:id ──────────────────────────────────────────────
  // Delete a channel config.
  .delete('/:id', authUser, async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      res.status(400).json({ ok: false, error: 'Valid numeric id is required' });
      return;
    }

    try {
      // Verify ownership
      const [existing] = await db().select().from(tenantCommsConfig).where(eq(tenantCommsConfig.id, id)).limit(1);

      if (!existing) {
        res.status(404).json({ ok: false, error: 'Configuration not found' });
        return;
      }
      if (existing.tenant_id !== tenantId) {
        res.status(403).json({ ok: false, error: 'You do not have permission to delete this configuration' });
        return;
      }

      // Unregister Telegram webhook before deleting config
      if (existing.channel === 'telegram') {
        try {
          const creds = decryptCredentials(existing.credentials);
          if (creds.bot_token) {
            await deleteWebhook(creds.bot_token);
          }
        } catch (webhookErr: unknown) {
          console.warn(
            'Telegram webhook deletion failed (proceeding with config delete):',
            webhookErr instanceof Error ? webhookErr.message : webhookErr,
          );
        }
      }

      await db().delete(tenantCommsConfig).where(eq(tenantCommsConfig.id, id));

      res.json({ ok: true });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  })

  // ── POST /tenant-comms/:id/register-webhook ───────────────────────────────
  // Manually (re-)register the Telegram webhook for a config.
  // Useful if auto-registration failed or if APP_DOMAIN changed.
  .post('/:id/register-webhook', authUser, async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      res.status(400).json({ ok: false, error: 'Valid numeric id is required' });
      return;
    }

    try {
      // Verify ownership and get config
      const [existing] = await db().select().from(tenantCommsConfig).where(eq(tenantCommsConfig.id, id)).limit(1);

      if (!existing) {
        res.status(404).json({ ok: false, error: 'Configuration not found' });
        return;
      }
      if (existing.tenant_id !== tenantId) {
        res.status(403).json({ ok: false, error: 'You do not have permission to modify this configuration' });
        return;
      }
      if (existing.channel !== 'telegram') {
        res.status(400).json({ ok: false, error: 'Webhook registration is only supported for Telegram configs' });
        return;
      }

      const credentials = decryptCredentials(existing.credentials);
      if (!credentials.bot_token) {
        res.status(400).json({ ok: false, error: 'bot_token is missing from credentials' });
        return;
      }

      const result = await registerTelegramWebhook(credentials, existing.label);

      // Update credentials with (possibly new) webhook_secret
      await db()
        .update(tenantCommsConfig)
        .set({
          credentials: encryptCredentials(result.credentials),
          updated_at: new Date(),
        })
        .where(eq(tenantCommsConfig.id, id));

      res.json({ ok: true, data: { webhookUrl: result.webhookUrl } });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  });
