// WhatsApp Cloud API — shared types
// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api

// ─── Outbound ─────────────────────────────────────────────────────────────────

/** Media supplied either by an uploaded media ID or a public URL. */
export type WaMediaInput = { id: string } | { link: string };

/** Common options available on every outbound message. */
export interface WaMessageOpts {
  /** Reply to a specific message by its wamid. */
  replyTo?: string;
}

export interface WaTextOpts extends WaMessageOpts {
  /** Attempt to render a link preview for the first URL in the text body. */
  preview_url?: boolean;
}

export interface WaMediaOpts extends WaMessageOpts {
  /** Caption shown below the media (not supported for audio/sticker). */
  caption?: string;
}

export interface WaDocumentOpts extends WaMediaOpts {
  /** File name shown in the chat. */
  filename?: string;
}

export interface WaLocation {
  latitude: number;
  longitude: number;
  /** Place name shown above the pin. */
  name?: string;
  /** Address shown below the name. */
  address?: string;
}

export interface WaContact {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
  };
  phones?: Array<{ phone: string; type?: string; wa_id?: string }>;
  emails?: Array<{ email: string; type?: string }>;
  /** YYYY-MM-DD */
  birthday?: string;
  org?: { company?: string; department?: string; title?: string };
  urls?: Array<{ url: string; type?: string }>;
}

export interface WaButtonsOpts extends WaMessageOpts {
  /** Main message text (required). */
  body: string;
  /** Up to 3 buttons. Each tap sends a `button` webhook with the button id. */
  buttons: Array<{ id: string; title: string }>;
  /** Optional text header above the body. */
  header?: string;
  /** Optional grey footer below the buttons. */
  footer?: string;
}

export interface WaListOpts extends WaMessageOpts {
  /** Main message text (required). */
  body: string;
  /** Label on the button that opens the list. */
  button: string;
  /** Sections of rows. Max 10 rows total across all sections. */
  sections: Array<{
    title?: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
  /** Optional text header. */
  header?: string;
  /** Optional grey footer. */
  footer?: string;
}

export interface WaTemplateOpts {
  /** Template name as approved in Meta Business Manager. */
  name: string;
  /** BCP 47 language code, e.g. "en_US". */
  language: string;
  /** Variable components for header/body/button substitutions. */
  components?: unknown[];
}

export interface WaCtaUrlOpts extends WaMessageOpts {
  /** Main message text (required). */
  body: string;
  /** Optional text header above the body. */
  header?: string;
  /** Optional grey footer below the button. */
  footer?: string;
  /** Label on the CTA button (max 20 chars). */
  displayText: string;
  /** URL to open when the button is tapped. */
  url: string;
}

export interface WaAddressRequestOpts extends WaMessageOpts {
  /** Message body text asking the user for their address (required). */
  body: string;
  /** Optional grey footer. */
  footer?: string;
  /**
   * ISO 3166-1 alpha-2 country code.
   * Currently only India ('IN') and Saudi Arabia ('SA') are supported by Meta.
   */
  country: string;
}

export interface WaFlowOpts extends WaMessageOpts {
  /** Main message text (required). */
  body: string;
  /** Optional text header. */
  header?: string;
  /** Optional grey footer. */
  footer?: string;
  /** Flow ID from the WhatsApp Flows Builder. */
  flowId: string;
  /** Unique token for this flow session — store it to track completion. */
  flowToken: string;
  /** Label on the button that opens the flow (max 20 chars). */
  flowCta: string;
  /** 'navigate' opens a screen directly; 'data_exchange' triggers a server call first. */
  flowAction?: 'navigate' | 'data_exchange';
  /** Required when flowAction is 'navigate' — the screen ID to open. */
  screen?: string;
  /** Extra payload merged into the flow's first screen data. */
  flowActionPayload?: Record<string, unknown>;
  /**
   * 'published' (default) sends the latest published version.
   * 'draft' sends the current draft — useful for testing before publishing.
   */
  mode?: 'published' | 'draft';
}

// ─── Inbound ──────────────────────────────────────────────────────────────────

export interface WaInboundText {
  type: 'text';
  body: string;
}

export interface WaInboundMedia {
  type: 'image' | 'audio' | 'video' | 'document' | 'sticker';
  id: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
  filename?: string;
}

export interface WaInboundLocation {
  type: 'location';
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface WaInboundReaction {
  type: 'reaction';
  message_id: string;
  emoji: string;
}

export interface WaInboundContacts {
  type: 'contacts';
  contacts: unknown[];
}

export interface WaInboundButton {
  type: 'button';
  /** The button id from your sendButtons() call. */
  payload: string;
  text: string;
}

export interface WaInboundInteractive {
  type: 'interactive';
  /** 'button_reply' for reply-button taps, 'list_reply' for list selections. */
  interactive_type: 'button_reply' | 'list_reply';
  id: string;
  title: string;
  description?: string;
}

export type WaInboundContent =
  | WaInboundText
  | WaInboundMedia
  | WaInboundLocation
  | WaInboundReaction
  | WaInboundContacts
  | WaInboundButton
  | WaInboundInteractive
  | { type: string };

export interface WaParsedMessage {
  messageId: string;
  /** Sender phone number (no "+" prefix, e.g. "60123456789"). */
  from: string;
  /** Receiving phone number ID (the business number). */
  phoneNumberId: string;
  timestamp: string;
  content: WaInboundContent;
  /** Sender display name, if provided in the contacts array. */
  name?: string;
  /** If this was a reply, the wamid of the original message. */
  replyTo?: string;
}

export interface WaDeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipientId: string;
}

export interface WaParsedWebhook {
  businessAccountId: string;
  phoneNumberId: string;
  messages: WaParsedMessage[];
  statuses: WaDeliveryStatus[];
}
