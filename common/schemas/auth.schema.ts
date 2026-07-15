// shared/schemas/auth.schema.ts
// Single source of truth for auth-service shapes.
// Drives: runtime validation (validate middleware) + OpenAPI spec generation.
// Zod v4 — uses native .meta() for OpenAPI metadata. No monkey-patching required.

import { z } from 'zod';

// ── Request bodies ─────────────────────────────────────────────────────────

export const RegisterBodySchema = z
  .object({
    email: z.email().meta({ example: 'user@example.com' }),
    password: z.string().min(8).meta({ example: 'securepassword' }),
  })
  .meta({ id: 'RegisterBody' });

export const LoginBodySchema = z
  .object({
    email: z.email().meta({ example: 'user@example.com' }),
    password: z.string().min(1).meta({ example: 'securepassword' }),
  })
  .meta({ id: 'LoginBody' });

// ── Response schemas ───────────────────────────────────────────────────────

export const TokenResponseSchema = z
  .object({
    token: z.string().meta({
      description: 'JWT — expires in 1 hour',
      example: 'eyJhbGciOiJIUzI1NiJ9...',
    }),
  })
  .meta({ id: 'TokenResponse' });

export const MessageResponseSchema = z
  .object({
    message: z.string().meta({ example: 'Operation completed successfully' }),
  })
  .meta({ id: 'MessageResponse' });
