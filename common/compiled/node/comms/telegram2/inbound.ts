import { apiRequest } from './outbound.ts';
import type { SetWebhookOpts, TgMessage, TgUpdate } from './types.ts';

// ─── Extractors ───────────────────────────────────────────────────────────────

const extractMessageData = (message: TgMessage) => {
  if (!message) return null;

  return {
    messageId: message.message_id,
    date: new Date(message.date * 1000).toISOString(),
    editedDate: message.edit_date ? new Date(message.edit_date * 1000).toISOString() : null,

    from: message.from
      ? {
          id: message.from.id,
          isBot: message.from.is_bot,
          firstName: message.from.first_name,
          lastName: message.from.last_name ?? null,
          username: message.from.username ?? null,
          languageCode: message.from.language_code ?? null,
        }
      : null,

    chat: message.chat
      ? {
          id: message.chat.id,
          type: message.chat.type,
          title: message.chat.title ?? null,
          username: message.chat.username ?? null,
          firstName: message.chat.first_name ?? null,
          lastName: message.chat.last_name ?? null,
        }
      : null,

    content: extractContent(message),
    replyTo: message.reply_to_message ? extractMessageData(message.reply_to_message) : null,
    forwardFrom: extractForwardInfo(message),
    entities: extractEntities(message),
    mediaGroupId: message.media_group_id ?? null,
  };
};

const extractContent = (message: TgMessage) => {
  if (message.text) return { type: 'text', text: message.text };

  if (message.photo) {
    const best = message.photo[message.photo.length - 1];
    return {
      type: 'photo',
      fileId: best.file_id,
      fileUniqueId: best.file_unique_id,
      width: best.width,
      height: best.height,
      fileSize: best.file_size ?? null,
      caption: message.caption ?? null,
    };
  }

  if (message.video) {
    const v = message.video;
    return {
      type: 'video',
      fileId: v.file_id,
      fileUniqueId: v.file_unique_id,
      width: v.width,
      height: v.height,
      duration: v.duration,
      mimeType: v.mime_type ?? null,
      fileSize: v.file_size ?? null,
      caption: message.caption ?? null,
    };
  }

  if (message.audio) {
    const a = message.audio;
    return {
      type: 'audio',
      fileId: a.file_id,
      fileUniqueId: a.file_unique_id,
      duration: a.duration,
      performer: a.performer ?? null,
      title: a.title ?? null,
      mimeType: a.mime_type ?? null,
      fileSize: a.file_size ?? null,
      caption: message.caption ?? null,
    };
  }

  if (message.voice) {
    const v = message.voice;
    return {
      type: 'voice',
      fileId: v.file_id,
      fileUniqueId: v.file_unique_id,
      duration: v.duration,
      mimeType: v.mime_type ?? null,
      fileSize: v.file_size ?? null,
    };
  }

  if (message.document) {
    const d = message.document;
    return {
      type: 'document',
      fileId: d.file_id,
      fileUniqueId: d.file_unique_id,
      fileName: d.file_name ?? null,
      mimeType: d.mime_type ?? null,
      fileSize: d.file_size ?? null,
      caption: message.caption ?? null,
    };
  }

  if (message.sticker) {
    const s = message.sticker;
    return {
      type: 'sticker',
      fileId: s.file_id,
      fileUniqueId: s.file_unique_id,
      width: s.width,
      height: s.height,
      isAnimated: s.is_animated,
      isVideo: s.is_video,
      emoji: s.emoji ?? null,
      setName: s.set_name ?? null,
    };
  }

  if (message.location) {
    return {
      type: 'location',
      latitude: message.location.latitude,
      longitude: message.location.longitude,
      horizontalAccuracy: message.location.horizontal_accuracy ?? null,
      livePeriod: message.location.live_period ?? null,
    };
  }

  if (message.contact) {
    const c = message.contact;
    return {
      type: 'contact',
      phoneNumber: c.phone_number,
      firstName: c.first_name,
      lastName: c.last_name ?? null,
      userId: c.user_id ?? null,
    };
  }

  if (message.poll) {
    const p = message.poll;
    return {
      type: 'poll',
      id: p.id,
      question: p.question,
      options: p.options.map(o => ({ text: o.text, voterCount: o.voter_count })),
      totalVoterCount: p.total_voter_count,
      isClosed: p.is_closed,
      isAnonymous: p.is_anonymous,
      pollType: p.type,
      correctOptionId: p.correct_option_id ?? null,
    };
  }

  if (message.video_note) {
    const vn = message.video_note;
    return {
      type: 'video_note',
      fileId: vn.file_id,
      fileUniqueId: vn.file_unique_id,
      length: vn.length,
      duration: vn.duration,
      fileSize: vn.file_size ?? null,
    };
  }

  return { type: 'unknown' };
};

const extractEntities = (message: TgMessage) => {
  const raw = message.entities ?? message.caption_entities ?? [];
  if (!raw.length) return [];

  const text = message.text ?? message.caption ?? '';

  return raw.map(e => ({
    type: e.type,
    offset: e.offset,
    length: e.length,
    value: text.slice(e.offset, e.offset + e.length),
    url: e.url ?? null,
    user: e.user ?? null,
    language: e.language ?? null,
  }));
};

const extractForwardInfo = (message: TgMessage) => {
  if (!message.forward_date) return null;
  return {
    date: new Date(message.forward_date * 1000).toISOString(),
    fromUser: message.forward_from ?? null,
    fromChat: message.forward_from_chat ?? null,
    fromMessageId: message.forward_from_message_id ?? null,
    senderName: message.forward_sender_name ?? null,
  };
};

// ─── Update dispatcher ────────────────────────────────────────────────────────

/**
 * Parse an incoming Telegram webhook update into a typed, normalized shape.
 * Pass `req.body` directly — the raw Telegram Update object.
 *
 * @returns `{ updateType, data }` where `updateType` identifies the event kind.
 */
export const handleUpdate = (update: TgUpdate) => {
  const message = update.message ?? update.edited_message;
  if (message) return { updateType: 'message', data: extractMessageData(message) };

  const post = update.channel_post ?? update.edited_channel_post;
  if (post) return { updateType: 'channel_post', data: extractMessageData(post) };

  if (update.inline_query) {
    return {
      updateType: 'inline_query',
      data: {
        id: update.inline_query.id,
        from: update.inline_query.from,
        query: update.inline_query.query,
        offset: update.inline_query.offset,
      },
    };
  }

  if (update.callback_query) {
    const cq = update.callback_query;
    return {
      updateType: 'callback_query',
      data: {
        id: cq.id,
        from: cq.from,
        message: cq.message ? extractMessageData(cq.message) : null,
        data: cq.data ?? null,
        gameShortName: cq.game_short_name ?? null,
      },
    };
  }

  if (update.my_chat_member || update.chat_member) {
    const cm = update.my_chat_member ?? update.chat_member;
    if (!cm) return { updateType: 'unknown', data: update };
    return {
      updateType: update.my_chat_member ? 'my_chat_member' : 'chat_member',
      data: {
        chat: cm.chat,
        from: cm.from,
        date: new Date(cm.date * 1000).toISOString(),
        oldStatus: cm.old_chat_member?.status,
        newStatus: cm.new_chat_member?.status,
      },
    };
  }

  return { updateType: 'unknown', data: update };
};

// ─── Webhook Management ───────────────────────────────────────────────────────

/**
 * Register a webhook URL for a Telegram bot.
 * Telegram will send updates to this URL as POST requests.
 *
 * @param botToken - The bot's API token
 * @param url - HTTPS URL to send updates to (must be valid, publicly accessible)
 * @param secretToken - Secret token for X-Telegram-Bot-Api-Secret-Token header verification (1-256 chars, A-Za-z0-9_-)
 * @param opts - Additional webhook configuration options
 * @returns true if webhook was set successfully
 */
export async function setWebhook(
  botToken: string,
  url: string,
  secretToken: string,
  opts: SetWebhookOpts = {},
): Promise<boolean> {
  const params: Record<string, unknown> = {
    url,
    secret_token: secretToken,
    max_connections: opts.maxConnections ?? 40,
  };
  if (opts.allowedUpdates) params.allowed_updates = opts.allowedUpdates;
  if (opts.ipAddress) params.ip_address = opts.ipAddress;
  if (opts.dropPendingUpdates) params.drop_pending_updates = true;

  await apiRequest(botToken, 'setWebhook', params);
  return true;
}

/**
 * Remove the current webhook integration for a bot.
 *
 * @param botToken - The bot's API token
 * @param dropPendingUpdates - Pass true to drop all pending updates
 * @returns true if webhook was deleted successfully
 */
export async function deleteWebhook(botToken: string, dropPendingUpdates = false): Promise<boolean> {
  await apiRequest(botToken, 'deleteWebhook', { drop_pending_updates: dropPendingUpdates });
  return true;
}

/**
 * Get current webhook status for a bot.
 * Useful for debugging and displaying webhook info in the UI.
 */
export async function getWebhookInfo(botToken: string): Promise<Record<string, unknown>> {
  return apiRequest(botToken, 'getWebhookInfo') as Promise<Record<string, unknown>>;
}
