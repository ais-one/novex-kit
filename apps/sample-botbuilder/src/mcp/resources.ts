import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export default function initResources(server: McpServer) {
  server.resource('server-info', 'info://server', { mimeType: 'text/plain' }, async () => ({
    contents: [
      {
        uri: 'info://server',
        text: 'Botbuilder MCP Server v1.0 — Streamable HTTP',
      },
    ],
  }));
}
