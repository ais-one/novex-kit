import { and, eq, type SQL, sql } from 'drizzle-orm';

import { decryptWithPassword } from '../utils/aes.ts';

// biome-ignore lint/suspicious/noExplicitAny: configurable table reference injected by the app
let _users: any = null;
// biome-ignore lint/suspicious/noExplicitAny: MFA table references injected by the app
let _mfaTotp: any = null;
let _mfaRecoveryCodes: any = null;

/** Register the users and MFA Drizzle tables. Call once at app startup before auth functions are used. */
export const configure = ({
  users,
  mfaTotp,
  mfaRecoveryCodes,
}: {
  users: unknown;
  mfaTotp?: unknown;
  mfaRecoveryCodes?: unknown;
}) => {
  _users = users;
  if (mfaTotp) _mfaTotp = mfaTotp;
  if (mfaRecoveryCodes) _mfaRecoveryCodes = mfaRecoveryCodes;
};

/** Returns true if configure() has been called with a table reference. */
export const isConfigured = () => _users !== null;

let _tokenServiceName: string;
let _tokenServiceType: string;
let _userServiceName: string;
let _userServiceType: string;
// biome-ignore lint/suspicious/noExplicitAny: lookup returns the underlying store instance (drizzle or keyv)
let _lookup: ((name: string) => any) | null = null;

const { JWT_REFRESH_STORE_NAME = '' } = globalThis.__config?.JWT ?? {};

const { AUTH_USER_STORE_NAME } = process.env;

const tokenStore = () => _lookup?.(_tokenServiceName);
const db = () => _lookup?.(_userServiceName);

/**
 * Wire up the backing stores.
 *   tokenServiceName — service name from SERVICES_CONFIG (e.g. 'keyv')
 *   userServiceName  — service name from SERVICES_CONFIG (e.g. 'drizzle1')
 *   lookup           — services.get — resolves a name to the underlying store instance
 */
// biome-ignore lint/suspicious/noExplicitAny: lookup returns different service instance types (drizzle, redis, keyv)
export const setup = (tokenServiceName: string, userServiceName: string, lookup: (name: string) => any) => {
  _tokenServiceName = tokenServiceName;
  _tokenServiceType = globalThis.__config?.SERVICES_CONFIG?.[tokenServiceName]?.type ?? 'keyv';
  _userServiceName = userServiceName;
  _userServiceType = globalThis.__config?.SERVICES_CONFIG?.[userServiceName]?.type ?? 'drizzle';
  _lookup = lookup;
};

/** Returns the underlying Drizzle instance for MFA controllers to run their own queries. */
export const getDb = () => db();
/** Returns the configured `userMfaTotp` table reference. */
export const getMfaTotpTable = () => _mfaTotp;
/** Returns the configured `userMfaRecoveryCodes` table reference. */
export const getMfaRecoveryCodesTable = () => _mfaRecoveryCodes;

/** Persist or replace a user's refresh token. Uses upsert for drizzle, set for keyv. */
export const setRefreshToken = async (id: string | number, refresh_token: string) => {
  if (_tokenServiceType === 'drizzle') {
    await db().execute(
      sql`INSERT INTO ${sql.identifier(JWT_REFRESH_STORE_NAME)} (id, refresh_token) VALUES (${id}, ${refresh_token}) ON CONFLICT (id) DO UPDATE SET refresh_token = ${refresh_token}`,
    );
  } else {
    await tokenStore().set(id, refresh_token);
  }
};

/** Retrieve the stored refresh token for a user. */
export const getRefreshToken = async (id: string | number) => {
  if (_tokenServiceType === 'drizzle') {
    const result = await db().execute(
      sql`SELECT refresh_token FROM ${sql.identifier(JWT_REFRESH_STORE_NAME)} WHERE id = ${id}`,
    );
    return result.rows[0]?.refresh_token ?? null;
  }
  return tokenStore().get(id);
};

/** Delete a user's refresh token, effectively invalidating their session. */
export const revokeRefreshToken = async (id: string | number) => {
  if (_tokenServiceType === 'drizzle') {
    await db().execute(sql`DELETE FROM ${sql.identifier(JWT_REFRESH_STORE_NAME)} WHERE id = ${id}`);
  } else {
    await tokenStore().delete(id);
  }
};

/** Find a single user record matching the given fields. Returns null if not found. */
export const findUser = async (where: Record<string, unknown>) => {
  if (_userServiceType === 'drizzle' && _users) {
    const conditions: SQL[] = Object.entries(where).map(([key, val]) =>
      eq(_users[key] as SQL<unknown>, val as SQL<unknown>),
    );
    const result = await db()
      .select()
      .from(_users)
      .where(and(...conditions))
      .limit(1);
    const user = (result[0] as Record<string, unknown> & { mfa_active?: boolean; otp_secret?: string }) ?? null;
    if (!user) return null;

    if (_mfaTotp) {
      const mfaRows = await db()
        .select()
        .from(_mfaTotp)
        .where(and(eq(_mfaTotp.user_id, user.id), eq(_mfaTotp.is_active, true)))
        .limit(1);
      if (mfaRows.length > 0) {
        const MFA_KEY = process.env.MFA_ENCRYPTION_KEY;
        if (MFA_KEY) {
          try {
            user.otp_secret = decryptWithPassword(mfaRows[0].secret_encrypted as string, MFA_KEY);
          } catch {
            user.otp_secret = (user.gaKey as string) ?? undefined;
          }
        } else {
          user.otp_secret = (user.gaKey as string) ?? undefined;
        }
        user.mfa_active = true;
      } else {
        user.otp_secret = (user.gaKey as string) ?? undefined;
        user.mfa_active = false;
      }
    }

    return user;
  }
  return null;
};

/** Update fields on a user record matching the given fields. */
export const updateUser = async (where: Record<string, unknown>, payload: Record<string, unknown>) => {
  if (_userServiceType === 'drizzle' && _users) {
    const conditions: SQL[] = Object.entries(where).map(([key, val]) =>
      eq(_users[key] as SQL<unknown>, val as SQL<unknown>),
    );
    await db()
      .update(_users)
      .set(payload)
      .where(and(...conditions));
  }
};
