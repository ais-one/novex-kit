import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { openai } from '../../lib/openai.ts';
import type { BotStateType, GraphConfigNode } from '../state.ts';

function cleanJson(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```json')) s = s.slice(7);
  if (s.startsWith('```')) s = s.slice(3);
  if (s.endsWith('```')) s = s.slice(0, -3);
  return s.trim();
}

export async function toolAgentNode(state: BotStateType, mcpClient: Client, config?: GraphConfigNode) {
  const input = config?.data?.input as Record<string, unknown> | undefined;
  const systemPrompt = (input?.systemPrompt as string) || 'You are a helpful assistant. Use tools when needed.';
  const assignedTools = (input?.assignedTools as string[]) || [];
  const storedTo = (input?.stored_to as string) || 'last_message';
  const multipleVariables = input?.multipleVariables as boolean | undefined;
  const toolOutputMapping = (input?.toolOutputMapping as Record<string, Record<string, string>>) || {};

  const storedToKeys =
    multipleVariables && typeof input?.stored_to === 'string' && input.stored_to
      ? (input.stored_to as string)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : [];

  // Build format instruction for multipleVariables
  let formatInstruction = '';
  if (storedToKeys.length > 0) {
    const tempJson: Record<string, string> = {};
    for (const key of storedToKeys) tempJson[key] = '';
    formatInstruction = `\n\nYou must respond with ONLY a valid JSON object, using exactly these keys:\n${JSON.stringify(tempJson, null, 2)}\nDo not include any other text, markdown, or explanation — just the JSON object.`;
  }

  logger.info(`[tool-agent] loading tools (assigned=${assignedTools.join(',')})`);
  const allToolsResult = await mcpClient.listTools();
  const allTools =
    (allToolsResult as { tools: Array<{ name: string; description?: string; inputSchema: unknown }> }).tools || [];
  const tools = allTools.filter(t => assignedTools.includes(t.name));
  logger.info(`[tool-agent] available tools: ${tools.map(t => t.name).join(', ')}`);

  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: systemPrompt + formatInstruction },
    ...state.history.map(h => ({ role: h.role === 'bot' ? 'assistant' : h.role, content: h.content })),
    { role: 'user', content: state.message },
  ];

  let finalResponse = '';
  const toolResultVars: Record<string, unknown> = {};
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
        logger.info(`[tool] ${toolCall.function.name} -> ${text.slice(0, 120)}`);
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: text });

        // Extract mapped fields from tool result
        const mapping = toolOutputMapping[toolCall.function.name];
        if (mapping && Object.keys(mapping).length > 0) {
          try {
            const parsed = JSON.parse(text);
            for (const [field, varName] of Object.entries(mapping)) {
              if (varName && parsed[field] !== undefined) {
                toolResultVars[varName] = parsed[field];
                logger.info(`[tool-agent] mapped ${toolCall.function.name}.${field} -> ${varName}`);
              }
            }
          } catch {
            logger.warn(
              `[tool-agent] could not parse tool result for ${toolCall.function.name}, skipping field mapping`,
            );
          }
        }
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

  const history: Array<{ role: 'user' | 'bot'; content: string }> = [{ role: 'bot' as const, content: finalResponse }];

  // multipleVariables mode: parse JSON response, merge with tool result vars
  if (storedToKeys.length > 0) {
    try {
      const parsed = JSON.parse(cleanJson(finalResponse));
      const aiVars: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (value !== '' && value !== null && value !== undefined) {
          aiVars[key] = value;
        }
      }
      const merged = { ...toolResultVars, ...aiVars };
      logger.info(`[tool-agent] stored ${Object.keys(merged).join(', ')} via multipleVariables + toolOutputMapping`);
      return { variables: merged, history };
    } catch {
      logger.warn('[tool-agent] multipleVariables enabled but LLM did not return valid JSON, storing as raw text');
      const merged = { ...toolResultVars, [storedTo]: finalResponse };
      return { variables: merged, history };
    }
  }

  // Single variable mode: merge tool result vars with AI response
  const merged = { ...toolResultVars, [storedTo]: finalResponse };
  logger.info(
    `[tool-agent] stored response -> ${storedTo} (tool vars: ${Object.keys(toolResultVars).join(', ') || 'none'})`,
  );
  return { variables: merged, history };
}
