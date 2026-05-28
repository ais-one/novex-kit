/**
 * Supervisor Agent — routes queries to the specialist via A2A, synthesizes with Claude.
 *
 * Exposes an A2A-compliant HTTP server:
 *   GET  /.well-known/agent.json  → AgentCard
 *   POST /                        → JSON-RPC 2.0 tasks/send
 *
 * Flow per query:
 *   1. Classify query with Claude (document-qa vs. general)
 *   2. Delegate to specialist agent via A2A tasks/send
 *   3. Synthesize final response with Claude
 *
 * Environment:
 *   SUPERVISOR_PORT   default 3100
 *   SPECIALIST_URL    default http://localhost:3101
 *   ANTHROPIC_API_KEY required
 *
 * Start:
 *   ANTHROPIC_API_KEY=sk-ant-...  node supervisor.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import express, { type Request, type Response } from 'express';
import { sendTask } from './a2a-client.ts';

interface TaskMessage {
  role: string;
  parts: { type: string; text?: string }[];
}

interface TaskSendParams {
  id: string;
  message: TaskMessage;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params: TaskSendParams;
}

const PORT = Number(process.env.SUPERVISOR_PORT) || 3100;
const SPECIALIST_URL = process.env.SPECIALIST_URL ?? 'http://localhost:3101';

const AGENT_CARD = {
  name: 'Supervisor Agent',
  description: 'Routes user queries to specialist agents and synthesizes responses using Claude',
  url: `http://localhost:${PORT}`,
  version: '1.0.0',
  capabilities: { streaming: false },
  skills: [
    {
      id: 'general-query',
      name: 'General Query',
      description: 'Handle any question by routing to the appropriate specialist and polishing the result',
      examples: ['What is RAG?', 'How does the A2A protocol work?'],
    },
  ],
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const app = express();
app.use(express.json());

app.get('/.well-known/agent.json', (_req: Request, res: Response) => {
  res.json(AGENT_CARD);
});

app.post('/', async (req: Request, res: Response) => {
  const { id: rpcId, params } = req.body as JsonRpcRequest;
  const { id: taskId, message } = params;
  const userQuery = message?.parts?.find(p => p.type === 'text')?.text ?? '';

  try {
    // Step 1 — classify the query
    const classifyRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      messages: [
        {
          role: 'user',
          content:
            `Classify the query as "document-qa" if it asks about topics likely in a knowledge base, ` +
            `or "general" otherwise.\nQuery: "${userQuery}"\nRespond with exactly one word.`,
        },
      ],
    });

    const classification = (classifyRes.content[0] as { text: string }).text.trim().toLowerCase();
    console.log(`[supervisor] query="${userQuery}" → ${classification}`);

    // Step 2 — delegate to specialist when it's a knowledge-base question
    let specialistAnswer = '';
    if (classification.includes('document')) {
      console.log(`[supervisor] delegating to specialist at ${SPECIALIST_URL}`);
      specialistAnswer = await sendTask(SPECIALIST_URL, userQuery);
      console.log(`[supervisor] specialist replied: ${specialistAnswer.slice(0, 80)}...`);
    }

    // Step 3 — synthesize the final answer with Claude
    const synthesisPrompt = specialistAnswer
      ? `A specialist agent researched the question and found:\n"${specialistAnswer}"\n\nPolish this into a clear, helpful answer for: "${userQuery}"`
      : `Answer this question concisely and helpfully: "${userQuery}"`;

    const finalRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: synthesisPrompt }],
    });

    const answer = (finalRes.content[0] as { text: string }).text;

    res.json({
      jsonrpc: '2.0',
      id: rpcId,
      result: {
        id: taskId,
        status: { state: 'completed' },
        artifacts: [{ parts: [{ type: 'text', text: answer }] }],
      },
    });
  } catch (err) {
    res.json({
      jsonrpc: '2.0',
      id: rpcId,
      error: { code: -32000, message: (err as Error).message },
    });
  }
});

app.listen(PORT, () => {
  console.log(`[supervisor] Running at http://localhost:${PORT}`);
});
