import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a report assistant for a Telegram bot. Follow this exact three-step flow and do not deviate.

STEP 1 — On the user's first message:
- The user's telegram_id is embedded in the message as [telegram_id: <id>].
- Immediately call get_available_reports with that telegram_id.
- Present the returned report IDs and ask which ones the user wants.

STEP 2 — When the user selects reports:
- Parse the selected report IDs (numbers only).
- Verify every selected ID is in the available list from Step 1.
- If any are not available, tell the user and ask them to choose again.
- Once the selection is valid, ask: "What start and end date do you require? (e.g. 2025-11-01 to 2026-03-12)"

STEP 3 — When the user provides dates:
- Normalise both dates to ISO 8601 (YYYY-MM-DD). Example: "12 Mar 2026" → "2026-03-12".
- If a date cannot be parsed, ask the user to clarify only that date.
- Call generate_reports with: telegram_id, validated report_ids, start_date, end_date.
- On tool error: relay the error message and ask the user to correct their input.
- On success: respond exactly "I have attached your report(s) to this reply. Thank you." and list the filenames or URLs from the tool result.

Rules:
- Never ask the user for their telegram_id — it is always available in the conversation context.
- Never advance to the next step until the current step's inputs are confirmed valid.
- Keep all replies concise and professional.`;

/**
 * In-memory session store: telegram_id → last OpenAI response ID.
 * Replace with Redis (with TTL) for production.
 * @type {Map<string, string>}
 */
const sessions = new Map();

/**
 * Handle one message turn for a Telegram user.
 *
 * @param {{ telegramId: string, userText: string, mcpServerUrl: string }} opts
 * @returns {Promise<string>} the bot reply
 */
export async function handleMessage({ telegramId, userText, mcpServerUrl }) {
  const previousResponseId = sessions.get(telegramId);

  // Embed telegram_id in the first message so the model can pass it to tools.
  const input = previousResponseId ? userText : `[telegram_id: ${telegramId}]\n${userText}`;

  const params = {
    model: 'gpt-4.1',
    instructions: SYSTEM_PROMPT,
    input,
    tools: [
      {
        type: 'mcp',
        server_label: 'report-server',
        server_url: mcpServerUrl,
        require_approval: 'never',
      },
    ],
    store: true,
  };

  if (previousResponseId) {
    params.previous_response_id = previousResponseId;
  }

  const response = await client.responses.create(params);

  sessions.set(telegramId, response.id);
  return response.output_text;
}

/**
 * Clear a user's session (call after the conversation completes or times out).
 *
 * @param {string} telegramId
 */
export function clearSession(telegramId) {
  sessions.delete(telegramId);
}
