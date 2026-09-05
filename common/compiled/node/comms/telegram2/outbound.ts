// telegram-sender.js

import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = (token: string) => `https://api.telegram.org/bot${token}`;

// ─── Core Request Helper ──────────────────────────────────────────────────────

export async function apiRequest(
  token: string,
  method: string,
  params: Record<string, unknown> = {},
  formData: FormData | null = null,
) {
  const url = `${BASE_URL(token)}/${method}`;

  const options = formData
    ? { method: 'POST', body: formData }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      };

  const res = await fetch(url, options);
  const data = (await res.json()) as { ok: boolean; description: string; error_code: number; result: unknown };

  if (!data.ok) {
    throw new TelegramError(data.description, data.error_code, method);
  }

  return data.result;
}

class TelegramError extends Error {
  code: number;
  method: string;
  constructor(message: string, code: number, method: string) {
    super(`[${method}] Telegram API error ${code}: ${message}`);
    this.code = code;
    this.method = method;
  }
}

// ─── File Helper ──────────────────────────────────────────────────────────────

/**
 * Resolves a file input to the right Telegram format:
 *   - "file_id:..." → use existing Telegram file ID
 *   - "http(s)://..." → use URL
 *   - Everything else  → treat as local path, attach as multipart
 */
async function resolveFile(fd: FormData, fieldName: string, input: string): Promise<string | null> {
  if (!input) return null;
  if (input.startsWith('file_id:')) return input.replace('file_id:', '');
  if (input.startsWith('http://') || input.startsWith('https://')) return input;

  // Local file – attach to FormData
  const blob = await fs.openAsBlob(input);
  fd.append(fieldName, blob, path.basename(input));
  return null; // signal: already added to form
}

// ─── Keyboard Builders ────────────────────────────────────────────────────────

/**
 * Inline keyboard attached to the message.
 *
 * @example
 * inlineKeyboard([
 *   [{ text: "Visit", url: "https://example.com" }],
 *   [{ text: "Callback", callback_data: "btn_1" }, { text: "Pay", pay: true }]
 * ])
 */
export function inlineKeyboard(rows: Array<Array<Record<string, unknown>>>): string {
  return JSON.stringify({ inline_keyboard: rows });
}

/**
 * Custom reply keyboard shown to the user.
 *
 * @example
 * replyKeyboard([["Yes", "No"], ["Cancel"]], { resize_keyboard: true })
 */
export function replyKeyboard(
  rows: Array<Array<string | Record<string, unknown>>>,
  { resize_keyboard = true, one_time_keyboard = false, is_persistent = false, selective = false } = {},
): string {
  return JSON.stringify({
    keyboard: rows.map(row =>
      row.map((btn: string | Record<string, unknown>) => (typeof btn === 'string' ? { text: btn } : btn)),
    ),
    resize_keyboard,
    one_time_keyboard,
    is_persistent,
    selective,
  });
}

/** Removes any custom keyboard from the user's view. */
export function removeKeyboard(selective = false) {
  return JSON.stringify({ remove_keyboard: true, selective });
}

/** Forces a reply prompt on the user's client. */
export function forceReply(input_field_placeholder = '', selective = false) {
  return JSON.stringify({ force_reply: true, input_field_placeholder, selective });
}

import type { ContactData, MediaGroupItem, TelegramMessageOpts, VenueData } from './types.ts';

// ─── Shared Message Options ───────────────────────────────────────────────────

function commonOpts({
  parse_mode, // "HTML" | "Markdown" | "MarkdownV2"
  caption,
  caption_parse_mode,
  reply_to_message_id,
  allow_sending_without_reply,
  reply_markup, // use inlineKeyboard() / replyKeyboard() helpers
  disable_notification,
  protect_content,
  message_thread_id, // forum thread id
  business_connection_id,
}: TelegramMessageOpts = {}) {
  return Object.fromEntries(
    Object.entries({
      parse_mode,
      caption,
      caption_parse_mode,
      reply_to_message_id,
      allow_sending_without_reply,
      reply_markup,
      disable_notification,
      protect_content,
      message_thread_id,
      business_connection_id,
    }).filter(([, v]) => v !== undefined),
  );
}

// ─── Text ─────────────────────────────────────────────────────────────────────

/**
 * Send a plain or formatted text message.
 *
 * @param opts.parse_mode       "HTML" | "Markdown" | "MarkdownV2"
 * @param opts.entities         pre-built MessageEntity array
 * @param opts.reply_markup     use inlineKeyboard() etc.
 */
export async function sendMessage(
  token: string,
  chatId: number | string,
  text: string,
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: opts.disable_web_page_preview,
    entities: opts.entities,
    ...commonOpts(opts),
  });
}

// ─── Photo ────────────────────────────────────────────────────────────────────

/**
 * @param photo  local path, HTTPS URL, or "file_id:<id>"
 * @param opts.has_spoiler
 */
export async function sendPhoto(token: string, chatId: number | string, photo: string, opts: TelegramMessageOpts = {}) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  if (opts.caption) fd.append('caption', opts.caption);
  if (opts.parse_mode) fd.append('parse_mode', opts.parse_mode);
  if (opts.has_spoiler) fd.append('has_spoiler', 'true');
  if (opts.reply_markup) fd.append('reply_markup', opts.reply_markup);
  if (opts.reply_to_message_id) fd.append('reply_to_message_id', String(opts.reply_to_message_id));
  if (opts.disable_notification) fd.append('disable_notification', 'true');
  if (opts.protect_content) fd.append('protect_content', 'true');

  const resolved = await resolveFile(fd, 'photo', photo);
  if (resolved) fd.append('photo', resolved);

  return apiRequest(token, 'sendPhoto', {}, fd);
}

// ─── Video ────────────────────────────────────────────────────────────────────

/**
 * @param video  local path, URL, or file_id
 * @param opts.duration
 * @param opts.width
 * @param opts.height
 * @param opts.thumbnail   local path, URL, or file_id for cover image
 * @param opts.supports_streaming
 * @param opts.has_spoiler
 */
export async function sendVideo(token: string, chatId: number | string, video: string, opts: TelegramMessageOpts = {}) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  if (opts.duration) fd.append('duration', String(opts.duration));
  if (opts.width) fd.append('width', String(opts.width));
  if (opts.height) fd.append('height', String(opts.height));
  if (opts.supports_streaming) fd.append('supports_streaming', 'true');
  if (opts.has_spoiler) fd.append('has_spoiler', 'true');
  if (opts.caption) fd.append('caption', opts.caption);
  if (opts.parse_mode) fd.append('parse_mode', opts.parse_mode);
  if (opts.reply_markup) fd.append('reply_markup', opts.reply_markup);

  const resolvedVideo = await resolveFile(fd, 'video', video);
  if (resolvedVideo) fd.append('video', resolvedVideo);

  if (opts.thumbnail) {
    const resolvedThumb = await resolveFile(fd, 'thumbnail', opts.thumbnail);
    if (resolvedThumb) fd.append('thumbnail', resolvedThumb);
  }

  return apiRequest(token, 'sendVideo', {}, fd);
}

// ─── Audio ────────────────────────────────────────────────────────────────────

/**
 * @param audio  local path, URL, or file_id
 * @param opts.duration
 * @param opts.performer
 * @param opts.title
 * @param opts.thumbnail
 */
export async function sendAudio(token: string, chatId: number | string, audio: string, opts: TelegramMessageOpts = {}) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  if (opts.duration) fd.append('duration', String(opts.duration));
  if (opts.performer) fd.append('performer', opts.performer);
  if (opts.title) fd.append('title', opts.title);
  if (opts.caption) fd.append('caption', opts.caption);
  if (opts.parse_mode) fd.append('parse_mode', opts.parse_mode);
  if (opts.reply_markup) fd.append('reply_markup', opts.reply_markup);

  const resolved = await resolveFile(fd, 'audio', audio);
  if (resolved) fd.append('audio', resolved);

  if (opts.thumbnail) {
    const resolvedThumb = await resolveFile(fd, 'thumbnail', opts.thumbnail);
    if (resolvedThumb) fd.append('thumbnail', resolvedThumb);
  }

  return apiRequest(token, 'sendAudio', {}, fd);
}

// ─── Document ─────────────────────────────────────────────────────────────────

/**
 * @param document  local path, URL, or file_id
 * @param opts.disable_content_type_detection
 */
export async function sendDocument(
  token: string,
  chatId: number | string,
  document: string,
  opts: TelegramMessageOpts = {},
) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  if (opts.caption) fd.append('caption', opts.caption);
  if (opts.parse_mode) fd.append('parse_mode', opts.parse_mode);
  if (opts.disable_content_type_detection) fd.append('disable_content_type_detection', 'true');
  if (opts.reply_markup) fd.append('reply_markup', opts.reply_markup);

  const resolved = await resolveFile(fd, 'document', document);
  if (resolved) fd.append('document', resolved);

  if (opts.thumbnail) {
    const resolvedThumb = await resolveFile(fd, 'thumbnail', opts.thumbnail);
    if (resolvedThumb) fd.append('thumbnail', resolvedThumb);
  }

  return apiRequest(token, 'sendDocument', {}, fd);
}

// ─── Voice ────────────────────────────────────────────────────────────────────

/** OGG/OPUS encoded voice message. */
export async function sendVoice(token: string, chatId: number | string, voice: string, opts: TelegramMessageOpts = {}) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  if (opts.duration) fd.append('duration', String(opts.duration));
  if (opts.caption) fd.append('caption', opts.caption);
  if (opts.parse_mode) fd.append('parse_mode', opts.parse_mode);

  const resolved = await resolveFile(fd, 'voice', voice);
  if (resolved) fd.append('voice', resolved);

  return apiRequest(token, 'sendVoice', {}, fd);
}

// ─── Video Note ───────────────────────────────────────────────────────────────

/** Round video (1:1 aspect ratio). */
export async function sendVideoNote(
  token: string,
  chatId: number | string,
  videoNote: string,
  opts: TelegramMessageOpts = {},
) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  if (opts.duration) fd.append('duration', String(opts.duration));
  if (opts.length) fd.append('length', String(opts.length));

  const resolved = await resolveFile(fd, 'video_note', videoNote);
  if (resolved) fd.append('video_note', resolved);

  return apiRequest(token, 'sendVideoNote', {}, fd);
}

// ─── Sticker ──────────────────────────────────────────────────────────────────

/**
 * @param sticker  local .webp/.tgs/.webm, URL, or file_id
 * @param opts.emoji  emoji associated with the sticker
 */
export async function sendSticker(
  token: string,
  chatId: number | string,
  sticker: string,
  opts: TelegramMessageOpts = {},
) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  if (opts.emoji) fd.append('emoji', opts.emoji);
  if (opts.reply_markup) fd.append('reply_markup', opts.reply_markup);

  const resolved = await resolveFile(fd, 'sticker', sticker);
  if (resolved) fd.append('sticker', resolved);

  return apiRequest(token, 'sendSticker', {}, fd);
}

// ─── Animation (GIF) ──────────────────────────────────────────────────────────

export async function sendAnimation(
  token: string,
  chatId: number | string,
  animation: string,
  opts: TelegramMessageOpts = {},
) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  if (opts.duration) fd.append('duration', String(opts.duration));
  if (opts.width) fd.append('width', String(opts.width));
  if (opts.height) fd.append('height', String(opts.height));
  if (opts.caption) fd.append('caption', opts.caption);
  if (opts.has_spoiler) fd.append('has_spoiler', 'true');

  const resolved = await resolveFile(fd, 'animation', animation);
  if (resolved) fd.append('animation', resolved);

  return apiRequest(token, 'sendAnimation', {}, fd);
}

// ─── Media Group (Album) ──────────────────────────────────────────────────────

/**
 * Send 2–10 photos/videos as an album.
 *
 * @param media  Array of { type, file, caption?, parse_mode? }
 *               type: "photo" | "video" | "audio" | "document"
 *
 * @example
 * sendMediaGroup(token, chatId, [
 *   { type: "photo", file: "./img1.jpg", caption: "First" },
 *   { type: "photo", file: "./img2.jpg" },
 *   { type: "video", file: "./clip.mp4" },
 * ]);
 */
export async function sendMediaGroup(
  token: string,
  chatId: number | string,
  media: MediaGroupItem[],
  opts: TelegramMessageOpts = {},
) {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  if (opts.reply_to_message_id) fd.append('reply_to_message_id', String(opts.reply_to_message_id));
  if (opts.disable_notification) fd.append('disable_notification', 'true');
  if (opts.protect_content) fd.append('protect_content', 'true');

  const mediaArray = await Promise.all(
    media.map(async (item, i) => {
      const fieldName = `file_${i}`;
      const resolved = await resolveFile(fd, fieldName, item.file);
      return {
        type: item.type,
        media: resolved ?? `attach://${fieldName}`,
        ...(item.caption ? { caption: item.caption } : {}),
        ...(item.parse_mode ? { parse_mode: item.parse_mode } : {}),
        ...(item.has_spoiler ? { has_spoiler: true } : {}),
      };
    }),
  );

  fd.append('media', JSON.stringify(mediaArray));
  return apiRequest(token, 'sendMediaGroup', {}, fd);
}

// ─── Location ─────────────────────────────────────────────────────────────────

/**
 * @param opts.horizontal_accuracy   accuracy radius in metres (0–1500)
 * @param opts.live_period           seconds to broadcast live (60–86400)
 * @param opts.heading               1–360 degrees
 * @param opts.proximity_alert_radius
 */
export async function sendLocation(
  token: string,
  chatId: number | string,
  latitude: number,
  longitude: number,
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'sendLocation', {
    chat_id: chatId,
    latitude,
    longitude,
    horizontal_accuracy: opts.horizontal_accuracy,
    live_period: opts.live_period,
    heading: opts.heading,
    proximity_alert_radius: opts.proximity_alert_radius,
    ...commonOpts(opts),
  });
}

/** Edit a live location message while it's still broadcasting. */
export async function editLiveLocation(
  token: string,
  chatId: number | string,
  messageId: number,
  latitude: number,
  longitude: number,
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'editMessageLiveLocation', {
    chat_id: chatId,
    message_id: messageId,
    latitude,
    longitude,
    horizontal_accuracy: opts.horizontal_accuracy,
    heading: opts.heading,
    proximity_alert_radius: opts.proximity_alert_radius,
    reply_markup: opts.reply_markup,
  });
}

// ─── Venue ────────────────────────────────────────────────────────────────────

export async function sendVenue(
  token: string,
  chatId: number | string,
  venue: VenueData,
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'sendVenue', {
    chat_id: chatId,
    ...venue,
    ...commonOpts(opts),
  });
}

// ─── Contact ──────────────────────────────────────────────────────────────────

export async function sendContact(
  token: string,
  chatId: number | string,
  contact: ContactData,
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'sendContact', {
    chat_id: chatId,
    ...contact,
    ...commonOpts(opts),
  });
}

// ─── Poll ─────────────────────────────────────────────────────────────────────

/**
 * @param question
 * @param options       2–10 answer choices
 * @param opts.type                "regular" | "quiz"
 * @param opts.correct_option_id   required for quiz type
 * @param opts.open_period         seconds (5–600)
 * @param opts.close_date          unix timestamp
 */
export async function sendPoll(
  token: string,
  chatId: number | string,
  question: string,
  options: string[],
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'sendPoll', {
    chat_id: chatId,
    question,
    options,
    type: opts.type ?? 'regular',
    is_anonymous: opts.is_anonymous ?? true,
    allows_multiple_answers: opts.allows_multiple_answers,
    correct_option_id: opts.correct_option_id,
    explanation: opts.explanation,
    explanation_parse_mode: opts.explanation_parse_mode,
    open_period: opts.open_period,
    close_date: opts.close_date,
    is_closed: opts.is_closed,
    ...commonOpts(opts),
  });
}

// ─── Dice ─────────────────────────────────────────────────────────────────────

/** @param emoji – "🎲" | "🎯" | "🏀" | "⚽" | "🎳" | "🎰" (default 🎲) */
export async function sendDice(token: string, chatId: number | string, emoji = '🎲', opts: TelegramMessageOpts = {}) {
  return apiRequest(token, 'sendDice', {
    chat_id: chatId,
    emoji,
    ...commonOpts(opts),
  });
}

// ─── Chat Action (typing indicator) ──────────────────────────────────────────

/**
 * @param action – "typing" | "upload_photo" | "record_video" |
 *                 "upload_video" | "record_voice" | "upload_voice" |
 *                 "upload_document" | "choose_sticker" |
 *                 "find_location" | "record_video_note" |
 *                 "upload_video_note"
 */
export async function sendChatAction(
  token: string,
  chatId: number | string,
  action: string,
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'sendChatAction', {
    chat_id: chatId,
    action,
    message_thread_id: opts.message_thread_id,
  });
}

// ─── Forward & Copy ───────────────────────────────────────────────────────────

export async function forwardMessage(
  token: string,
  chatId: number | string,
  fromChatId: number | string,
  messageId: number,
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'forwardMessage', {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: messageId,
    disable_notification: opts.disable_notification,
    protect_content: opts.protect_content,
    message_thread_id: opts.message_thread_id,
  });
}

/** Copy without the forward header. */
export async function copyMessage(
  token: string,
  chatId: number | string,
  fromChatId: number | string,
  messageId: number,
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'copyMessage', {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: messageId,
    caption: opts.caption,
    parse_mode: opts.parse_mode,
    reply_markup: opts.reply_markup,
    disable_notification: opts.disable_notification,
    protect_content: opts.protect_content,
    reply_to_message_id: opts.reply_to_message_id,
  });
}

// ─── Edit & Delete ────────────────────────────────────────────────────────────

export async function editMessageText(
  token: string,
  chatId: number | string,
  messageId: number,
  text: string,
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: opts.parse_mode,
    entities: opts.entities,
    disable_web_page_preview: opts.disable_web_page_preview,
    reply_markup: opts.reply_markup,
  });
}

export async function editMessageCaption(
  token: string,
  chatId: number | string,
  messageId: number,
  caption: string,
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'editMessageCaption', {
    chat_id: chatId,
    message_id: messageId,
    caption,
    parse_mode: opts.parse_mode,
    reply_markup: opts.reply_markup,
  });
}

export async function editMessageReplyMarkup(
  token: string,
  chatId: number | string,
  messageId: number,
  replyMarkup: string,
) {
  return apiRequest(token, 'editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup,
  });
}

export async function deleteMessage(token: string, chatId: number | string, messageId: number) {
  return apiRequest(token, 'deleteMessage', { chat_id: chatId, message_id: messageId });
}

export async function pinMessage(
  token: string,
  chatId: number | string,
  messageId: number,
  opts: TelegramMessageOpts = {},
) {
  return apiRequest(token, 'pinChatMessage', {
    chat_id: chatId,
    message_id: messageId,
    disable_notification: opts.disable_notification,
  });
}

export async function unpinMessage(token: string, chatId: number | string, messageId: number) {
  return apiRequest(token, 'unpinChatMessage', { chat_id: chatId, message_id: messageId });
}
