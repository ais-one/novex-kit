// Tenant Communications Config — Admin CRUD API
// Allows tenant admins to manage their own communication credentials.
//
// Endpoints:
//   GET    /tenant-comms           — list all channel configs for the authenticated tenant
//   GET    /tenant-comms/:channel  — get specific channel config (credentials masked)
//   POST   /tenant-comms           — create a new channel config
//   PUT    /tenant-comms/:id       — update an existing channel config
//   DELETE /tenant-comms/:id       — delete a channel config

import { decryptCredentials, encryptCredentials } from '@common/node/comms/tenant/crypto';
import type { CommsChannel, CommsProvider } from '@common/node/comms/tenant/types';
import * as realServices from '@common/node/services';
import { and, eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
import express from 'express';
import { tenantCommsConfig } from '../database/schema-iam.ts';

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
  .get('/', async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    try {
      const configs = await db().select().from(tenantCommsConfig).where(eq(tenantCommsConfig.tenant_id, tenantId));

      const result = configs.map(c => ({
        id: c.id,
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
  .get('/:channel', async (req: Request, res: Response) => {
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
  .post('/', async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(401).json({ ok: false, error: 'Authenticated user with tenant_id is required' });
      return;
    }

    const { channel, provider, credentials, senderIdentity } = req.body as {
      channel?: string;
      provider?: string;
      credentials?: Record<string, string>;
      senderIdentity?: Record<string, string>;
    };

    // Validation
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
      // Check for existing config (unique constraint: tenant_id + channel + provider)
      const [existing] = await db()
        .select({ id: tenantCommsConfig.id })
        .from(tenantCommsConfig)
        .where(
          and(
            eq(tenantCommsConfig.tenant_id, tenantId),
            eq(tenantCommsConfig.channel, channel),
            eq(tenantCommsConfig.provider, provider),
          ),
        )
        .limit(1);

      if (existing) {
        res.status(409).json({
          ok: false,
          error: `A ${channel} configuration with provider ${provider} already exists for this tenant. Use PUT to update.`,
        });
        return;
      }

      // Encrypt credentials before storing
      const encrypted = encryptCredentials(credentials);

      const [created] = await db()
        .insert(tenantCommsConfig)
        .values({
          tenant_id: tenantId,
          channel,
          provider,
          credentials: encrypted,
          sender_identity: senderIdentity,
          is_active: true,
        })
        .returning({ id: tenantCommsConfig.id });

      res.status(201).json({ ok: true, data: { id: created.id } });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  })

  // ── PUT /tenant-comms/:id ─────────────────────────────────────────────────
  // Update an existing channel config.
  // Body: { credentials?: {...}, senderIdentity?: {...}, isActive?: boolean }
  // Only fields provided will be updated.
  .put('/:id', async (req: Request, res: Response) => {
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
  .delete('/:id', async (req: Request, res: Response) => {
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
        res.status(403).json({ ok: false, error: 'You do not have permission to delete this configuration' });
        return;
      }

      await db().delete(tenantCommsConfig).where(eq(tenantCommsConfig.id, id));

      res.json({ ok: true });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'An unexpected error occurred' });
    }
  });
