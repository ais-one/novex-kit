// ─────────────────────────────────────────────────────────────────────────────
// Sidecar — created once, then YOURS. Will NOT be overwritten by generate:crud.
// Extend or override the generated code below as needed.
// ─────────────────────────────────────────────────────────────────────────────
// Re-export the generated controller as the default — override methods below.
export { _injectServices, default } from './generated/controller.ts';

// Example: override specific methods
// import generatedController from './generated/controller.ts';
// import type { Request, Response } from 'express';
//
// export default {
//   ...generatedController,
//   create: async (req: Request, res: Response) => {
//     // custom create logic for categories
//   },
// };
