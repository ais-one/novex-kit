import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export default function initPrompts(server: McpServer) {
  server.prompt('review-code', { code: z.string() }, ({ code }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please review this code:\n\n${code}`,
          },
        },
      ],
    };
  });
}
