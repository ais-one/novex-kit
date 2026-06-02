// Unified comms service — shared types

import type { SendEmailOpts, SgAttachment } from '../sendgrid/types.ts';
import type { ContactData, TelegramMessageOpts, VenueData } from '../telegram2/types.ts';
import type { CommsChannel } from '../tenant/types.ts';
import type {
  WaAddressRequestOpts,
  WaButtonsOpts,
  WaContact,
  WaCtaUrlOpts,
  WaDocumentOpts,
  WaFlowOpts,
  WaListOpts,
  WaLocation,
  WaMediaInput,
  WaMediaOpts,
  WaMessageOpts,
  WaTemplateOpts,
  WaTextOpts,
} from '../whatsapp2/types.ts';

// ─── Telegram payload shapes ──────────────────────────────────────────────────

export interface TgTextPayload {
  /** The message text. Supports HTML/Markdown if opts.parse_mode is set. */
  text: string;
  /** Telegram message options (parse_mode, reply_markup, disable_notification, etc.) */
  opts?: TelegramMessageOpts;
}

export interface TgPhotoPayload {
  /** Photo to send: HTTPS URL, local file path, or Telegram file_id. */
  photo: string;
  opts?: TelegramMessageOpts;
}

export interface TgVideoPayload {
  /** Video to send: HTTPS URL, local file path, or Telegram file_id. */
  video: string;
  opts?: TelegramMessageOpts;
}

export interface TgAudioPayload {
  /** Audio track to send: HTTPS URL, local file path, or Telegram file_id. */
  audio: string;
  opts?: TelegramMessageOpts;
}

export interface TgDocumentPayload {
  /** Document/file to send: HTTPS URL, local file path, or Telegram file_id. */
  document: string;
  opts?: TelegramMessageOpts;
}

export interface TgVoicePayload {
  /** OGG/OPUS voice message: HTTPS URL, local file path, or Telegram file_id. */
  voice: string;
  opts?: TelegramMessageOpts;
}

export interface TgVideoNotePayload {
  /** Round video (1:1 aspect ratio): HTTPS URL, local file path, or Telegram file_id. */
  video_note: string;
  opts?: TelegramMessageOpts;
}

export interface TgStickerPayload {
  /** Sticker (WEBP/TGS/WEBM): HTTPS URL, local file path, or Telegram file_id. */
  sticker: string;
  opts?: TelegramMessageOpts;
}

export interface TgAnimationPayload {
  /** GIF or MP4 animation: HTTPS URL, local file path, or Telegram file_id. */
  animation: string;
  opts?: TelegramMessageOpts;
}

export interface TgLocationPayload {
  /** Latitude coordinate. */
  latitude: number;
  /** Longitude coordinate. */
  longitude: number;
  /** Telegram message options (live_period, heading, proximity_alert_radius, etc.) */
  opts?: TelegramMessageOpts;
}

export interface TgVenuePayload {
  /** Venue data: latitude, longitude, title, address, and optional place IDs. */
  venue: VenueData;
  opts?: TelegramMessageOpts;
}

export interface TgContactPayload {
  /** Contact card: phone_number, first_name, last_name, vcard. */
  contact: ContactData;
  opts?: TelegramMessageOpts;
}

export interface TgPollPayload {
  /** Poll question text (1-300 characters). */
  question: string;
  /** Answer options (2-10 strings, each 1-100 characters). */
  options: string[];
  /** Poll options (type, is_anonymous, correct_option_id, explanation, etc.) */
  opts?: TelegramMessageOpts;
}

export interface TgDicePayload {
  /** Dice emoji. One of: 🎲 🎯 🏀 ⚽ 🎳 🎰. Default: 🎲 */
  emoji?: string;
  opts?: TelegramMessageOpts;
}

// ─── WhatsApp payload shapes ──────────────────────────────────────────────────

export interface WaTextPayload {
  /** The message text body. */
  text: string;
  /** Text options: preview_url, replyTo. */
  opts?: WaTextOpts;
}

export interface WaImagePayload {
  /** Media source: { id: "<media_id>" } or { link: "https://..." }. */
  media: WaMediaInput;
  /** Optional caption shown below the image. */
  caption?: string;
  /** Media options: replyTo. */
  opts?: WaMediaOpts;
}

export interface WaAudioPayload {
  /** Media source: { id: "<media_id>" } or { link: "https://..." }. */
  media: WaMediaInput;
  /** Audio options: replyTo. Note: captions are NOT supported for audio. */
  opts?: WaMessageOpts;
}

export interface WaVideoPayload {
  /** Media source: { id: "<media_id>" } or { link: "https://..." }. */
  media: WaMediaInput;
  /** Optional caption shown below the video. */
  caption?: string;
  /** Media options: replyTo. */
  opts?: WaMediaOpts;
}

export interface WaStickerPayload {
  /** Media source: { id: "<media_id>" } or { link: "https://..." }. WEBP only. */
  media: WaMediaInput;
  /** Sticker options: replyTo. */
  opts?: WaMessageOpts;
}

export interface WaDocumentPayload {
  /** Media source: { id: "<media_id>" } or { link: "https://..." }. */
  media: WaMediaInput;
  /** Optional caption shown below the document preview. */
  caption?: string;
  /** Display filename shown in chat (e.g. "report.pdf"). */
  filename?: string;
  /** Document options: replyTo. */
  opts?: WaDocumentOpts;
}

export interface WaLocationPayload {
  /** Location data: latitude, longitude, name, address. */
  location: WaLocation;
  /** Location options: replyTo. */
  opts?: WaMessageOpts;
}

export interface WaContactsPayload {
  /** Array of contact cards (vCard-style). */
  contacts: WaContact[];
  /** Contacts options: replyTo. */
  opts?: WaMessageOpts;
}

/**
 * For interactive/template types the payload IS the options object.
 * Re-exported from whatsapp2/types.ts to avoid duplication.
 */
export type WaTemplatePayload = WaTemplateOpts;
export type WaButtonsPayload = WaButtonsOpts;
export type WaListPayload = WaListOpts;
export type WaCtaUrlPayload = WaCtaUrlOpts;
export type WaAddressRequestPayload = WaAddressRequestOpts;
export type WaFlowPayload = WaFlowOpts;

// ─── Email (SendGrid) payload shapes ──────────────────────────────────────────

export interface EmailHtmlPayload {
  /** Email subject line. */
  subject: string;
  /** Full HTML body content. */
  html: string;
  /** SendGrid send options: cc, bcc, replyTo, categories, trackingSettings, etc. */
  opts?: SendEmailOpts;
}

export interface EmailDynamicPayload {
  /** SendGrid dynamic template ID (starts with "d-"). */
  templateId: string;
  /** Handlebars variables to substitute in the template. */
  dynamicData: Record<string, unknown>;
  /** SendGrid send options: cc, bcc, replyTo, categories, trackingSettings, etc. */
  opts?: SendEmailOpts;
}

export interface EmailHtmlAttachmentsPayload {
  /** Email subject line. */
  subject: string;
  /** Full HTML body content. */
  html: string;
  /** File attachments (base64-encoded content, filename, MIME type). */
  attachments: SgAttachment[];
  /** SendGrid send options: cc, bcc, replyTo, categories, trackingSettings, etc. */
  opts?: SendEmailOpts;
}

export interface EmailScheduledPayload {
  /** Email subject line. */
  subject: string;
  /** Full HTML body content. */
  html: string;
  /** Unix timestamp (seconds) — schedule delivery up to 72 hours in the future. */
  sendAt: number;
  /** SendGrid send options: cc, bcc, replyTo, categories, trackingSettings, etc. */
  opts?: SendEmailOpts;
}

export interface EmailScheduledDynamicPayload {
  /** SendGrid dynamic template ID (starts with "d-"). */
  templateId: string;
  /** Handlebars variables to substitute in the template. */
  dynamicData: Record<string, unknown>;
  /** Unix timestamp (seconds) — schedule delivery up to 72 hours in the future. */
  sendAt: number;
  /** SendGrid send options: cc, bcc, replyTo, categories, trackingSettings, etc. */
  opts?: SendEmailOpts;
}

// ─── Message type string literal unions ──────────────────────────────────────

export type TelegramMessageType =
  | 'text'
  | 'photo'
  | 'video'
  | 'audio'
  | 'document'
  | 'voice'
  | 'video_note'
  | 'sticker'
  | 'animation'
  | 'location'
  | 'venue'
  | 'contact'
  | 'poll'
  | 'dice';

export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'sticker'
  | 'document'
  | 'location'
  | 'contacts'
  | 'template'
  | 'buttons'
  | 'list'
  | 'cta_url'
  | 'address_request'
  | 'flow';

export type EmailMessageType = 'html' | 'dynamic' | 'html_attachments' | 'scheduled' | 'scheduled_dynamic';

// ─── Channel-specific discriminated union request types ───────────────────────

type TelegramBase = { tenantId: number; configLabel?: string; channel: 'telegram'; to: string };

export type TelegramSendRequest = TelegramBase &
  (
    | { type: 'text'; payload: TgTextPayload }
    | { type: 'photo'; payload: TgPhotoPayload }
    | { type: 'video'; payload: TgVideoPayload }
    | { type: 'audio'; payload: TgAudioPayload }
    | { type: 'document'; payload: TgDocumentPayload }
    | { type: 'voice'; payload: TgVoicePayload }
    | { type: 'video_note'; payload: TgVideoNotePayload }
    | { type: 'sticker'; payload: TgStickerPayload }
    | { type: 'animation'; payload: TgAnimationPayload }
    | { type: 'location'; payload: TgLocationPayload }
    | { type: 'venue'; payload: TgVenuePayload }
    | { type: 'contact'; payload: TgContactPayload }
    | { type: 'poll'; payload: TgPollPayload }
    | { type: 'dice'; payload: TgDicePayload }
  );

type WhatsAppBase = { tenantId: number; configLabel?: string; channel: 'whatsapp'; to: string };

export type WhatsAppSendRequest = WhatsAppBase &
  (
    | { type: 'text'; payload: WaTextPayload }
    | { type: 'image'; payload: WaImagePayload }
    | { type: 'audio'; payload: WaAudioPayload }
    | { type: 'video'; payload: WaVideoPayload }
    | { type: 'sticker'; payload: WaStickerPayload }
    | { type: 'document'; payload: WaDocumentPayload }
    | { type: 'location'; payload: WaLocationPayload }
    | { type: 'contacts'; payload: WaContactsPayload }
    | { type: 'template'; payload: WaTemplatePayload }
    | { type: 'buttons'; payload: WaButtonsPayload }
    | { type: 'list'; payload: WaListPayload }
    | { type: 'cta_url'; payload: WaCtaUrlPayload }
    | { type: 'address_request'; payload: WaAddressRequestPayload }
    | { type: 'flow'; payload: WaFlowPayload }
  );

type EmailBase = { tenantId: number; configLabel?: string; channel: 'email'; to: string };

export type EmailSendRequest = EmailBase &
  (
    | { type: 'html'; payload: EmailHtmlPayload }
    | { type: 'dynamic'; payload: EmailDynamicPayload }
    | { type: 'html_attachments'; payload: EmailHtmlAttachmentsPayload }
    | { type: 'scheduled'; payload: EmailScheduledPayload }
    | { type: 'scheduled_dynamic'; payload: EmailScheduledDynamicPayload }
  );

// ─── Combined SendRequest ─────────────────────────────────────────────────────

/**
 * Typed send request — discriminated union across all channels and message types.
 * TypeScript narrows the `payload` type based on `channel` + `type`.
 */
export type SendRequest = TelegramSendRequest | WhatsAppSendRequest | EmailSendRequest;

/** Normalized result from any channel send */
export interface SendResult {
  success: boolean;
  channel: CommsChannel;
  messageId?: string;
  error?: string;
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

/** Request shape for broadcast() — same channel/type/payload discrimination as SendRequest. */
export type BroadcastRequest =
  | (Omit<TelegramSendRequest, 'to'> & { recipients: string[]; options?: BroadcastOptions })
  | (Omit<WhatsAppSendRequest, 'to'> & { recipients: string[]; options?: BroadcastOptions })
  | (Omit<EmailSendRequest, 'to'> & { recipients: string[]; options?: BroadcastOptions });

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
