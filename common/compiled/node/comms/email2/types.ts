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
