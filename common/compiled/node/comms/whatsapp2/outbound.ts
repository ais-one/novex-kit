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
  WaAddressRequestOpts,
  WaBroadcastOpts,
  WaBroadcastResult,
  WaBroadcastResultItem,
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
} from './types.ts';

// ─── Core ────────────────────────────────────────────────────────────────────

const API_VERSION = 'v25.0';

export class WhatsAppError extends Error {
  code: number;
  type: string;
  constructor(message: string, code: number, type: string) {
    super(`[WhatsApp API] ${type} (${code}): ${message}`);
    this.code = code;
    this.type = type;
  }
}

const DEBUG = process.env.WA_DEBUG === '1' || process.env.WA_DEBUG === 'true';
function waLog(direction: '→' | '←', label: string, data: unknown) {
  if (DEBUG) logger.debug(`[WA ${direction}] ${label}`, { payload: data });
}

async function apiRequest(token: string, phoneNumberId: string, body: Record<string, unknown>) {
  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  const fullBody = { messaging_product: 'whatsapp', recipient_type: 'individual', ...body };
  waLog('→', `POST ${url}`, fullBody);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(fullBody),
  });

  const data = (await res.json()) as { error?: { message: string; code: number; type: string } };
  waLog('←', `${res.status}`, data);

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
  const markBody = { messaging_product: 'whatsapp', status: 'read', message_id: messageId };
  waLog('→', `POST ${url}`, markBody);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(markBody),
  });

  const data = (await res.json()) as { error?: { message: string; code: number; type: string } };
  waLog('←', `${res.status}`, data);
  if (!res.ok || data.error) {
    throw new WhatsAppError(
      data.error?.message ?? `HTTP ${res.status}`,
      data.error?.code ?? res.status,
      data.error?.type ?? 'unknown',
    );
  }

  return data;
}

// ─── Typing Indicator ────────────────────────────────────────────────────────

/**
 * Show a "typing..." indicator to the recipient AND mark their message as read.
 *
 * IMPORTANT: This uses the same endpoint as markAsRead and requires the `message_id`
 * of the received message (from your inbound webhook). The typing indicator is dismissed
 * after 25 seconds or when you send the next message, whichever comes first.
 *
 * Only works within the 24-hour customer service window.
 * Telegram equivalent: sendChatAction({ action: 'typing' })
 *
 * @param messageId  The wamid of the received message (from your inbound webhook).
 *
 * @example
 * await sendTypingIndicator(token, phoneId, 'wamid.HBgLMTY...');
 */
export async function sendTypingIndicator(token: string, phoneNumberId: string, messageId: string) {
  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  const typingBody = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
    typing_indicator: { type: 'text' },
  };
  waLog('→', `POST ${url}`, typingBody);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(typingBody),
  });

  const data = (await res.json()) as { error?: { message: string; code: number; type: string } };
  waLog('←', `${res.status}`, data);
  if (!res.ok || data.error) {
    throw new WhatsAppError(
      data.error?.message ?? `HTTP ${res.status}`,
      data.error?.code ?? res.status,
      data.error?.type ?? 'unknown',
    );
  }

  return data;
}

// ─── CTA URL Button ───────────────────────────────────────────────────────────

/**
 * Send an interactive button that opens a URL when tapped.
 * WhatsApp-only — Telegram uses inline keyboard buttons with `url` field instead.
 *
 * @example
 * await sendCtaUrlButton(token, phoneId, '+60123456789', {
 *   body: 'Visit our website for more info.',
 *   displayText: 'Visit us',
 *   url: 'https://example.com',
 * });
 */
export async function sendCtaUrlButton(token: string, phoneNumberId: string, to: string, opts: WaCtaUrlOpts) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      ...(opts.header ? { header: { type: 'text', text: opts.header } } : {}),
      body: { text: opts.body },
      ...(opts.footer ? { footer: { text: opts.footer } } : {}),
      action: {
        name: 'cta_url',
        parameters: {
          display_text: opts.displayText,
          url: opts.url,
        },
      },
    },
    ...replyContext(opts),
  });
}

// ─── Address Request ──────────────────────────────────────────────────────────

/**
 * Prompt the user to share their delivery address.
 * WhatsApp-only. Currently only supported in India ('IN') and Saudi Arabia ('SA').
 *
 * @example
 * await sendAddressRequest(token, phoneId, '+919876543210', {
 *   body: 'Please share your delivery address to confirm your order.',
 *   country: 'IN',
 * });
 */
export async function sendAddressRequest(token: string, phoneNumberId: string, to: string, opts: WaAddressRequestOpts) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'interactive',
    interactive: {
      type: 'address_message',
      body: { text: opts.body },
      ...(opts.footer ? { footer: { text: opts.footer } } : {}),
      action: {
        name: 'address_message',
        parameters: { country: opts.country },
      },
    },
    ...replyContext(opts),
  });
}

// ─── WhatsApp Flows ───────────────────────────────────────────────────────────

/**
 * Open a WhatsApp Flow — a multi-step structured form inside WhatsApp.
 * WhatsApp-only. The flow must be built and published in Meta's Flows Builder first.
 * @see https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/
 *
 * @example
 * await sendFlow(token, phoneId, '+60123456789', {
 *   body: 'Book your appointment below.',
 *   flowId: '1234567890',
 *   flowToken: crypto.randomUUID(),
 *   flowCta: 'Book now',
 *   flowAction: 'navigate',
 *   screen: 'APPOINTMENT_SCREEN',
 * });
 */
export async function sendFlow(token: string, phoneNumberId: string, to: string, opts: WaFlowOpts) {
  return apiRequest(token, phoneNumberId, {
    to,
    type: 'interactive',
    interactive: {
      type: 'flow',
      ...(opts.header ? { header: { type: 'text', text: opts.header } } : {}),
      body: { text: opts.body },
      ...(opts.footer ? { footer: { text: opts.footer } } : {}),
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_token: opts.flowToken,
          flow_id: opts.flowId,
          flow_cta: opts.flowCta,
          flow_action: opts.flowAction ?? 'navigate',
          mode: opts.mode ?? 'published',
          ...(opts.screen
            ? { flow_action_payload: { screen: opts.screen, ...(opts.flowActionPayload ?? {}) } }
            : opts.flowActionPayload
              ? { flow_action_payload: opts.flowActionPayload }
              : {}),
        },
      },
    },
    ...replyContext(opts),
  });
}

// ─── Media Upload ─────────────────────────────────────────────────────────────

/**
 * Upload a local file to WhatsApp's media servers and return a reusable `media_id`.
 *
 * WhatsApp requires a 2-step process for local files:
 *   1. Upload here to get a `media_id` (stays valid for 30 days).
 *   2. Pass `{ id: mediaId }` to sendImage, sendDocument, sendAudio, etc.
 *
 * For files already hosted at a public URL, skip this — use `{ link: 'https://...' }` directly.
 *
 * @param file      Raw file content as a `Buffer` or `Blob`.
 * @param mimeType  MIME type, e.g. `'application/pdf'`, `'image/jpeg'`.
 * @param filename  Optional file name (shown to recipient for documents).
 *
 * @example
 * const { id } = await uploadMedia(token, phoneId, pdfBuffer, 'application/pdf', 'report.pdf');
 * await sendDocument(token, phoneId, to, { id }, { filename: 'report.pdf' });
 */
export async function uploadMedia(
  token: string,
  phoneNumberId: string,
  file: Buffer | Blob,
  mimeType: string,
  filename = 'file',
): Promise<{ id: string }> {
  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/media`;
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  // Buffer extends Uint8Array<ArrayBufferLike>; cast to ArrayBuffer to satisfy BlobPart typing
  // (safe at runtime — Node.js Buffers are always backed by a plain ArrayBuffer)
  const blobContent: BlobPart = file instanceof Blob ? file : (file.buffer as ArrayBuffer);
  form.append('file', new Blob([blobContent], { type: mimeType }), filename);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const data = (await res.json()) as { id?: string; error?: { message: string; code: number; type: string } };
  if (!res.ok || data.error) {
    throw new WhatsAppError(
      data.error?.message ?? `HTTP ${res.status}`,
      data.error?.code ?? res.status,
      data.error?.type ?? 'unknown',
    );
  }

  return { id: data.id! };
}

// ─── Media Download ───────────────────────────────────────────────────────────

/**
 * Resolve an inbound `media_id` to a temporary download URL.
 *
 * When users send images, audio, documents, etc. to your bot, the webhook payload
 * contains only a `media_id`. Call this to get a short-lived (~5 min) URL, then
 * fetch that URL with the same Bearer token to download the binary.
 *
 * @param mediaId  The `id` field from an inbound media message.
 *
 * @example
 * // In your webhook handler:
 * if (msg.content.type === 'image') {
 *   const url = await getMediaUrl(token, msg.content.id);
 *   const file = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
 *   const buffer = Buffer.from(await file.arrayBuffer());
 * }
 */
export async function getMediaUrl(token: string, mediaId: string): Promise<string> {
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await res.json()) as { url?: string; error?: { message: string; code: number; type: string } };
  if (!res.ok || data.error) {
    throw new WhatsAppError(
      data.error?.message ?? `HTTP ${res.status}`,
      data.error?.code ?? res.status,
      data.error?.type ?? 'unknown',
    );
  }

  return data.url!;
}

// ─── NOT available in WhatsApp Cloud API ──────────────────────────────────────
// The following features exist in Telegram but have no Cloud API equivalent:
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
//
// NOT available: editMessage / deleteMessage / forwardMessage / copyMessage / pinMessage
//   — WhatsApp Cloud API has no message edit, delete, forward, copy, or pin endpoints.
//
// NOT available: sendVideoNote / sendAnimation / sendMediaGroup / sendDice / sendVenue
//   — WhatsApp Cloud API has no round video, GIF, album, dice, or Foursquare venue types.
//
// NOT available: editLiveLocation
//   — WhatsApp Cloud API has no live location update endpoint.

// ─── Broadcast ────────────────────────────────────────────────────────────────

const WA_DEFAULT_DELAY_MS = 80; // ~12 msgs/sec — safe for most tiers

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send a message to multiple recipients sequentially with rate limiting.
 *
 * Uses a callback pattern — pass any existing send function as the sender.
 * The broadcast function handles looping, rate limiting, and result aggregation.
 *
 * @param recipients - Array of phone numbers to send to (E.164 format without "+")
 * @param sendFn - A function that sends to a single recipient. Receives `to` and should return the API response.
 * @param opts - Broadcast options (delay between sends, concurrency)
 * @returns Aggregated results with per-recipient success/failure details
 *
 * @example
 * // Text broadcast
 * await broadcast(
 *   ['60123456789', '60198765432'],
 *   (to) => sendText(token, phoneId, to, 'Hello!'),
 * )
 *
 * @example
 * // Template broadcast (for users outside 24h window)
 * await broadcast(
 *   phoneNumbers,
 *   (to) => sendTemplate(token, phoneId, to, { name: 'hello_world', language: 'en' }),
 *   { delayMs: 100 },
 * )
 *
 * @example
 * // Image broadcast with caption
 * await broadcast(
 *   phoneNumbers,
 *   (to) => sendImage(token, phoneId, to, { link: 'https://example.com/promo.jpg' }, { caption: 'Check this out!' }),
 * )
 */
export async function broadcast(
  recipients: string[],
  sendFn: (to: string) => Promise<unknown>,
  opts?: WaBroadcastOpts,
): Promise<WaBroadcastResult> {
  const delayMs = opts?.delayMs ?? WA_DEFAULT_DELAY_MS;
  const concurrency = opts?.concurrency ?? 1;
  const results: WaBroadcastResultItem[] = [];

  if (concurrency <= 1) {
    // Sequential mode (default — safest for rate limits)
    for (let i = 0; i < recipients.length; i++) {
      const to = recipients[i];
      try {
        const data = await sendFn(to);
        results.push({ to, success: true, data });
      } catch (err: unknown) {
        const error =
          err instanceof WhatsAppError
            ? { message: err.message, code: err.code, type: err.type }
            : { message: err instanceof Error ? err.message : String(err) };
        results.push({ to, success: false, error });
      }
      // Delay between sends (skip after last)
      if (i < recipients.length - 1 && delayMs > 0) {
        await delay(delayMs);
      }
    }
  } else {
    // Concurrent mode — process in batches
    for (let i = 0; i < recipients.length; i += concurrency) {
      const batch = recipients.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(async to => {
          const data = await sendFn(to);
          return { to, data };
        }),
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const to = batch[j];
        if (result.status === 'fulfilled') {
          results.push({ to, success: true, data: result.value.data });
        } else {
          const err = result.reason;
          const error =
            err instanceof WhatsAppError
              ? { message: err.message, code: err.code, type: err.type }
              : { message: err instanceof Error ? err.message : String(err) };
          results.push({ to, success: false, error });
        }
      }

      // Delay between batches (skip after last)
      if (i + concurrency < recipients.length && delayMs > 0) {
        await delay(delayMs);
      }
    }
  }

  const sent = results.filter(r => r.success).length;
  return {
    total: recipients.length,
    sent,
    failed: recipients.length - sent,
    results,
  };
}
