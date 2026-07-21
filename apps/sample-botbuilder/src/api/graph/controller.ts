import { botbuilderGraphs } from '@db/sample/schema';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../lib/db.ts';

export async function listConfigs() {
  return db().select().from(botbuilderGraphs).orderBy(desc(botbuilderGraphs.updatedAt));
}

export async function getConfig(id: number) {
  const [config] = await db().select().from(botbuilderGraphs).where(eq(botbuilderGraphs.id, id));
  return config;
}

export async function createConfig(data: { name: string; description?: string; flow: unknown; status?: string }) {
  const [config] = await db()
    .insert(botbuilderGraphs)
    .values({
      userId: 'default',
      name: data.name,
      description: data.description || '',
      flow: data.flow as Record<string, unknown>,
      status: data.status || 'draft',
    })
    .returning();
  return config;
}

export async function updateConfig(
  id: number,
  data: { name?: string; description?: string; flow?: unknown; status?: string },
) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.flow) updates.flow = data.flow as Record<string, unknown>;
  if (data.status) updates.status = data.status;

  const [config] = await db().update(botbuilderGraphs).set(updates).where(eq(botbuilderGraphs.id, id)).returning();
  return config;
}

export async function deleteConfig(id: number) {
  await db().delete(botbuilderGraphs).where(eq(botbuilderGraphs.id, id));
}
