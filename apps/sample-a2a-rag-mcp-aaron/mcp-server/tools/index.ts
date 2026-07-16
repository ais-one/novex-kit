import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import initRagTools from './rag.ts';

export default function initTools(server: McpServer): void {
  initRagTools(server);
}
