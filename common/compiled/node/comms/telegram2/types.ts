// ─── Telegram API raw object shapes (subset used by inbound parsing) ─────────

export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TgChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TgEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TgUser;
  language?: string;
}

export interface TgMessage {
  message_id: number;
  date: number;
  edit_date?: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
  caption?: string;
  photo?: Array<{ file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }>;
  video?: {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
  audio?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    performer?: string;
    title?: string;
    mime_type?: string;
    file_size?: number;
  };
  voice?: { file_id: string; file_unique_id: string; duration: number; mime_type?: string; file_size?: number };
  document?: { file_id: string; file_unique_id: string; file_name?: string; mime_type?: string; file_size?: number };
  sticker?: {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    is_animated: boolean;
    is_video: boolean;
    emoji?: string;
    set_name?: string;
  };
  location?: { latitude: number; longitude: number; horizontal_accuracy?: number; live_period?: number };
  contact?: { phone_number: string; first_name: string; last_name?: string; user_id?: number };
  poll?: {
    id: string;
    question: string;
    options: Array<{ text: string; voter_count: number }>;
    total_voter_count: number;
    is_closed: boolean;
    is_anonymous: boolean;
    type: string;
    correct_option_id?: number;
  };
  video_note?: { file_id: string; file_unique_id: string; length: number; duration: number; file_size?: number };
  entities?: TgEntity[];
  caption_entities?: TgEntity[];
  reply_to_message?: TgMessage;
  forward_date?: number;
  forward_from?: TgUser;
  forward_from_chat?: TgChat;
  forward_from_message_id?: number;
  forward_sender_name?: string;
  media_group_id?: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  edited_message?: TgMessage;
  channel_post?: TgMessage;
  edited_channel_post?: TgMessage;
  inline_query?: { id: string; from: TgUser; query: string; offset: string };
  callback_query?: { id: string; from: TgUser; message?: TgMessage; data?: string; game_short_name?: string };
  my_chat_member?: {
    chat: TgChat;
    from: TgUser;
    date: number;
    old_chat_member: { status: string };
    new_chat_member: { status: string };
  };
  chat_member?: {
    chat: TgChat;
    from: TgUser;
    date: number;
    old_chat_member: { status: string };
    new_chat_member: { status: string };
  };
}

// ─── Outbound message option types ────────────────────────────────────────────

export interface TelegramMessageOpts {
  parse_mode?: string;
  caption?: string;
  caption_parse_mode?: string;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  reply_markup?: string;
  disable_notification?: boolean;
  protect_content?: boolean;
  message_thread_id?: number;
  business_connection_id?: string;
  has_spoiler?: boolean;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  supports_streaming?: boolean;
  performer?: string;
  title?: string;
  disable_content_type_detection?: boolean;
  length?: number;
  emoji?: string;
  disable_web_page_preview?: boolean;
  entities?: unknown[];
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
  type?: string;
  is_anonymous?: boolean;
  allows_multiple_answers?: boolean;
  correct_option_id?: number;
  explanation?: string;
  explanation_parse_mode?: string;
  open_period?: number;
  close_date?: number;
  is_closed?: boolean;
}

export interface MediaGroupItem {
  type: string;
  file: string;
  caption?: string;
  parse_mode?: string;
  has_spoiler?: boolean;
}

export interface VenueData {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
}

export interface ContactData {
  phone_number: string;
  first_name: string;
  last_name?: string;
  vcard?: string;
}

// // TODO: Need to be defined
// data shape (updateType === message):
// {
//   messageId: number,
//   date: string,           // ISO 8601
//   editedDate: string | null,
//   from: { id: number, isBot: boolean, firstName: string, lastName: string | null, username: string | null, languageCode: string | null } | null,
//   chat: { id: number, type: string, title: string | null, username: string | null, firstName: string | null, lastName: string | null } | null,
//   content:
//     | { type: 'text', text: string }
//     | { type: 'photo', fileId, fileUniqueId, width, height, fileSize: number | null, caption: string | null }
//     | { type: 'video', fileId, fileUniqueId, width, height, duration, mimeType: string | null, fileSize: number | null, caption: string | null }
//     | { type: 'audio', fileId, fileUniqueId, duration, performer: string | null, title: string | null, mimeType: string | null, fileSize: number | null, caption: string | null }
//     | { type: 'voice', fileId, fileUniqueId, duration, mimeType: string | null, fileSize: number | null }
//     | { type: 'document', fileId, fileUniqueId, fileName: string | null, mimeType: string | null, fileSize: number | null, caption: string | null }
//     | { type: 'sticker', fileId, fileUniqueId, width, height, isAnimated, isVideo, emoji: string | null, setName: string | null }
//     | { type: 'location', latitude, longitude, horizontalAccuracy: number | null, livePeriod: number | null }
//     | { type: 'contact', phoneNumber, firstName, lastName: string | null, userId: number | null }
//     | { type: 'poll', id, question, options: { text, voterCount }[], totalVoterCount, isClosed, isAnonymous, pollType, correctOptionId: number | null }
//     | { type: 'video_note', fileId, fileUniqueId, length, duration, fileSize: number | null }
//     | { type: 'unknown' },
//   replyTo: <same shape> | null,
//   forwardFrom: { date: string, fromUser, fromChat, fromMessageId: number | null, senderName: string | null } | null,
//   entities: { type, offset, length, value, url: string | null, user, language: string | null }[],
//   mediaGroupId: string | null,
// }
