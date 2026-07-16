import '@common/node/logger';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs'; // for HTTPS with valid CA certs
import https from 'node:https';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import express, { type Request, type Response } from 'express';

import initPrompts from './prompts/index.ts';
import initResources from './resources/index.ts';
import initTools from './tools/index.ts';

const app = express();
app.use(express.json());

// Store active transports keyed by session ID
const transports = new Map<string, StreamableHTTPServerTransport>();

// Factory: create a fresh McpServer with all tools registered
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'my-remote-server',
    version: '1.0.0',
  });

  initTools(server);
  initResources(server);
  initPrompts(server);

  return server;
}

// ─── MCP Endpoint ──────────────────────────────────────────────────────────

// POST /mcp — handle all client messages
app.post('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports.has(sessionId)) {
    // Reuse existing session
    transport = transports.get(sessionId) as StreamableHTTPServerTransport;
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New session — create transport + server
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: id => {
        transports.set(id, transport);
        logger.debug(`[session] created: ${id}`);
      },
    });

    transport.onclose = () => {
      const id = transport.sessionId;
      if (id) transports.delete(id);
      logger.debug(`[session] closed: ${id}`);
    };

    const server = createMcpServer();
    await server.connect(transport);
  } else {
    res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Missing or invalid session' }, id: null });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// GET /mcp — open SSE stream for server-to-client notifications
app.get('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    res.status(404).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' }, id: null });
    return;
  }

  await transport.handleRequest(req, res);
});

// DELETE /mcp — terminate a session
app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await transport.handleRequest(req, res);
});

// ─── Start ─────────────────────────────────────────────────────────────────

app.get('/status', (_req: Request, res: Response) => res.send('OK - 0.6'));

const PORT = Number(process.env.API_PORT) || 443;

if (process.env.HTTPS) {
  const privateKey = fs.readFileSync('pems/abc.key', 'utf8');
  const certificate = fs.readFileSync('pems/abc.cert', 'utf8');
  const credentials = { key: privateKey, cert: certificate };
  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(PORT, () => logger.info(`[mcp-server] HTTPS listening on ${PORT}`));
} else {
  app.listen(PORT, () => logger.info(`[mcp-server] listening on ${PORT}`));
}
