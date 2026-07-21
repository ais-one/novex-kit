import { openai } from '../../lib/openai.ts';
import type { BotStateType, GraphConfigNode } from '../state.ts';

export interface EdgeInfo {
  label: string;
  description: string;
  target: string;
}

export async function routerAgentNode(state: BotStateType, config?: GraphConfigNode, edgeInfo?: EdgeInfo[]) {
  const input = config?.data?.input as Record<string, unknown> | undefined;

  // Use injected edge info (auto-generated from graph edges) or fall back to config
  const edges = edgeInfo?.length
    ? edgeInfo
    : ((input?.edges as Array<{ name: string; description: string }>) || []).map(e => ({
        label: e.name,
        description: e.description,
        target: '',
      }));

  if (edges.length === 0) return { nextEdge: 'fallback' };

  // Use custom prompt if provided, otherwise auto-generate from edge info
  const customPrompt = (input?.systemPrompt as string) || '';
  const edgePrompt = edges.map(e => `- "${e.label}": ${e.description || e.label}`).join('\n');
  const systemPrompt = customPrompt
    ? `${customPrompt}\n\nRespond with ONLY the option name, no other text.`
    : `Classify the user message into exactly one category:\n${edgePrompt}\n\nRespond with ONLY the option name, no other text.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 20,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.message },
    ],
  });

  // Extract just the first word/phrase — ignore extra text from LLM
  const raw = completion.choices[0].message.content?.trim().toLowerCase() || 'fallback';
  const choice = raw.split(/[\s\n.,;]+/)[0];
  const match = edges.find(e => e.label.toLowerCase() === choice);
  return { nextEdge: match?.label || 'fallback' };
}
