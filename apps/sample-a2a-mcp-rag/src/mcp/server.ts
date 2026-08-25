import '@common/node/logger';
import '@common/node/config';

import { randomUUID } from 'node:crypto';
import preRoute from '@common/node/express/preRoute';
import * as services from '@common/node/services';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import initPrompts from './prompts.ts';
import initResources from './resources.ts';
import initTools from './tools.ts';

const { app, server } = preRoute();

// Store active transports keyed by session ID
const transports = new Map<string, StreamableHTTPServerTransport>();

// Factory: create a fresh McpServer with all tools registered
function createMcpServer(initialHeaders: Record<string, string | string[] | undefined>) {
  const mcp = new McpServer({
    name: 'my-remote-server',
    version: '1.0.0',
  });

  initTools(mcp, initialHeaders, services.get('drizzle1'));
  initResources(mcp);
  initPrompts(mcp);

  return mcp;
}

// ─── MCP Endpoint ──────────────────────────────────────────────────────────

// POST /mcp — handle all client messages
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport | undefined;

  if (sessionId && transports.has(sessionId)) {
    // Reuse existing session
    transport = transports.get(sessionId);
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New session — create transport + server
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: id => {
        // biome-ignore lint/style/noNonNullAssertion: transport was assigned above
        transports.set(id, transport!);
        logger.info(`[session] created: ${id}`);
      },
    });

    transport.onclose = () => {
      // biome-ignore lint/style/noNonNullAssertion: transport assigned above, sessionId always set by SDK
      const id = transport!.sessionId;
      // biome-ignore lint/style/noNonNullAssertion: id is always set by sessionIdGenerator
      transports.delete(id!);
      logger.info(`[session] closed: ${id}`);
    };

    const initialHeaders = { ...req.headers } as Record<string, string | string[] | undefined>;
    const mcp = createMcpServer(initialHeaders);
    await mcp.connect(transport);
  } else {
    res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Missing or invalid session' }, id: null });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// GET /mcp — open SSE stream for server-to-client notifications
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    res.status(404).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' }, id: null });
    return;
  }

  await transport.handleRequest(req, res);
});

// DELETE /mcp — terminate a session
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await transport.handleRequest(req, res);
});

// ─── Start ─────────────────────────────────────────────────────────────────

app.get('/status', (req, res) => res.send('OK - 0.6'));

const PORT = process.env.API_PORT || 443;
server.listen(PORT, () => logger.info(`sample-mcp running on ${PORT}`));
