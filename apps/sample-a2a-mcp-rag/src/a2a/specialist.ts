import '@common/node/logger';
import '@common/node/config';

import preRoute from '@common/node/express/preRoute';
import type { Request, Response } from 'express';
import { connectMcp } from '../lib/mcp-client.ts';
import { ragQuery } from './rag.ts';

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

const PORT = Number(process.env.SPECIALIST_PORT) || 3202;
const MCP_URL = process.env.MCP_SERVER_URL ?? 'http://localhost:3200/mcp';

const AGENT_CARD = {
  name: 'Document Q&A Specialist',
  description: 'Answers questions by retrieving relevant documents from the MCP knowledge base (RAG + OpenAI)',
  url: `http://localhost:${PORT}`,
  version: '1.0.0',
  capabilities: { streaming: false },
  skills: [
    {
      id: 'document-qa',
      name: 'Document Q&A',
      description: 'Answer questions using documents stored in the MCP knowledge base',
      examples: ['What is RAG?', 'How does MCP work?', 'Explain ES modules'],
    },
  ],
};

const mcp = await connectMcp(MCP_URL);
logger.info(`specialist connected to MCP at ${MCP_URL}`);

const { app, server } = preRoute();

app.get('/.well-known/agent.json', (_req: Request, res: Response) => {
  res.json(AGENT_CARD);
});

app.post('/', async (req: Request, res: Response) => {
  const { id: rpcId, params } = req.body as JsonRpcRequest;
  const { id: taskId, message } = params;
  const userText = message?.parts?.find(p => p.type === 'text')?.text ?? '';

  try {
    const answer = await ragQuery(mcp, userText);
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

server.listen(PORT, () => logger.info(`specialist running on ${PORT}`));
