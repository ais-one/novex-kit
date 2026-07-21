import * as services from '@common/node/services';
import type { drizzle } from 'drizzle-orm/node-postgres';

type DrizzleDB = ReturnType<typeof drizzle>;

export function db(): DrizzleDB {
  return services.get('drizzle1') as DrizzleDB;
}
