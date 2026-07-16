/**
 * Simulates a 3-turn Telegram conversation with the report agent.
 *
 * Prerequisites:
 *   1. MCP server running:   npm run start:mcp
 *   2. Public URL for the MCP server — OpenAI's servers must reach it.
 *      For local dev use a tunnel: npx ngrok http 3200
 *      Then set MCP_SERVER_URL=https://<your-tunnel>.ngrok.io/mcp
 *   3. OPENAI_API_KEY set in environment.
 *
 * Run:
 *   npm run agent-demo
 */

import { clearSession, handleMessage } from './agent.ts';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3200/mcp';

// Simulates telegram_id extracted from the incoming Telegram message header.
const TELEGRAM_ID = 'tg_123';

const CONVERSATION = ['I need a report', 'I would like 2 and 5', '2025-11-01 to 12 Mar 2026'];

console.log(`MCP server: ${MCP_SERVER_URL}`);
console.log(`Telegram ID: ${TELEGRAM_ID}\n`);
console.log('─'.repeat(50));

for (const userText of CONVERSATION) {
  console.log(`\nUser: ${userText}`);
  const reply = await handleMessage({ telegramId: TELEGRAM_ID, userText, mcpServerUrl: MCP_SERVER_URL });
  console.log(`Bot:  ${reply}`);
  console.log('─'.repeat(50));
}

clearSession(TELEGRAM_ID);
