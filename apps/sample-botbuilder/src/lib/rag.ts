import { chunks, documents } from '@db/rag/schema';
import { desc, sql } from 'drizzle-orm';
import pgvector from 'pgvector/pg';
import { db } from './db.ts';
import { openai } from './openai.ts';

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text });
  return response.data[0].embedding;
}

export async function searchVector(
  query: string,
  topK = 5,
): Promise<Array<{ content: string; filename: string; doc_id: string }>> {
  const embedding = await embedText(query);
  const embeddingStr = pgvector.toSql(embedding);
  const result = await db().execute(sql`
    SELECT c.content, d.filename, d.id AS doc_id
    FROM chunks c JOIN documents d ON c.document_id = d.id
    ORDER BY c.embedding <=> ${embeddingStr} LIMIT ${topK}
  `);
  return result.rows as Array<{ content: string; filename: string; doc_id: string }>;
}

export async function listDocuments() {
  return db()
    .select({
      id: documents.id,
      filename: documents.filename,
      created_at: documents.createdAt,
    })
    .from(documents)
    .orderBy(desc(documents.createdAt));
}

export async function ingestDocument(docId: string, title: string, content: string): Promise<number> {
  const { RecursiveCharacterTextSplitter } = await import('@langchain/textsplitters');
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });
  const textChunks = await splitter.splitText(content);
  const embeddings = await Promise.all(textChunks.map(c => embedText(c)));

  await db().transaction(async tx => {
    await tx.insert(documents).values({ id: docId, filename: title }).onConflictDoNothing();
    for (let i = 0; i < textChunks.length; i++) {
      await tx.insert(chunks).values({
        documentId: docId,
        content: textChunks[i],
        embedding: embeddings[i],
        chunkIndex: i,
      });
    }
  });

  return textChunks.length;
}
