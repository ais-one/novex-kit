import crypto from 'node:crypto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { setScryptHash } from '../../../../common/compiled/node/auth/scrypt.js';
import { users } from '../../../../common/compiled/node/services/db/schema.ts';

// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
export async function seed(db: NodePgDatabase<any>): Promise<void> {
  const salt = crypto.randomBytes(16).toString('hex');
  const password = await setScryptHash('test', salt);

  try {
    await db.delete(users);
  } catch (e) {
    console.log((e as Error).toString());
  }

  await db.insert(users).values([
    {
      id: 1,
      roles: 'TestGroup',
      tenant_id: 1,
      username: 'test',
      email: 'test',
      githubId: null,
      salt,
      password,
      gaKey: 'IZDXCUDYNQ4ESMZZNY4HGZSDJRAVGZCO',
      sms: '6596935500',
      smsVerified: 0,
      telegramId: '183535134',
      telegramUsername: 'aaronjxz',
      revoked: '',
      refreshToken: '',
    },
    {
      id: 2,
      roles: 'TestGithub',
      tenant_id: 1,
      username: 'ais-one',
      email: 'ais-one',
      githubId: 4284574,
      salt,
      password,
      gaKey: 'IZDXCUDYNQ4ESMZZNY4HGZSDJRAVGZCO',
      sms: '6596935500',
      smsVerified: 0,
      telegramId: '183535134',
      telegramUsername: 'aaronjxz',
      revoked: '',
      refreshToken: '',
    },
    {
      id: 3,
      roles: 'TestGmail,TestGroup',
      tenant_id: 1,
      username: 'aaronjxz',
      email: 'aaronjxz',
      githubId: null,
      salt,
      password,
      gaKey: 'IZDXCUDYNQ4ESMZZNY4HGZSDJRAVGZCO',
      sms: '6596935500',
      smsVerified: 0,
      telegramId: '183535134',
      telegramUsername: 'aaronjxz',
      revoked: '',
      refreshToken: '',
    },
  ]);
}
