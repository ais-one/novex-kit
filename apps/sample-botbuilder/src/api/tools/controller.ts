import { connectMcp } from '../../lib/mcp-client.ts';

export async function listTools() {
  const mcpClient = await connectMcp(process.env.MCP_SERVER_URL || 'http://localhost:3100/mcp');
  try {
    return await mcpClient.listTools();
  } finally {
    await mcpClient.close();
  }
}
