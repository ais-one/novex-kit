import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export async function connectMcp(serverUrl: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  const client = new Client({ name: 'a2a-mcp-client', version: '1.0.0' });
  await client.connect(transport);
  return client;
}
