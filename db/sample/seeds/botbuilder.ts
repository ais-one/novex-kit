import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { botbuilderGraphs, botbuilderMessages, botbuilderSessions } from '../schema.ts';

// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
export async function seed(db: NodePgDatabase<any>): Promise<void> {
  const defaultGraph = {
    name: 'Minerva Inc. Customer Service Bot',
    description: 'Customer service bot — company info, refund policy, refund process, new lead capture, weather.',
    nodes: [
      // ── Entry + Router ──────────────────────────────────────────────────
      {
        id: 'n1',
        type: 'trigger',
        position: { x: 40, y: 340 },
        data: { input: { label: 'entry', description: 'Bot entry point' } },
      },
      {
        id: 'n2',
        type: 'router-agent',
        position: { x: 260, y: 340 },
        data: {
          input: {
            label: 'classify',
            description: 'Classify user intent',
            systemPrompt: `Classify the user message into exactly one category:
- "general": Company info, products, YouTube, team, casual chat
- "refund-policy": Asking about refund policy, returns, how refunds work (just information, NOT requesting a refund)
- "refund": Actually requesting a refund, starting the refund process, returning a product
- "new-lead": Registration, sign up, join, subscribe, leave contact info
- "weather": Weather, temperature, forecast`,
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // GENERAL FLOW — KB search for company info
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'n3',
        type: 'tool-agent',
        position: { x: 560, y: 40 },
        data: {
          input: {
            label: 'general-info',
            description: 'Answer questions from knowledge base',
            stored_to: 'last_message',
            systemPrompt:
              "Search the knowledge base for Minerva Inc. information. Answer the user's question about the company, products, YouTube channel, team, or anything company-related. Be friendly and helpful.",
            assignedTools: ['rag_search', 'rag_list_documents'],
          },
        },
      },
      {
        id: 'n3-tx',
        type: 'text',
        position: { x: 820, y: 40 },
        data: {
          input: {
            label: 'send-general',
            description: 'Send general info response',
            message: '{last_message}',
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // REFUND POLICY FLOW — just explain policy, no refund process
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'n30',
        type: 'tool-agent',
        position: { x: 560, y: 160 },
        data: {
          input: {
            label: 'refund-policy-info',
            description: 'Explain refund policy from KB',
            stored_to: 'last_message',
            systemPrompt:
              'Search the knowledge base for the refund policy. Explain clearly: refunds are 80% of original price, 14 day window for standard products, 7 days for customized. Show examples (Jacket Bomber $80→$64, Custom Cup $5→$4). Mention the refund process steps. Do NOT start a refund — just provide information.',
            assignedTools: ['rag_search', 'rag_list_documents'],
          },
        },
      },
      {
        id: 'n30-tx',
        type: 'text',
        position: { x: 820, y: 160 },
        data: {
          input: {
            label: 'send-refund-policy',
            description: 'Send refund policy response',
            message: '{last_message}',
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // REFUND FLOW — multi-step: ask → capture → extract → check → PDF
      // ═══════════════════════════════════════════════════════════════════
      // Step 1: AI asks the user for their data
      {
        id: 'n9',
        type: 'tool-agent',
        position: { x: 560, y: 280 },
        data: {
          input: {
            label: 'ask-refund-data',
            description: 'Ask user for name, email, phone, product',
            stored_to: 'refund_msg',
            assignedTools: ['rag_search'],
            systemPrompt: `You are a Minerva Inc. refund specialist. Ask the user for the information needed to process a refund.

Required info: full name, email address, phone number, and which product they want to refund.

Products: Jacket Bomber ($80), Custom Cup ($5), T-Shirt ($25), Hoodie ($55), Cap ($18), Stickers ($3).

Check the conversation history. If the user already provided some info, do NOT ask for it again. Only ask for what's missing.

If everything is already provided, confirm the details and say the refund is being processed.

Be friendly and concise.`,
          },
        },
      },
      {
        id: 'n9-tx',
        type: 'text',
        position: { x: 820, y: 280 },
        data: {
          input: {
            label: 'send-and-capture',
            description: 'Send AI question, then capture user reply',
            message: '{refund_msg}',
            captureData: true,
            stored_to: 'last_message',
          },
        },
      },
      // Step 2: Extract structured data from user's reply
      {
        id: 'n9-extract',
        type: 'tool-agent',
        position: { x: 1340, y: 280 },
        data: {
          input: {
            label: 'extract-refund-data',
            description: 'Extract name, email, phone, product from reply',
            multipleVariables: true,
            stored_to: 'refund_name, refund_email, refund_phone, refund_product',
            assignedTools: [],
            systemPrompt: `Extract the user's refund information from their message and the conversation history.

Required fields:
- refund_name: full name
- refund_email: email address
- refund_phone: phone number
- refund_product: which product they want to refund (exact product name from: Jacket Bomber, Custom Cup, T-Shirt, Hoodie, Cap, Stickers)

Check the FULL conversation history for previously provided information. Do NOT overwrite previously stored values with empty strings.

If a field is not yet provided, use an empty string for that key.

Respond with ONLY a JSON object using these exact keys: refund_name, refund_email, refund_phone, refund_product. No other text.`,
          },
        },
      },
      // Step 4: Check if all required fields exist
      {
        id: 'n9-check',
        type: 'conditional',
        position: { x: 1600, y: 280 },
        data: {
          input: {
            label: 'check-all-fields',
            description: 'Check if all refund data is present',
            conditionals: [
              {
                variable: 'refund_name',
                operator: 'is not empty',
                matches: null,
                and: [
                  { variable: 'refund_email', operator: 'is not empty', matches: null },
                  { variable: 'refund_phone', operator: 'is not empty', matches: null },
                  { variable: 'refund_product', operator: 'is not empty', matches: null },
                ],
              },
            ],
          },
        },
      },
      // Step 5: Generate PDF
      {
        id: 'n9-pdf',
        type: 'tool-agent',
        position: { x: 1860, y: 280 },
        data: {
          input: {
            label: 'generate-refund-pdf',
            description: 'Generate the refund PDF document',
            stored_to: 'refund_msg',
            assignedTools: ['generate_refund_pdf'],
            toolOutputMapping: {
              generate_refund_pdf: {
                pdf_path: 'refund_pdf_path',
                refund_amount: 'refund_amount',
              },
            },
            systemPrompt: `Generate a refund PDF for the customer.

Use the following data from the conversation:
- Name, email, phone: from the conversation history
- Product: from the conversation history
- Order number: use format MNV-YYYYMMDD-XXXX (generate based on today's date if not provided)
- Refund reason: from the conversation history, or use "Customer request" if not stated
- Product price: Jacket Bomber $80, Custom Cup $5, T-Shirt $25, Hoodie $55, Cap $18, Stickers $3

Call generate_refund_pdf with the extracted values. After the tool returns, confirm to the user that the refund is being processed.`,
          },
        },
      },
      // Step 6: Send the PDF file
      {
        id: 'n9-att',
        type: 'send-attachment',
        position: { x: 2120, y: 280 },
        data: {
          input: {
            label: 'send-pdf-file',
            description: 'Send refund PDF to user',
            filePathVar: 'refund_pdf_path',
            caption: '\u{1F4C4} Minerva Inc. \u2014 Refund Confirmation',
          },
        },
      },
      // Step 7: Confirmation message
      {
        id: 'n9-done',
        type: 'text',
        position: { x: 2380, y: 280 },
        data: {
          input: {
            label: 'refund-done',
            description: 'Confirm refund submitted',
            message:
              '\u2705 Your refund has been submitted!\n\n\u{1F4CB} PDF sent above.\n\u{1F4B0} Refund processed in 5\u20137 business days.\n\nThank you for being a Minerva Inc. customer!',
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // NEW LEAD FLOW — single AI extracts all contact info via JSON
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'n5',
        type: 'tool-agent',
        position: { x: 560, y: 480 },
        data: {
          input: {
            label: 'capture-lead',
            description: 'Extract name, email, phone from user message',
            multipleVariables: true,
            stored_to: 'customer_name, customer_email, customer_phone, welcome_message',
            systemPrompt: `You are Minerva Inc.'s registration assistant. Extract the user's contact info from their message.

Check the FULL conversation history for previously provided information.

If name/email/phone are ALL present (from this message or previous ones):
- Put each in its JSON field: customer_name, customer_email, customer_phone
- Put a friendly welcome in welcome_message: "Thanks {name}! You're now registered with Minerva Inc. We'll send updates about new videos and merchandise to {email}."

If any field is STILL missing, ask for ONLY what's missing:
- Put empty strings for fields you don't have yet
- Put your question in welcome_message

IMPORTANT: Do NOT overwrite previously stored values with empty strings. If you already have customer_name from a previous message but don't have customer_email yet, set customer_name to the stored value and ask for customer_email.

Respond with ONLY a JSON object using these keys: customer_name, customer_email, customer_phone, welcome_message. No other text.`,
            assignedTools: [],
          },
        },
      },
      {
        id: 'n5-tx',
        type: 'text',
        position: { x: 820, y: 480 },
        data: {
          input: {
            label: 'send-lead-response',
            description: 'Send welcome message or question',
            message: '{welcome_message}',
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // WEATHER FLOW
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'n20',
        type: 'tool-agent',
        position: { x: 560, y: 600 },
        data: {
          input: {
            label: 'weather',
            description: 'Answer weather questions',
            stored_to: 'last_message',
            systemPrompt:
              'You are a friendly weather assistant. Use the weather tools to answer weather questions. Be concise.',
            assignedTools: ['openweather_get_weather', 'openweather_get_forecast'],
          },
        },
      },
      {
        id: 'n20-tx',
        type: 'text',
        position: { x: 820, y: 600 },
        data: {
          input: {
            label: 'send-weather',
            description: 'Send weather response',
            message: '{last_message}',
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // TERMINAL LISTEN TRIGGER (NO outgoing edges)
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'n21',
        type: 'listen-trigger',
        position: { x: 2640, y: 340 },
        data: { input: { label: 'wait-next', description: 'Wait for next user message' } },
      },
    ],

    edges: [
      // Entry → Router
      { source: 'n1', target: 'n2' },
      { source: 'n2', target: 'n3', label: 'general' },
      { source: 'n2', target: 'n30', label: 'refund-policy' },
      { source: 'n2', target: 'n9', label: 'refund' },
      { source: 'n2', target: 'n5', label: 'new-lead' },
      { source: 'n2', target: 'n20', label: 'weather' },
      { source: 'n2', target: 'n3', label: 'fallback' },

      // General: AI → text → listen
      { source: 'n3', target: 'n3-tx' },
      { source: 'n3-tx', target: 'n21' },

      // Refund policy: AI → text → listen
      { source: 'n30', target: 'n30-tx' },
      { source: 'n30-tx', target: 'n21' },

      // Refund: ask → send+capture → extract → check → (all: PDF → attach → done) or (missing: back to ask)
      { source: 'n9', target: 'n9-tx' },
      { source: 'n9-tx', target: 'n9-extract' },
      { source: 'n9-extract', target: 'n9-check' },
      { source: 'n9-check', target: 'n9-pdf', label: 'source-if-0' },
      { source: 'n9-check', target: 'n9', label: 'source-else' },
      { source: 'n9-pdf', target: 'n9-att' },
      { source: 'n9-att', target: 'n9-done' },
      { source: 'n9-done', target: 'n21' },

      // New lead: AI extract → text → listen
      { source: 'n5', target: 'n5-tx' },
      { source: 'n5-tx', target: 'n21' },

      // Weather: AI → text → listen
      { source: 'n20', target: 'n20-tx' },
      { source: 'n20-tx', target: 'n21' },
    ],
  };

  try {
    await db.delete(botbuilderMessages);
  } catch {
    /* may not exist */
  }
  try {
    await db.delete(botbuilderSessions);
  } catch {
    /* may not exist */
  }
  try {
    await db.delete(botbuilderGraphs);
  } catch {
    /* may not exist */
  }

  await db.insert(botbuilderGraphs).values({
    userId: 'default',
    name: 'Minerva Inc. Customer Service Bot',
    description: 'Customer service bot — company info, refund policy, refund process, new lead capture, weather.',
    flow: defaultGraph,
    status: 'published',
  });
}
