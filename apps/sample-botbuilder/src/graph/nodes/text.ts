import type { BotStateType, GraphConfigNode } from '../state.ts';

export async function textNode(state: BotStateType, config?: GraphConfigNode) {
  const messageTemplate = (config?.data?.input?.message as string) || '';
  const interpolated = messageTemplate.replace(/\{(\w+)\}/g, (_, key: string) => {
    return String(state.variables?.[key] ?? `{${key}}`);
  });
  return { agentResponse: interpolated || "Sorry, I don't understand." };
}
