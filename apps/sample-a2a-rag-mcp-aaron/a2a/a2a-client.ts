import { randomUUID } from 'node:crypto';

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: { streaming: boolean };
  skills: { id: string; name: string; description: string; examples?: string[] }[];
}

interface A2AResponse {
  jsonrpc: '2.0';
  id: string;
  result?: {
    id: string;
    status: { state: string };
    artifacts: { parts: { type: string; text: string }[] }[];
  };
  error?: { code: number; message: string };
}

export async function getAgentCard(agentBaseUrl: string): Promise<AgentCard> {
  const res = await fetch(`${agentBaseUrl}/.well-known/agent.json`);
  if (!res.ok) throw new Error(`Agent card fetch failed: ${res.status}`);
  return res.json() as Promise<AgentCard>;
}

export async function sendTask(agentBaseUrl: string, text: string, taskId = randomUUID()): Promise<string> {
  const body = {
    jsonrpc: '2.0',
    id: taskId,
    method: 'tasks/send',
    params: {
      id: taskId,
      message: { role: 'user', parts: [{ type: 'text', text }] },
    },
  };

  const res = await fetch(`${agentBaseUrl}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as A2AResponse;
  if (json.error) throw new Error(`A2A error: ${json.error.message}`);

  return json.result?.artifacts[0].parts[0].text;
}
