import type { Knex } from 'knex';
import type { NewOrder, Order, OrderItem } from '../../dto/order.dto.ts';

// This app's persistence shape — PostgreSQL only, always, queried via Knex's query builder
// rather than an ORM. Column names are snake_case here and nowhere else — every exported
// function maps to/from the domain `Order` (camelCase) before it crosses this file's boundary.
// Every function takes a `Knex` (or `Knex.Transaction`) rather than calling `getDb()` itself,
// so a caller can route it through `req.dbTransaction()` — see
// docs/design/pg-audit-implementation.md §6 and @apps/sample-common/express/audit/audit-context.

type OrderRow = {
  id: number;
  customer_email: string;
  items: OrderItem[];
  total_cents: number;
  total_eur_cents: number | null;
  internal_risk_score: number;
  created_at: Date;
};

// `pg` (knex's driver) formats a bare JS array as a Postgres ARRAY literal, not JSON, so the
// insert value must be pre-serialized to land correctly in the jsonb `items` column — the
// bound value's static type is `string`, even though `OrderRow.items` (what a `SELECT` gives
// back, via `pg`'s default jsonb type parser) is the parsed array.
type OrderInsertRow = Omit<OrderRow, 'id' | 'items'> & { items: string };

const toDomain = (row: OrderRow): Order => ({
  id: row.id,
  customerEmail: row.customer_email,
  items: row.items,
  totalCents: row.total_cents,
  totalEurCents: row.total_eur_cents,
  internalRiskScore: row.internal_risk_score,
  createdAt: row.created_at.toISOString(),
});

/** Inserts a new order and returns it with the id Postgres assigned. */
export const insertOrder = async (db: Knex, order: NewOrder): Promise<Order> => {
  const [row] = await db<OrderInsertRow>('orders')
    .insert({
      customer_email: order.customerEmail,
      items: JSON.stringify(order.items),
      total_cents: order.totalCents,
      total_eur_cents: order.totalEurCents,
      internal_risk_score: order.internalRiskScore,
      created_at: new Date(order.createdAt),
    })
    .returning('*');
  // `returning('*')` is typed off `OrderInsertRow` (items: string), but Postgres actually hands
  // back the jsonb column already parsed by `pg`'s default type parser — the real runtime shape
  // is `OrderRow`, matching what a plain SELECT returns.
  return toDomain(row as unknown as OrderRow);
};

/** Finds an order by id, or `null` if it doesn't exist — never throws for a missing row. */
export const findOrderById = async (db: Knex, id: number): Promise<Order | null> => {
  const row = await db<OrderRow>('orders').where({ id }).first();
  return row ? toDomain(row) : null;
};
