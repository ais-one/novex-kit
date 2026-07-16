import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { vector } from './vector.ts';

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  s3Key: text('s3_key'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chunks = pgTable('chunks', {
  id: serial('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: vector('embedding'),
  chunkIndex: integer('chunk_index'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, { fields: [chunks.documentId], references: [documents.id] }),
}));
