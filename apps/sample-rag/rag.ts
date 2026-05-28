import OpenAI from 'openai';
import { ingestS3, ingestText } from './ingest.ts';
import { searchHybrid } from './search.ts';

export { ingestS3, ingestText };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function ingestDocuments(docs: { id: string; title: string; content: string }[]): Promise<void> {
  for (const doc of docs) {
    await ingestText(doc.id, doc.title, doc.content);
  }
}

export async function ragQuery(query: string, topK = 5): Promise<string> {
  const chunks = await searchHybrid(query, topK);

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
