import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { botbuilderGraphs, botbuilderMessages, botbuilderSessions } from '../schema.ts';

// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
export async function seed(db: NodePgDatabase<any>): Promise<void> {
  const defaultGraph = {
    name: 'Customer Service Bot',
    description: 'Default bot with router agent and tool agents',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 60, y: 40 }, data: {} },
      {
        id: 'n2',
        type: 'router-agent',
        position: { x: 60, y: 160 },
        data: {
          input: {
            systemPrompt:
              'Classify the user message into one of the following categories. If the user is greeting or the message is unclear, use general. If asking about documents, FAQ, or looking for information, use support. If asking about weather or temperature, use weather.',
            edges: [
              { name: 'general', description: 'Greeting, casual, or unclear messages' },
              { name: 'support', description: 'FAQ, documents, knowledge base' },
              { name: 'weather', description: 'Weather, temperature, forecast' },
            ],
          },
        },
      },
      {
        id: 'n3',
        type: 'text',
        position: { x: 460, y: 100 },
        data: { input: { message: 'Hello! How can I help you today?', captureData: false, stored_to: 'last_message' } },
      },
      {
        id: 'n4',
        type: 'tool-agent',
        position: { x: 460, y: 220 },
        data: {
          input: {
            systemPrompt:
              'You are a customer support agent. Answer user questions using the knowledge base. Be helpful, concise, and professional.',
            assignedTools: ['rag_search', 'rag_list_documents'],
          },
        },
      },
      {
        id: 'n5',
        type: 'tool-agent',
        position: { x: 460, y: 340 },
        data: {
          input: {
            systemPrompt:
              'You are a weather information agent. Answer weather questions by calling the weather tools. Respond in a friendly tone.',
            assignedTools: ['openweather_get_weather', 'openweather_get_forecast'],
          },
        },
      },
      {
        id: 'n6',
        type: 'text',
        position: { x: 460, y: 460 },
        data: { input: { message: "Sorry, I didn't understand that.", captureData: false, stored_to: 'last_message' } },
      },
      { id: 'n7', type: 'end-session', position: { x: 860, y: 260 }, data: {} },
    ],
    edges: [
      { source: 'n1', target: 'n2' },
      { source: 'n2', target: 'n3', label: 'general' },
      { source: 'n2', target: 'n4', label: 'support' },
      { source: 'n2', target: 'n5', label: 'weather' },
      { source: 'n2', target: 'n6', label: 'fallback' },
      { source: 'n3', target: 'n7' },
      { source: 'n4', target: 'n7' },
      { source: 'n5', target: 'n7' },
      { source: 'n6', target: 'n7' },
    ],
  };

  try {
    await db.delete(botbuilderMessages);
  } catch {
    /* table may not exist yet */
  }
  try {
    await db.delete(botbuilderSessions);
  } catch {
    /* table may not exist yet */
  }
  try {
    await db.delete(botbuilderGraphs);
  } catch {
    /* table may not exist yet */
  }

  await db.insert(botbuilderGraphs).values({
    userId: 'default',
    name: 'Customer Service Bot',
    description: 'Default bot with router agent and tool agents',
    flow: defaultGraph,
    status: 'published',
  });
}
