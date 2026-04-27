import { z } from 'zod';

// --- Mock data — replace with real DB queries keyed by telegram_id ---
const USER_REPORTS = {
  tg_123: [1, 2, 5, 7],
  tg_456: [2, 3, 7],
};

export default function initTools(server, initialHeaders) {
  server.tool('add', 'Add two numbers', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }],
  }));

  server.registerTool(
    'echo',
    {
      title: 'Echo Tool',
      description: 'Echoes back the provided message',
      inputSchema: {
        message: z.string(),
      },
      required: ['message'],
    },
    async ({ message }) => ({
      content: [{ type: 'text', text: `Tool echo: ${message}` }],
    }),
  );

  // --- Register a "calculate-bmi" tool ---
  // The client can call this tool via "mcp/callTool" method once initialized.
  server.registerTool(
    'calculate-bmi',
    {
      title: 'BMI Calculator',
      description: 'Calculate Body Mass Index',
      inputSchema: {
        weightKg: z.number(),
        heightM: z.number(),
      },
      required: ['weightKg', 'heightM'],
    },
    async ({ weightKg, heightM }) => {
      //   // Read token from initialization time
      const authHeader = initialHeaders.authorization || null;
      if (!authHeader) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Error: missing Authorization header',
            },
          ],
        };
      }
      const bmi = weightKg / (heightM * heightM);
      // console.log('bmi done - ', bmi)
      return {
        content: [
          {
            type: 'text',
            text: `BMI for ${heightM}m and ${weightKg}kg = ${bmi.toFixed(2)}`,
            // ${authHeader.slice(0,10)}
          },
        ],
      };
    },
  );

  // --- Report tools ---

  server.registerTool(
    'get_available_reports',
    {
      title: 'Get Available Reports',
      description: 'Returns the list of report IDs available for a given Telegram user ID',
      inputSchema: { telegram_id: z.string() },
    },
    async ({ telegram_id }) => {
      const reports = USER_REPORTS[telegram_id] ?? [];
      if (reports.length === 0) {
        return {
          isError: true,
          content: [{ type: 'text', text: `No reports found for telegram_id: ${telegram_id}` }],
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ telegram_id, available_reports: reports }) }],
      };
    },
  );

  server.registerTool(
    'generate_reports',
    {
      title: 'Generate Reports',
      description: 'Validates the selected report IDs and date range for the user, then generates the reports',
      inputSchema: {
        telegram_id: z.string(),
        report_ids: z.array(z.number()),
        start_date: z.string().date(),
        end_date: z.string().date(),
      },
    },
    async ({ telegram_id, report_ids, start_date, end_date }) => {
      const allowed = USER_REPORTS[telegram_id] ?? [];
      const invalid = report_ids.filter(id => !allowed.includes(id));
      if (invalid.length) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Reports not available for your account: ${invalid.join(', ')}` }],
        };
      }

      if (new Date(start_date) > new Date(end_date)) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'start_date must not be after end_date.' }],
        };
      }

      // Replace with real report engine — returns file URLs or base64 payloads
      const files = report_ids.map(id => ({
        report_id: id,
        filename: `report_${id}_${start_date}_${end_date}.pdf`,
        url: `https://reports.example.com/${telegram_id}/report_${id}.pdf`,
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, files }) }],
      };
    },
  );

  // --- Register a "days-to-due-date" tool ---
  server.registerTool(
    'days-to-due-date',
    {
      title: 'Get days to due date or past due',
      description: 'Calulate days to due date, negative value means past due',
      inputSchema: {
        calcDate: z.string().date(),
        dueDate: z.string().date(),
      },
      outputSchema: {
        diffDays: z.number(),
      },
      required: ['calcDate', 'dueDate'],
    },
    async ({ calcDate, dueDate }) => {
      // Create Date objects representing the two dates
      const calcDateObj = new Date(calcDate);
      const dueDateObj = new Date(dueDate);

      // Calculate the difference in milliseconds between the two dates
      const diffInMs = dueDateObj.getTime() - calcDateObj.getTime();
      const diffInDays = Math.floor(diffInMs / 86400000); // 86400000 = ms in a day (1000 * 60 * 60 * 24)

      // console.log('due date done - ', diffInDays)
      return {
        content: [
          {
            type: 'text',
            text: `Days to due date = ${diffInDays}`,
          },
        ],
        structuredContent: {
          diffDays: diffInDays,
        },
      };
    },
  );
}
