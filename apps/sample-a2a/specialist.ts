/**
 * Specialist Agent — document Q&A via MCP RAG pipeline (OpenAI generation).
 *
 * Exposes an A2A-compliant HTTP server:
 *   GET  /.well-known/agent.json  → AgentCard
 *   POST /                        → JSON-RPC 2.0 tasks/send
 *
 * Environment:
 *   SPECIALIST_PORT   default 3101
 *   MCP_SERVER_URL    default http://localhost:3000/mcp
 *   OPENAI_API_KEY    required
 *
 * Start:
 *   OPENAI_API_KEY=sk-...  node specialist.ts
 */

import express, { type Request, type Response } from 'express';
import { connectMcp } from './mcp-client.ts';
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

const PORT = Number(process.env.SPECIALIST_PORT) || 3101;
const MCP_URL = process.env.MCP_SERVER_URL ?? 'http://localhost:3000/mcp';

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
console.log(`[specialist] Connected to MCP at ${MCP_URL}`);

const app = express();
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`[specialist] Running at http://localhost:${PORT}`);
});
