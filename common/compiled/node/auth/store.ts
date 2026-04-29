import { and, eq, type SQL, sql } from 'drizzle-orm';
import { users } from '../services/db/schema.ts';

let _tokenServiceName: string;
let _tokenServiceType: string;
let _userServiceName: string;
let _userServiceType: string;
// biome-ignore lint/suspicious/noExplicitAny: lookup returns the underlying store instance (drizzle or keyv)
let _lookup: ((name: string) => any) | null = null;

const { JWT_REFRESH_STORE_NAME = '' } = globalThis.__config.JWT;

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

/** Persist or replace a user's refresh token. Uses upsert for drizzle, set for keyv. */
export const setRefreshToken = async (id: string | number, refresh_token: string) => {
  if (_tokenServiceType === 'drizzle') {
    await db()
      .insert(sql.table(JWT_REFRESH_STORE_NAME))
      .values({ id, refresh_token })
      .onConflictDoUpdate({ target: sql`id`, set: { refresh_token } });
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
  if (_userServiceType === 'drizzle') {
    const conditions: SQL[] = Object.entries(where).map(([key, val]) =>
      eq(users[key as keyof typeof users.$inferSelect] as SQL<unknown>, val as SQL<unknown>),
    );
    const result = await db()
      .select()
      .from(users)
      .where(and(...conditions))
      .limit(1);
    return result[0] ?? null;
  }
  return null;
};

/** Update fields on a user record matching the given fields. */
export const updateUser = async (where: Record<string, unknown>, payload: Record<string, unknown>) => {
  if (_userServiceType === 'drizzle') {
    const conditions: SQL[] = Object.entries(where).map(([key, val]) =>
      eq(users[key as keyof typeof users.$inferSelect] as SQL<unknown>, val as SQL<unknown>),
    );
    await db()
      .update(users)
      .set(payload)
      .where(and(...conditions));
  }
};
