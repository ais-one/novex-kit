import { randomUUID } from 'node:crypto';
import fs from 'node:fs'; // for HTTPS with valid CA certs
import https from 'node:https';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

import initPrompts from './prompts/index.js';
import initResources from './resources/index.js';
import initTools from './tools/index.js';

const app = express();
app.use(express.json());

// Store active transports keyed by session ID
const transports = new Map();

// Factory: create a fresh McpServer with all tools registered
function createMcpServer(initialHeaders) {
  const server = new McpServer({
    name: 'my-remote-server',
    version: '1.0.0',
  });

  initTools(server, initialHeaders);
  initResources(server);
  initPrompts(server);

  return server;
}

// ─── MCP Endpoint ──────────────────────────────────────────────────────────

// POST /mcp — handle all client messages
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  let transport;

  if (sessionId && transports.has(sessionId)) {
    // Reuse existing session
    transport = transports.get(sessionId);
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New session — create transport + server
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: id => {
        transports.set(id, transport);
        // console.log(`[session] created: ${id}`);
      },
    });

    transport.onclose = () => {
      const id = transport.sessionId;
      transports.delete(id);
      // console.log(`[session] closed: ${id}`);
    };

    const initialHeaders = { ...req.headers }; // for auth or other context in tools
    const server = createMcpServer(initialHeaders);
    await server.connect(transport);
  } else {
    res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Missing or invalid session' }, id: null });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// GET /mcp — open SSE stream for server-to-client notifications
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' }, id: null });
    return;
  }

  await transport.handleRequest(req, res);
});

// DELETE /mcp — terminate a session
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await transport.handleRequest(req, res);
});

// ─── Start ─────────────────────────────────────────────────────────────────

app.get('/status', (req, res) => res.send('OK - 0.6'));

const PORT = process.env.API_PORT || 443;

if (process.env.HTTPS) {
  const privateKey = fs.readFileSync('pems/abc.key', 'utf8');
  const certificate = fs.readFileSync('pems/abc.cert', 'utf8');
  const credentials = { key: privateKey, cert: certificate };
  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(PORT, () => {});
} else {
  app.listen(PORT, () => {});
}
