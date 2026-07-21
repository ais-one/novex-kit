import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { embedText, ingestDocument, listDocuments, searchVector } from '../lib/rag.ts';

type ToolHandler = (
  args: Record<string, unknown>,
) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

export default function initRagTools(server: McpServer) {
  const registerTool = (
    server as unknown as {
      registerTool: (
        name: string,
        meta: { title: string; description: string; inputSchema: Record<string, unknown> },
        handler: ToolHandler,
      ) => void;
    }
  ).registerTool;

  registerTool(
    'rag_add_document',
    {
      title: 'Add Document',
      description: 'Ingest a plain-text document into the pgvector knowledge base',
      inputSchema: {
        id: z.string().describe('Unique document identifier'),
        title: z.string().describe('Document title (used as filename)'),
        content: z.string().describe('Document text content'),
      },
    },
    async ({ id, title, content }) => {
      const chunkCount = await ingestDocument(String(id), String(title), String(content));
      return { content: [{ type: 'text', text: `Document "${id}" ingested (${chunkCount} chunks)` }] };
    },
  );

  registerTool(
    'rag_search',
    {
      title: 'Search Documents',
      description: 'Vector similarity search over the pgvector knowledge base',
      inputSchema: {
        query: z.string().describe('Search query text'),
        top_k: z.number().int().min(1).max(20).default(5).describe('Number of results to return'),
      },
    },
    async ({ query, top_k }) => {
      const rows = await searchVector(String(query), Number(top_k) || 5);
      return { content: [{ type: 'text', text: JSON.stringify(rows) }] };
    },
  );

  registerTool(
    'rag_list_documents',
    {
      title: 'List Documents',
      description: 'List all documents currently in the pgvector knowledge base',
      inputSchema: {},
    },
    async () => {
      const rows = await listDocuments();
      return { content: [{ type: 'text', text: JSON.stringify(rows) }] };
    },
  );
}
