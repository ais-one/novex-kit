// WhatsApp Cloud API — outbound message helpers (v2)
// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api
//
// All functions take (token, phoneNumberId, to, ...) so they work with multiple
// phone numbers/accounts — no hardcoded env reads.
//
// env vars to pass in from your route/service:
//   process.env.WHATSAPP_TOKEN
//   process.env.WHATSAPP_PHONE_NUMBER_ID

import type {
  WaButtonsOpts,
  WaContact,
  WaDocumentOpts,
  WaListOpts,
  WaLocation,
  WaMediaInput,
  WaMediaOpts,
  WaMessageOpts,
  WaTemplateOpts,
  WaTextOpts,
} from './types.ts';

// ─── Core ────────────────────────────────────────────────────────────────────

const API_VERSION = 'v23.0';

export class WhatsAppError extends Error {
  code: number;
  type: string;
  constructor(message: string, code: number, type: string) {
    super(`[WhatsApp API] ${type} (${code}): ${message}`);
    this.code = code;
    this.type = type;
  }
}

async function apiRequest(token: string, phoneNumberId: string, body: Record<string, unknown>) {
  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      ...body,
    }),
  });

  const data = (await res.json()) as { error?: { message: string; code: number; type: string } };

  if (!res.ok || data.error) {
    throw new WhatsAppError(
      data.error?.message ?? `HTTP ${res.status}`,
      data.error?.code ?? res.status,
      data.error?.type ?? 'unknown',
    );
  }

  return data;
}

function replyContext(opts?: WaMessageOpts) {
  return opts?.replyTo ? { context: { message_id: opts.replyTo } } : {};
}

// ─── Text ─────────────────────────────────────────────────────────────────────

/**
 * Send a plain or formatted text message.
 *
 * @param opts.preview_url  Set true to render a link preview for the first URL.
 * @param opts.replyTo      wamid to reply to.
 *
 * @example
 * await sendText(token, phoneId, '+60123456789', 'Hello!');
 * await sendText(token, phoneId, '+60123456789', 'Check this out: https://example.com', { preview_url: true });
 */
export async function sendText(token: string, phoneNumberId: string, to: string, text: string, opts: WaTextOpts = {}) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'text',
    text: { body: text, preview_url: opts.preview_url ?? false },
    ...replyContext(opts),
  });
}

// ─── Image ────────────────────────────────────────────────────────────────────

/**
 * Send an image.
 * Supported formats: JPEG, PNG. Max 5 MB.
 *
 * @param media  `{ id: "<media_id>" }` (from Media Upload API) or `{ link: "https://..." }`.
 *
 * @example
 * await sendImage(token, phoneId, '+60123456789', { link: 'https://example.com/photo.jpg' }, { caption: 'A photo' });
 */
export async function sendImage(
  token: string,
  phoneNumberId: string,
  to: string,
  media: WaMediaInput,
  opts: WaMediaOpts = {},
) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'image',
    image: { ...media, ...(opts.caption ? { caption: opts.caption } : {}) },
    ...replyContext(opts),
  });
}

// ─── Audio ────────────────────────────────────────────────────────────────────

/**
 * Send an audio file.
 * Supported: AAC, MP4, MPEG, AMR, OGG (OPUS codec required for voice notes). Max 16 MB.
 * Note: captions are NOT supported for audio messages.
 *
 * @example
 * await sendAudio(token, phoneId, '+60123456789', { link: 'https://example.com/clip.ogg' });
 */
export async function sendAudio(
  token: string,
  phoneNumberId: string,
  to: string,
  media: WaMediaInput,
  opts: WaMessageOpts = {},
) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'audio',
    audio: { ...media },
    ...replyContext(opts),
  });
}

// ─── Document ─────────────────────────────────────────────────────────────────

/**
 * Send a document (PDF, DOCX, XLSX, etc.). Max 100 MB.
 *
 * @param opts.filename  Display name shown in chat (e.g. "report.pdf").
 * @param opts.caption   Text shown below the document preview.
 *
 * @example
 * await sendDocument(token, phoneId, '+60123456789', { link: 'https://example.com/file.pdf' }, { filename: 'report.pdf', caption: 'Q1 Report' });
 */
export async function sendDocument(
  token: string,
  phoneNumberId: string,
  to: string,
  media: WaMediaInput,
  opts: WaDocumentOpts = {},
) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'document',
    document: {
      ...media,
      ...(opts.caption ? { caption: opts.caption } : {}),
      ...(opts.filename ? { filename: opts.filename } : {}),
    },
    ...replyContext(opts),
  });
}

// ─── Video ────────────────────────────────────────────────────────────────────

/**
 * Send a video.
 * Supported: MP4, 3GPP (H.264 video codec, AAC audio codec). Max 16 MB.
 *
 * @example
 * await sendVideo(token, phoneId, '+60123456789', { link: 'https://example.com/clip.mp4' }, { caption: 'Watch this' });
 */
export async function sendVideo(
  token: string,
  phoneNumberId: string,
  to: string,
  media: WaMediaInput,
  opts: WaMediaOpts = {},
) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'video',
    video: { ...media, ...(opts.caption ? { caption: opts.caption } : {}) },
    ...replyContext(opts),
  });
}

// ─── Sticker ──────────────────────────────────────────────────────────────────

/**
 * Send a sticker.
 * Supported: WEBP. Max 100 KB (static), 500 KB (animated).
 * WhatsApp-specific — no direct Telegram equivalent via Cloud API.
 *
 * @example
 * await sendSticker(token, phoneId, '+60123456789', { id: '<sticker_media_id>' });
 */
export async function sendSticker(
  token: string,
  phoneNumberId: string,
  to: string,
  media: WaMediaInput,
  opts: WaMessageOpts = {},
) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'sticker',
    sticker: { ...media },
    ...replyContext(opts),
  });
}

// ─── Location ─────────────────────────────────────────────────────────────────

/**
 * Send a location pin.
 *
 * @example
 * await sendLocation(token, phoneId, '+60123456789', {
 *   latitude: 3.1390,
 *   longitude: 101.6869,
 *   name: 'Kuala Lumpur City Centre',
 *   address: 'Kuala Lumpur, Malaysia',
 * });
 */
export async function sendLocation(
  token: string,
  phoneNumberId: string,
  to: string,
  location: WaLocation,
  opts: WaMessageOpts = {},
) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'location',
    location,
    ...replyContext(opts),
  });
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

/**
 * Send one or more contact cards (vCard-style).
 *
 * @example
 * await sendContacts(token, phoneId, '+60123456789', [{
 *   name: { formatted_name: 'John Doe', first_name: 'John', last_name: 'Doe' },
 *   phones: [{ phone: '+60123456789', type: 'CELL' }],
 *   emails: [{ email: 'john@example.com', type: 'WORK' }],
 * }]);
 */
export async function sendContacts(
  token: string,
  phoneNumberId: string,
  to: string,
  contacts: WaContact[],
  opts: WaMessageOpts = {},
) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'contacts',
    contacts,
    ...replyContext(opts),
  });
}

// ─── Interactive: Reply Buttons ───────────────────────────────────────────────

/**
 * Send up to 3 quick-reply buttons.
 * WhatsApp equivalent of Telegram's inline keyboard (reply buttons).
 * The tapped button sends a webhook with `interactive.button_reply.id`.
 *
 * @param opts.buttons  Up to 3 buttons. Title max 20 chars, ID max 256 chars.
 *
 * @example
 * await sendButtons(token, phoneId, '+60123456789', {
 *   body: 'Choose an option:',
 *   buttons: [
 *     { id: 'yes', title: 'Yes' },
 *     { id: 'no', title: 'No' },
 *     { id: 'later', title: 'Remind me later' },
 *   ],
 *   footer: 'Reply by tapping',
 * });
 */
export async function sendButtons(token: string, phoneNumberId: string, to: string, opts: WaButtonsOpts) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(opts.header ? { header: { type: 'text', text: opts.header } } : {}),
      body: { text: opts.body },
      ...(opts.footer ? { footer: { text: opts.footer } } : {}),
      action: {
        buttons: opts.buttons.slice(0, 3).map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
    ...replyContext(opts),
  });
}

// ─── Interactive: List Message ────────────────────────────────────────────────

/**
 * Send a scrollable list menu.
 * Max 10 rows total across all sections.
 * The selected row sends a webhook with `interactive.list_reply.id`.
 *
 * @param opts.button    Label on the button that opens the list. Max 20 chars.
 * @param opts.sections  Each section has an optional title and rows.
 *
 * @example
 * await sendList(token, phoneId, '+60123456789', {
 *   body: 'Select a department:',
 *   button: 'View options',
 *   sections: [{
 *     title: 'Support',
 *     rows: [
 *       { id: 'billing', title: 'Billing', description: 'Payment issues' },
 *       { id: 'technical', title: 'Technical', description: 'App problems' },
 *     ],
 *   }],
 * });
 */
export async function sendList(token: string, phoneNumberId: string, to: string, opts: WaListOpts) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(opts.header ? { header: { type: 'text', text: opts.header } } : {}),
      body: { text: opts.body },
      ...(opts.footer ? { footer: { text: opts.footer } } : {}),
      action: {
        button: opts.button,
        sections: opts.sections,
      },
    },
    ...replyContext(opts),
  });
}

// ─── Template ─────────────────────────────────────────────────────────────────

/**
 * Send an approved message template.
 * REQUIRED for initiating conversations outside the 24-hour customer service window.
 *
 * Templates must first be created and approved in Meta Business Manager.
 * The pre-approved "hello_world" template (language: "en_US") is available on all
 * new test accounts and requires no variables.
 *
 * @see https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview
 *
 * @example
 * // Send the built-in hello_world template (no variables needed):
 * await sendTemplate(token, phoneId, '+60123456789', {
 *   name: 'hello_world',
 *   language: 'en_US',
 * });
 *
 * // Send a custom template with a body variable:
 * await sendTemplate(token, phoneId, '+60123456789', {
 *   name: 'order_confirmation',
 *   language: 'en_US',
 *   components: [{
 *     type: 'body',
 *     parameters: [{ type: 'text', text: 'ORDER-12345' }],
 *   }],
 * });
 */
export async function sendTemplate(token: string, phoneNumberId: string, to: string, opts: WaTemplateOpts) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'template',
    template: {
      name: opts.name,
      language: { code: opts.language },
      ...(opts.components?.length ? { components: opts.components } : {}),
    },
  });
}

// ─── Reaction ─────────────────────────────────────────────────────────────────

/**
 * React to a message with an emoji.
 * Pass an empty string for emoji to remove an existing reaction.
 *
 * @param messageId  The wamid of the message to react to (from your inbound webhook).
 *
 * @example
 * await sendReaction(token, phoneId, '+60123456789', 'wamid.HBgL...', '👍');
 * // Remove reaction:
 * await sendReaction(token, phoneId, '+60123456789', 'wamid.HBgL...', '');
 */
export async function sendReaction(token: string, phoneNumberId: string, to: string, messageId: string, emoji: string) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'reaction',
    reaction: { message_id: messageId, emoji },
  });
}

// ─── Read Receipt ─────────────────────────────────────────────────────────────

/**
 * Mark an inbound message as read (shows blue double-ticks to the sender).
 * Call this after your bot successfully processes a user's message.
 *
 * @param messageId  The wamid of the received message (from your inbound webhook).
 *
 * @example
 * await markAsRead(token, phoneId, 'wamid.HBgL...');
 */
export async function markAsRead(token: string, phoneNumberId: string, messageId: string) {
  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });

  const data = (await res.json()) as { error?: { message: string; code: number; type: string } };
  if (!res.ok || data.error) {
    throw new WhatsAppError(
      data.error?.message ?? `HTTP ${res.status}`,
      data.error?.code ?? res.status,
      data.error?.type ?? 'unknown',
    );
  }

  return data;
}

// ─── NOT available in WhatsApp Cloud API ──────────────────────────────────────
// The following features exist in Telegram but have no Cloud API equivalent:
//
// TODO: sendTypingIndicator
//   — Available in Cloud API within the 24h customer service window.
//     POST /{PHONE_NUMBER_ID}/messages with { "type": "typing_indicator" }.
//     (Telegram: sendChatAction({ action: 'typing' }))
//
// TODO: sendPoll
//   — Polls are a native WhatsApp app feature; not exposed via Cloud API.
//     (Telegram: sendPoll())
//
// TODO: sendMediaGroup / album
//   — WhatsApp sends each media separately; no grouped-album API.
//     (Telegram: sendMediaGroup())
//
// TODO: pinMessage / unpinMessage
//   — No message-pinning API for Cloud API (only in WhatsApp native app).
//     (Telegram: pinChatMessage())
//
// TODO: sendGame / sendInvoice
//   — No Telegram-style games or built-in payment flow in Cloud API.
//     WhatsApp Pay exists but is region-locked (IN/BR only) and not in Cloud API.
