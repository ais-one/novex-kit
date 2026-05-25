// SendGrid v3 Mail Send API — shared types
// Docs: https://docs.sendgrid.com/api-reference/mail-send/mail-send

// ─── Outbound ─────────────────────────────────────────────────────────────────

export interface SgEmailAddress {
  email: string;
  name?: string;
}

export interface SgAttachment {
  /** Base64-encoded file content */
  content: string;
  /** MIME type, e.g. "application/pdf" */
  type?: string;
  /** File name shown to recipient */
  filename: string;
  /** "attachment" (default) or "inline" for CID references in HTML body */
  disposition?: 'attachment' | 'inline';
  /** Content-ID for inline images — reference in HTML as <img src="cid:logo"> */
  content_id?: string;
}

export interface SgPersonalization {
  to: SgEmailAddress[];
  cc?: SgEmailAddress[];
  bcc?: SgEmailAddress[];
  from?: SgEmailAddress;
  subject?: string;
  headers?: Record<string, string>;
  dynamic_template_data?: Record<string, unknown>;
  custom_args?: Record<string, string>;
  send_at?: number;
}

export interface SgTrackingSettings {
  click_tracking?: { enable?: boolean; enable_text?: boolean };
  open_tracking?: { enable?: boolean; substitution_tag?: string };
  subscription_tracking?: { enable?: boolean; text?: string; html?: string };
  ganalytics?: {
    enable?: boolean;
    utm_source?: string;
    utm_medium?: string;
    utm_term?: string;
    utm_content?: string;
    utm_campaign?: string;
  };
}

export interface SgMailSettings {
  bypass_list_management?: { enable?: boolean };
  bypass_spam_management?: { enable?: boolean };
  bypass_bounce_management?: { enable?: boolean };
  bypass_unsubscribe_management?: { enable?: boolean };
  footer?: { enable?: boolean; text?: string; html?: string };
  sandbox_mode?: { enable?: boolean };
}

/** Options shared across all outbound email functions. */
export interface SendEmailOpts {
  /** Plain-text fallback shown by email clients that do not render HTML */
  plainContent?: string;
  /** Reply-to address */
  replyTo?: SgEmailAddress;
  /** CC recipients */
  cc?: SgEmailAddress[];
  /** BCC recipients */
  bcc?: SgEmailAddress[];
  /** Additional SMTP headers */
  headers?: Record<string, string>;
  /** Up to 10 category labels for analytics grouping */
  categories?: string[];
  /** Key/value pairs forwarded to the event webhook */
  customArgs?: Record<string, string>;
  /** Per-send tracking overrides */
  trackingSettings?: SgTrackingSettings;
  /** Per-send mail setting overrides */
  mailSettings?: SgMailSettings;
  /** Unix timestamp (seconds) — schedule delivery up to 72 hours in the future */
  sendAt?: number;
  /** Batch ID — groups sends for cancel/pause via cancelScheduledEmail */
  batchId?: string;
  /** Unsubscribe group ID (SendGrid Suppression Groups) */
  asmGroupId?: number;
}

/** Extends SendEmailOpts with file attachments support. */
export interface SgSendEmailOpts extends SendEmailOpts {
  attachments?: SgAttachment[];
}

// ─── Template Management ──────────────────────────────────────────────────────

export interface SgTemplateVersion {
  /** UUID of the version */
  id: string;
  /** Parent template ID (d-xxxx) */
  template_id: string;
  /** 1 = active (the version that gets sent), 0 = inactive draft */
  active: 0 | 1;
  /** Display name for this version */
  name: string;
  /** Email subject line */
  subject?: string;
  /** Full HTML body */
  html_content?: string;
  /** Plain-text fallback */
  plain_content?: string;
  /** Whether to auto-generate plain_content from html_content */
  generate_plain_content?: boolean;
  /** 'code' (raw HTML editor) or 'design' (drag-and-drop) */
  editor?: 'code' | 'design';
  updated_at?: string;
  thumbnail_url?: string;
}

export interface SgTemplate {
  /** Template ID — always starts with d- for dynamic templates */
  id: string;
  name: string;
  generation: 'legacy' | 'dynamic';
  updated_at?: string;
  versions?: SgTemplateVersion[];
}

/** Payload for creating or updating a template version. */
export interface SgTemplateVersionData {
  /** Display name for this version */
  name: string;
  /** Email subject line — supports Handlebars: {{subject}} */
  subject?: string;
  /** Full HTML body — supports Handlebars: {{name}} */
  html_content?: string;
  /** Plain-text fallback */
  plain_content?: string;
  /** Auto-generate plain content from HTML (default true) */
  generate_plain_content?: boolean;
  /** 1 = make this the active version immediately */
  active?: 0 | 1;
  /** Editor type used in the SendGrid dashboard UI */
  editor?: 'code' | 'design';
}

// ─── Inbound Parse ────────────────────────────────────────────────────────────

export interface SgInboundAttachment {
  /** Original filename */
  filename: string;
  /** MIME type (e.g. "application/pdf") */
  type: string;
  /** Content-ID for inline attachments */
  contentId?: string;
  /** Raw file content as Buffer (from multer/busboy) */
  content?: Buffer;
  /** File size in bytes */
  size?: number;
}

export interface SgInboundEmail {
  /** Sender address — e.g. "John Doe <john@example.com>" */
  from: string;
  /** Recipient address(es) — e.g. "inbound@parse.yourdomain.com" */
  to: string;
  /** CC addresses (if any) */
  cc: string;
  /** Email subject line */
  subject: string;
  /** Plain-text body */
  text: string;
  /** HTML body */
  html: string;
  /** Envelope JSON — { from: string, to: string[] } */
  envelope: { from: string; to: string[] };
  /** Full email headers as a single string */
  headers: string;
  /** Sender IP address */
  senderIp: string;
  /** SPF verification result (e.g. "pass", "fail", "softfail", "neutral", "none") */
  spf: string;
  /** DKIM verification result */
  dkim: string;
  /** Spam score (only present if "Check incoming emails for spam" is enabled in SendGrid) */
  spamScore: number | null;
  /** Spam report details (only present if spam checking is enabled) */
  spamReport: string | null;
  /** Number of attachments */
  attachmentCount: number;
  /** Parsed attachments */
  attachments: SgInboundAttachment[];
  /** Character set info (JSON string from SendGrid) */
  charsets: Record<string, string>;
}

// ─── Event Webhook ────────────────────────────────────────────────────────────

export type SgEventType =
  | 'processed'
  | 'dropped'
  | 'delivered'
  | 'deferred'
  | 'bounce'
  | 'open'
  | 'click'
  | 'spamreport'
  | 'unsubscribe'
  | 'group_unsubscribe'
  | 'group_resubscribe';

export interface SgEvent {
  /** Event type */
  event: SgEventType;
  /** Recipient email address */
  email: string;
  /** Unix timestamp (seconds) when the event occurred */
  timestamp: number;
  /** ISO 8601 date string (derived from timestamp) */
  date: string;
  /** SendGrid internal message ID */
  sgMessageId: string;
  /** Categories assigned to the original send */
  categories: string[];
  /** Custom args passed during send (for event correlation) */
  customArgs: Record<string, string>;

  // ── Bounce-specific fields ──
  /** Bounce reason (e.g. "550 5.1.1 The email account does not exist") */
  reason?: string;
  /** Bounce type: "bounce" (hard) or "blocked" (soft/policy) */
  bounceType?: string;
  /** SMTP status code (e.g. "550") */
  status?: string;

  // ── Click-specific fields ──
  /** The URL that was clicked */
  url?: string;

  // ── Open-specific fields ──
  /** User agent string of the email client */
  userAgent?: string;
  /** Whether this open was triggered by Apple Mail Privacy Protection (machine open) */
  sgMachineOpen?: boolean;

  // ── Drop-specific fields ──
  /** Why the email was dropped (e.g. "Bounced Address", "Invalid") */
  dropReason?: string;

  // ── Deferred-specific fields ──
  /** Number of delivery attempts so far */
  attempt?: number;
}
