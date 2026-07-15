// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { roles } from '../schema.ts';

// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
export async function seed(db: NodePgDatabase<any>): Promise<void> {
  await db.delete(roles);

  await db.insert(roles).values([
    {
      name: 'superadmin',
      description: 'Full access',
      permissions: ['*:*'],
      is_system: true,
    },
    {
      name: 'admin',
      description: 'Administrative access',
      permissions: ['admin:*'],
      is_system: true,
    },
    {
      name: 'user',
      description: 'Standard user',
      permissions: ['profile:read', 'profile:write'],
      is_system: true,
    },
  ]);

  console.log('IAM: seeded 3 system roles');
}
