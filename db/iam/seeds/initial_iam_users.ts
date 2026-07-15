/**
 * IAM users seed — creates test users in db-iam with well-known UUIDs.
 *
 * These mirror the test users in db-sample (initial_users.ts) so that the
 * RBAC / user-tenant-role seed can reference valid user_ids.
 *
 * Stable test UUIDs:
 *   00000000-0000-0000-0000-000000000001  → "test"
 *   00000000-0000-0000-0000-000000000002  → "ais-one"
 *   00000000-0000-0000-0000-000000000003  → "aaronjxz"
 */
import { setScryptHash } from '@common/node/auth/scrypt';
// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { iamUsers } from '../schema.ts';

export const TEST_USER_IDS = {
  test: '00000000-0000-0000-0000-000000000001',
  'ais-one': '00000000-0000-0000-0000-000000000002',
  aaronjxz: '00000000-0000-0000-0000-000000000003',
} as const;

// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
export async function seed(db: NodePgDatabase<any>): Promise<void> {
  await db.delete(iamUsers);

  // Fixed salt + scrypt hash for password "test" — deterministic so seeded users can always log in with "test"
  const TEST_SCRYPT_SALT = 'dca6d1a35a7a0a3ca7020aeae3af34be';
  const TEST_SCRYPT_HASH = await setScryptHash('test', TEST_SCRYPT_SALT);

  await db.insert(iamUsers).values([
    {
      id: TEST_USER_IDS.test,
      username: 'test',
      email: 'test@example.com',
      password: TEST_SCRYPT_HASH,
      salt: TEST_SCRYPT_SALT,
      display_name: 'Test User',
      status: 'active',
    },
    {
      id: TEST_USER_IDS['ais-one'],
      username: 'ais-one',
      email: 'ais-one@example.com',
      password: TEST_SCRYPT_HASH,
      salt: TEST_SCRYPT_SALT,
      display_name: 'AIS One',
      status: 'active',
    },
    {
      id: TEST_USER_IDS.aaronjxz,
      username: 'aaronjxz',
      email: 'aaronjxz@example.com',
      password: TEST_SCRYPT_HASH,
      salt: TEST_SCRYPT_SALT,
      display_name: 'Aaron',
      status: 'active',
    },
  ]);

  console.log('IAM: seeded 3 test users');
}
