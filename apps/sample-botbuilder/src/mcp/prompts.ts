import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export default function initPrompts(server: McpServer) {
  server.prompt('support-agent', 'Generate a system prompt for a support agent', () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'You are a customer support agent with access to tools. Use them when relevant to answer user questions. Be helpful, concise, and professional.',
        },
      },
    ],
  }));
}
