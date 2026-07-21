import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { openai } from '../../lib/openai.ts';
import type { BotStateType, GraphConfigNode } from '../state.ts';

export async function toolAgentNode(state: BotStateType, mcpClient: Client, config?: GraphConfigNode) {
  const input = config?.data?.input as Record<string, unknown> | undefined;
  const systemPrompt = (input?.systemPrompt as string) || 'You are a helpful assistant. Use tools when needed.';
  const assignedTools = (input?.assignedTools as string[]) || [];

  logger.info(`[tool-agent] loading tools (assigned=${assignedTools.join(',')})`);
  const allToolsResult = await mcpClient.listTools();
  const allTools =
    (allToolsResult as { tools: Array<{ name: string; description?: string; inputSchema: unknown }> }).tools || [];
  const tools = allTools.filter(t => assignedTools.includes(t.name));
  logger.info(`[tool-agent] available tools: ${tools.map(t => t.name).join(', ')}`);

  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: systemPrompt },
    ...state.history.map(h => ({ role: h.role === 'bot' ? 'assistant' : h.role, content: h.content })),
    { role: 'user', content: state.message },
  ];

  let finalResponse = '';
  const MAX_ITERATIONS = 10;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    logger.info('[tool-agent] calling LLM...');
    const params: Record<string, unknown> = {
      model: 'gpt-4o-mini',
      messages,
      tools:
        tools.length > 0
          ? tools.map(t => ({
              type: 'function' as const,
              function: { name: t.name, description: t.description, parameters: t.inputSchema },
            }))
          : undefined,
      tool_choice: tools.length > 0 ? ('auto' as const) : undefined,
    };
    const completion = (await openai.chat.completions.create(
      params as unknown as Parameters<typeof openai.chat.completions.create>[0],
    )) as {
      choices: Array<{
        message: { content: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> };
      }>;
    };

    const message = completion.choices[0].message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCalls = message.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }>;
      logger.info(
        `[tool-agent] LLM requested ${toolCalls.length} tool call(s): ${toolCalls.map(t => `${t.function.name}(${t.function.arguments})`).join(', ')}`,
      );
      messages.push(message as unknown as Record<string, unknown>);

      for (const toolCall of toolCalls) {
        const args = JSON.parse(toolCall.function.arguments);
        logger.info(`[mcp] calling ${toolCall.function.name}...`);
        const result = await mcpClient.callTool({ name: toolCall.function.name, arguments: args });
        const text = (result.content as Array<{ type: string; text: string }>)?.[0]?.text || '';
        logger.info(`[tool] ${toolCall.function.name} → ${text.slice(0, 120)}`);
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: text });
      }
    } else {
      finalResponse = message.content || '';
      logger.info(`[tool-agent] LLM responded: "${finalResponse.slice(0, 80)}"`);
      break;
    }
  }

  if (!finalResponse) {
    logger.warn('[tool-agent] max iterations reached without response');
    finalResponse = 'I apologize, I was unable to process your request. Please try again.';
  }

  return {
    agentResponse: finalResponse,
    history: [
      ...state.history,
      { role: 'user' as const, content: state.message },
      { role: 'bot' as const, content: finalResponse },
    ],
    requireUserInput: true,
  };
}
