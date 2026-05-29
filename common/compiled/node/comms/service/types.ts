// Unified comms service — shared types

import type { CommsChannel } from '../tenant/types.ts';

// ─── Send ─────────────────────────────────────────────────────────────────────

/** Request shape for the unified send() function */
export interface SendRequest {
  tenantId: number;
  configLabel?: string;
  channel: CommsChannel;
  to: string;
  type: string;
  payload: Record<string, any>;
}

/** Normalized result from any channel send */
export interface SendResult {
  success: boolean;
  channel: CommsChannel;
  messageId?: string;
  error?: string;
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

/** Request shape for broadcast() */
export interface BroadcastRequest {
  tenantId: number;
  configLabel?: string;
  channel: CommsChannel;
  recipients: string[];
  type: string;
  payload: Record<string, any>;
  options?: BroadcastOptions;
}

export interface BroadcastOptions {
  /** Sequential sends one-by-one with optional delay. Concurrent sends in batches. Default: 'sequential'. */
  mode?: 'sequential' | 'concurrent';
  /** Delay in ms between sends in sequential mode. Default: 0. */
  delayMs?: number;
  /** Max parallel sends in concurrent mode. Default: 5. */
  concurrency?: number;
}

/** Result from broadcast — per-recipient status */
export interface BroadcastResult {
  success: boolean;
  channel: CommsChannel;
  total: number;
  sent: number;
  failed: number;
  results: BroadcastRecipientResult[];
}

export interface BroadcastRecipientResult {
  to: string;
  success: boolean;
  messageId?: string;
  error?: string;
}
