import { openai } from '../../lib/openai.ts';
import type { BotStateType, GraphConfigNode } from '../state.ts';

export async function routerAgentNode(state: BotStateType, config?: GraphConfigNode) {
  const input = config?.data?.input as Record<string, unknown> | undefined;
  const systemPrompt = (input?.systemPrompt as string) || 'Route the user to the correct department.';
  const edges = (input?.edges as Array<{ name: string; description: string }>) || [];

  if (edges.length === 0) return { nextEdge: 'fallback' };

  const edgePrompt = edges.map(e => `- "${e.name}": ${e.description}`).join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 20,
    messages: [
      {
        role: 'system',
        content: `${systemPrompt}\nPick exactly one option:\n${edgePrompt}\nRespond with only the option name.`,
      },
      { role: 'user', content: state.message },
    ],
  });

  const choice = completion.choices[0].message.content?.trim().toLowerCase() || 'fallback';
  const edge = edges.find(e => e.name.toLowerCase() === choice);
  return { nextEdge: edge?.name || 'fallback' };
}
