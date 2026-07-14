// ─────────────────────────────────────────────────────────────────────────────
// Sidecar — created once, then YOURS. Will NOT be overwritten by generate:crud.
// Extend or override the generated code below as needed.
// ─────────────────────────────────────────────────────────────────────────────
// Re-export everything from generated — add custom schemas below.
export * from './generated/schema.js';

// Example: add a custom search schema
// import { z } from 'zod';
// export const PermissionsSearchSchema = z.object({ q: z.string().min(1) }).meta({ id: 'PermissionsSearch' });
