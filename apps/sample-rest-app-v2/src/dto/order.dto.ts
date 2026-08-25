import { z } from 'zod';

// ─── Request DTOs — validated by the controller before the service ever sees them ─────────

export const orderItemInputSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});

export const createOrderBodySchema = z.object({
  customerEmail: z.email(),
  items: z.array(orderItemInputSchema).min(1),
});

export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

export const orderIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ─── Domain model — what the service and repositories operate on ──────────────────────────
// Independent of the sqlite row's column names and of the exchange-rate provider's response
// shape. `internalRiskScore` is a real example of why the response DTO below isn't just the
// domain model re-exported: it's a fact the service computes and the repository persists, but
// it must never reach a client.

export type OrderItem = z.infer<typeof orderItemInputSchema>;

export type Order = {
  id: number;
  customerEmail: string;
  items: OrderItem[];
  totalCents: number;
  totalEurCents: number | null; // null if the exchange-rate enrichment failed — not fatal
  internalRiskScore: number;
  createdAt: string;
};

export type NewOrder = Omit<Order, 'id'>;

// ─── Response DTO — what a controller actually sends back, always as `{ message, data }` ──

export const orderResponseDataSchema = z.object({
  id: z.number(),
  customerEmail: z.email(),
  items: z.array(orderItemInputSchema),
  totalCents: z.number(),
  totalEurCents: z.number().nullable(),
  createdAt: z.iso.datetime(),
});

export type OrderResponseData = z.infer<typeof orderResponseDataSchema>;

/** Maps the domain model to the response shape — this is where `internalRiskScore` gets dropped. */
export const toOrderResponseData = (order: Order): OrderResponseData => ({
  id: order.id,
  customerEmail: order.customerEmail,
  items: order.items,
  totalCents: order.totalCents,
  totalEurCents: order.totalEurCents,
  createdAt: order.createdAt,
});
