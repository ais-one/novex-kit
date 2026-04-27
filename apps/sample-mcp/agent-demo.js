/**
 * Simulates a 3-turn Telegram conversation with the report agent.
 *
 * Prerequisites:
 *   1. MCP server running:   npm run start   (in apps/sample-mcp)
 *   2. Public URL for the MCP server — OpenAI's servers must reach it.
 *      For local dev use a tunnel: npx ngrok http 3000
 *      Then set MCP_SERVER_URL=https://<your-tunnel>.ngrok.io/mcp
 *   3. OPENAI_API_KEY set in environment.
 *
 * Run:
 *   OPENAI_API_KEY=sk-... MCP_SERVER_URL=https://... node agent-demo.js
 *
# Terminal 1 — start the MCP server
cd apps/sample-mcp && npm run start
# Terminal 2 — expose it (OpenAI must reach your server)
npx ngrok http 3000
# Terminal 3 — run the demo
cd apps/sample-mcp
OPENAI_API_KEY=sk-... MCP_SERVER_URL=https://<your-ngrok-id>.ngrok.io/mcp node agent-demo.js
The one thing to wire up for real Telegram integration: extract ctx.from.id as the telegramId and call handleMessage() per message, storing the session across bot turns.
 */

import { clearSession, handleMessage } from './agent.js';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp';

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
