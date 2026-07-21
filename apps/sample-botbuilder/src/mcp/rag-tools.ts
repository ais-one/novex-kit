import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ingestDocument, listDocuments, searchVector } from '../lib/rag.ts';

export default function initRagTools(server: McpServer) {
  // biome-ignore lint/suspicious/noExplicitAny: registerTool requires this binding
  const register = (server as any).registerTool.bind(server);

  register(
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

  register(
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

  register(
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
