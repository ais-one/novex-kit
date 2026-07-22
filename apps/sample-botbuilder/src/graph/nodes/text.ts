import type { BotStateType, GraphConfigNode } from '../state.ts';

export async function textNode(state: BotStateType, config?: GraphConfigNode) {
  const input = config?.data?.input as Record<string, unknown> | undefined;
  const messageTemplate = (input?.message as string) || '';
  const captureData = input?.captureData as boolean | undefined;
  const storedTo = (input?.stored_to as string) || 'last_message';

  const interpolated = messageTemplate.replace(/\{(\w+)\}/g, (_, key: string) => {
    return String(state.variables?.[key] ?? `{${key}}`);
  });

  // captureData: resuming from this node = capture user input
  if (captureData && state.resumeNodeId === config?.id) {
    const updatedVars = { ...state.variables, [storedTo]: state.message };
    logger.info(`[text] captureData: stored "${state.message.slice(0, 40)}" → ${storedTo}`);
    // Set captureDataDone so conditional edge routes to next node, clear resumeNodeId so loop-back sends instead of captures
    return { variables: updatedVars, captureDataDone: config?.id, resumeNodeId: undefined };
  }

  // captureData: loop back after previous capture — send message again, clear captureDataDone
  if (captureData && state.captureDataDone === config?.id) {
    const response = interpolated || 'Please provide your input.';
    logger.info(`[text] captureData loop-back: sending "${response.slice(0, 40)}"`);
    return {
      agentResponse: response,
      pendingMessages: [response],
      history: [{ role: 'bot' as const, content: response }],
      captureDataDone: undefined,
    };
  }

  // captureData with no message: just pause, don't send anything
  if (captureData && !messageTemplate) {
    return {
      agentResponse: '',
      pendingMessages: [],
      history: [],
    };
  }

  const response = interpolated || (captureData ? 'Please provide your input.' : "Sorry, I don't understand.");

  return {
    agentResponse: response,
    pendingMessages: [response],
    history: [{ role: 'bot' as const, content: response }],
  };
}
