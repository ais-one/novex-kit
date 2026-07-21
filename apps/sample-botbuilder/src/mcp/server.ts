import '@common/node/logger';
import '@common/node/config';

import { randomUUID } from 'node:crypto';
import postRoute from '@common/node/express/postRoute';
import preRoute from '@common/node/express/preRoute';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import initPrompts from './prompts.ts';
import initResources from './resources.ts';
import initTools from './tools.ts';

const { app, express, server } = preRoute();
const transports = new Map<string, StreamableHTTPServerTransport>();

function createMcpServer() {
  const mcp = new McpServer({ name: 'botbuilder-mcp', version: '1.0.0' });
  initTools(mcp);
  initResources(mcp);
  initPrompts(mcp);
  return mcp;
}

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport | undefined;

  if (sessionId && transports.has(sessionId)) {
    transport = transports.get(sessionId);
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: id => {
        transports.set(id, transport!);
        logger.info(`[mcp] session created: ${id}`);
      },
    });
    transport.onclose = () => {
      const id = transport!.sessionId;
      transports.delete(id!);
      logger.info(`[mcp] session closed: ${id}`);
    };
    const mcp = createMcpServer();
    await mcp.connect(transport);
  } else {
    res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Missing or invalid session' }, id: null });
    return;
  }

  await transport!.handleRequest(req, res, req.body);
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;
  if (!transport) {
    res.status(404).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' }, id: null });
    return;
  }
  await transport.handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;
  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  await transport.handleRequest(req, res);
});

app.get('/status', (_req, res) => res.send('OK'));

postRoute(app, express);

const PORT = process.env.MCP_PORT || 3100;
server.listen(PORT, () => logger.info(`botbuilder-mcp running on ${PORT}`));
