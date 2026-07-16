import '@common/node/logger';
import '@common/node/config';

import preRoute from '@common/node/express/preRoute';
import type { Request, Response } from 'express';
import OpenAI from 'openai';
import { sendTask } from './client.ts';

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

const PORT = Number(process.env.SUPERVISOR_PORT) || 3201;
const SPECIALIST_URL = process.env.SPECIALIST_URL ?? 'http://localhost:3202';

const AGENT_CARD = {
  name: 'Supervisor Agent',
  description: 'Routes user queries to specialist agents and synthesizes responses using OpenAI',
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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { app, server } = preRoute();

app.get('/.well-known/agent.json', (_req: Request, res: Response) => {
  res.json(AGENT_CARD);
});

app.post('/', async (req: Request, res: Response) => {
  const { id: rpcId, params } = req.body as JsonRpcRequest;
  const { id: taskId, message } = params;
  const userQuery = message?.parts?.find(p => p.type === 'text')?.text ?? '';

  try {
    // Step 1 — classify the query
    const classifyRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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

    const classification = (classifyRes.choices[0].message.content ?? '').trim().toLowerCase();
    logger.info(`supervisor query="${userQuery}" classification=${classification}`);

    // Step 2 — delegate to specialist when it's a knowledge-base question
    let specialistAnswer = '';
    if (classification.includes('document')) {
      logger.info(`supervisor delegating to specialist at ${SPECIALIST_URL}`);
      specialistAnswer = await sendTask(SPECIALIST_URL, userQuery);
      logger.info(`supervisor specialist replied: ${specialistAnswer.slice(0, 80)}...`);
    }

    // Step 3 — synthesize the final answer
    const synthesisPrompt = specialistAnswer
      ? `A specialist agent researched the question and found:\n"${specialistAnswer}"\n\nPolish this into a clear, helpful answer for: "${userQuery}"`
      : `Answer this question concisely and helpfully: "${userQuery}"`;

    const finalRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      messages: [{ role: 'user', content: synthesisPrompt }],
    });

    const answer = finalRes.choices[0].message.content ?? '';

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

server.listen(PORT, () => logger.info(`supervisor running on ${PORT}`));
