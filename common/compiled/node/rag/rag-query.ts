import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type OpenAI from 'openai';
import { searchHybrid } from './search.ts';

export async function ragQuery(db: NodePgDatabase, openai: OpenAI, query: string, topK = 5): Promise<string> {
  const chunks = await searchHybrid(db, openai, query, topK);

  if (!chunks.length) {
    return 'No relevant documents found in the knowledge base.';
  }

  const context = chunks.map((c, i) => `[${i + 1}] Source: ${c.filename}\n${c.content}`).join('\n\n---\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content:
          'Answer the question using only the provided context. ' +
          'Cite sources using [1], [2] etc. If the answer is not in the context, say so clearly.',
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${query}`,
      },
    ],
  });

  return response.choices[0].message.content ?? '';
}
