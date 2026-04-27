import { z } from 'zod';

export default function initPrompts(server) {
  server.prompt('review-code', { code: z.string() }, ({ code }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please review this code:\n\n${code}`,
          },
        },
      ],
    };
  });
}
