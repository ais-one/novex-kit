import { documents } from '@db/rag/schema';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db.ts';
import { ingestDocument, listDocuments } from '../../lib/rag.ts';

export async function uploadDocument(title: string, content: string) {
  const id = `doc-${Date.now()}`;
  const chunkCount = await ingestDocument(id, title, content);
  return { id, title, chunks: chunkCount };
}

export async function getDocuments() {
  return listDocuments();
}

export async function deleteDocument(id: string) {
  await db().delete(documents).where(eq(documents.id, id));
}
