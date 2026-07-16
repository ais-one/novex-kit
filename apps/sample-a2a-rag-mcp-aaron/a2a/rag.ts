import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import OpenAI from 'openai';

interface Doc {
  id: string;
  title: string;
  content: string;
  score: number;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function ragQuery(mcp: Client, query: string, topK = 3): Promise<string> {
  const searchResult = await mcp.callTool({
    name: 'rag_search',
    arguments: { query, top_k: topK },
  });

  const docs: Doc[] = JSON.parse((searchResult.content[0] as { text: string }).text);

  if (!docs.length) {
    return 'No relevant documents found in the knowledge base.';
  }

  const context = docs.map((d, i) => `[${i + 1}] ${d.title}\n${d.content}`).join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Answer the question using only the provided context. Be concise and factual. ' +
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
