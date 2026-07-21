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
        position: { x: 560, y: 100 },
        data: {
          input: {
            label: 'general-info',
            description: 'Answer questions from knowledge base',
            systemPrompt:
              "Search the knowledge base for Minerva Inc. information. Answer the user's question about the company, products, YouTube channel, team, or anything company-related. Be friendly and helpful.",
            assignedTools: ['rag_search', 'rag_list_documents'],
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // REFUND POLICY FLOW — just explain policy, no refund process
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'n30',
        type: 'tool-agent',
        position: { x: 560, y: 220 },
        data: {
          input: {
            label: 'refund-policy-info',
            description: 'Explain refund policy from KB',
            systemPrompt:
              'Search the knowledge base for the refund policy. Explain clearly: refunds are 80% of original price, 14 day window for standard products, 7 days for customized. Show examples (Jacket Bomber $80→$64, Custom Cup $5→$4). Mention the refund process steps. Do NOT start a refund — just provide information.',
            assignedTools: ['rag_search', 'rag_list_documents'],
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // REFUND FLOW — actual refund process
      // ═══════════════════════════════════════════════════════════════════
      // Step 1: Parse user request, search KB, ask for missing info
      {
        id: 'n9',
        type: 'tool-agent',
        position: { x: 560, y: 340 },
        data: {
          input: {
            label: 'refund-start',
            description: 'Start refund: explain policy, ask for details',
            systemPrompt: `You are a Minerva Inc. refund specialist. The user wants to start a refund.

First, search the KB with rag_search for the refund policy.

Then analyze the user's message. They may have already provided product name, order number, and reason. If all info is present:
- Show the refund calculation (80% of price)
- Ask them to confirm by saying "yes"
- Example: "You mentioned Jacket Bomber ($80). Refund is $64 (80%). Confirm?"

If some info is missing, ask for ONLY what's missing:
- Missing product: "What product are you refunding? (Jacket Bomber $80, Custom Cup $5, T-Shirt $25, Hoodie $55, Cap $18, Stickers $3)"
- Missing order: "What is your order number? (format: MNV-YYYYMMDD-XXXX)"
- Missing reason: "What is the reason for the refund?"

If the user says "cancel", "stop", "never mind", or similar — tell them the refund is cancelled and they can start over anytime.

Be concise. Don't repeat information the user already provided.`,
            assignedTools: ['rag_search', 'rag_list_documents'],
          },
        },
      },
      // Step 2: Confirm refund, ask for contact info
      {
        id: 'n11',
        type: 'tool-agent',
        position: { x: 820, y: 340 },
        data: {
          input: {
            label: 'refund-confirm',
            description: 'Calculate refund, get contact info',
            systemPrompt: `The customer wants to confirm their refund. From the conversation history:

1. Find the product and calculate the refund (80%).
   Products: Jacket Bomber $80→$64, Custom Cup $5→$4, T-Shirt $25→$20, Hoodie $55→$44, Cap $18→$14.40, Stickers $3→$2.40
   If product not listed, estimate and say "approximately".

2. If the user provided name, email, phone in their message — thank them and call generate_refund_pdf.
   If NOT — ask: "To proceed, please provide your full name, email, and phone number."

3. If the user says "cancel", "stop", "never mind" — cancel politely.

Be concise. Use conversation history to avoid repeating.`,
            assignedTools: ['rag_search', 'generate_refund_pdf'],
          },
        },
      },
      // Step 3: Generate PDF + send
      {
        id: 'n13',
        type: 'tool-agent',
        position: { x: 1080, y: 340 },
        data: {
          input: {
            label: 'refund-pdf',
            description: 'Generate and confirm refund PDF',
            systemPrompt:
              'The user provided all details. From the conversation history, extract: customer_name, customer_email, customer_phone, order_number, product_name, product_price, refund_reason. Call generate_refund_pdf. After generating, tell the user the PDF will be sent.',
            assignedTools: ['generate_refund_pdf'],
          },
        },
      },
      {
        id: 'n14',
        type: 'send-attachment',
        position: { x: 1340, y: 340 },
        data: {
          input: {
            label: 'send-pdf',
            description: 'Send refund PDF to user',
            filePathVar: 'filePath',
            caption: '📄 Minerva Inc. — Refund Confirmation',
          },
        },
      },
      {
        id: 'n15',
        type: 'text',
        position: { x: 1600, y: 340 },
        data: {
          input: {
            label: 'refund-done',
            description: 'Confirm refund submitted',
            message:
              '✅ Your refund has been submitted!\n\n📋 PDF sent above.\n💰 Refund processed in 5–7 business days.\n\nThank you for being a Minerva Inc. customer!',
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // NEW LEAD FLOW
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'n5',
        type: 'text',
        position: { x: 560, y: 460 },
        data: {
          input: {
            label: 'ask-name',
            description: 'Ask for full name',
            message: "Great! We'd love to have you join Minerva Inc.! 🎮\n\nFirst, what is your full name?",
            captureData: true,
            stored_to: 'customer_name',
          },
        },
      },
      {
        id: 'n6',
        type: 'text',
        position: { x: 820, y: 460 },
        data: {
          input: {
            label: 'ask-email',
            description: 'Ask for email address',
            message: 'Thanks, {customer_name}! What is your email address?',
            captureData: true,
            stored_to: 'customer_email',
          },
        },
      },
      {
        id: 'n7',
        type: 'text',
        position: { x: 1080, y: 460 },
        data: {
          input: {
            label: 'ask-phone',
            description: 'Ask for phone number',
            message: 'Almost done! What is your phone number?',
            captureData: true,
            stored_to: 'customer_phone',
          },
        },
      },
      {
        id: 'n8',
        type: 'tool-agent',
        position: { x: 1340, y: 460 },
        data: {
          input: {
            label: 'confirm-lead',
            description: 'Confirm registration details',
            systemPrompt:
              'Extract name, email, phone from conversation history. Confirm details and thank them for registering with Minerva Inc. Tell them about new videos and merchandise updates.',
            assignedTools: ['rag_search'],
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // WEATHER FLOW
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'n20',
        type: 'tool-agent',
        position: { x: 560, y: 580 },
        data: {
          input: {
            label: 'weather',
            description: 'Answer weather questions',
            systemPrompt:
              'You are a friendly weather assistant. Use the weather tools to answer weather questions. Be concise.',
            assignedTools: ['openweather_get_weather', 'openweather_get_forecast'],
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // LISTEN TRIGGER — terminal, NO outgoing edges
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'n21',
        type: 'listen-trigger',
        position: { x: 1900, y: 340 },
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

      // General → listen
      { source: 'n3', target: 'n21' },

      // Refund policy → listen
      { source: 'n30', target: 'n21' },

      // Refund process: n9→n11→n13→n14→n15→listen
      { source: 'n9', target: 'n11' },
      { source: 'n11', target: 'n13' },
      { source: 'n13', target: 'n14' },
      { source: 'n14', target: 'n15' },
      { source: 'n15', target: 'n21' },

      // New lead: n5→n6→n7→n8→listen
      { source: 'n5', target: 'n6' },
      { source: 'n6', target: 'n7' },
      { source: 'n7', target: 'n8' },
      { source: 'n8', target: 'n21' },

      // Weather → listen
      { source: 'n20', target: 'n21' },
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
