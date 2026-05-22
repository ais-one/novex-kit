// SendGrid v3 Inbound Parse — webhook payload parser (email2)
// Docs: https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
//
// SendGrid Inbound Parse POSTs a multipart/form-data payload to your webhook URL
// whenever an email is received at your configured parse domain.
// This module normalises the raw fields into a clean typed structure.
//
// Note: Your Express app must use a multipart parser (e.g. multer, busboy, or
// express raw body) for the inbound route. The parsed fields arrive as req.body
// (text fields) and req.files (attachments).

import type { SgInboundAttachment, SgInboundEmail } from './types.ts';

export type { SgInboundAttachment, SgInboundEmail };

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse a SendGrid Inbound Parse webhook payload into a typed `SgInboundEmail`.
 *
 * Expects the body fields from a multipart/form-data POST (after middleware parsing).
 * Pass `req.body` as `fields` and `req.files` as `files`.
 *
 * @param fields - The text fields from the multipart form (req.body from multer/busboy)
 * @param files - The uploaded file attachments (req.files from multer, or an array of file objects)
 *
 * @example
 * // With multer middleware:
 * import multer from 'multer';
 * const upload = multer();
 * router.post('/inbound', upload.any(), (req, res) => {
 *   res.sendStatus(200);
 *   const email = parseInboundEmail(req.body, req.files);
 *   console.log(`From: ${email.from}, Subject: ${email.subject}`);
 * });
 */
export function parseInboundEmail(
  fields: Record<string, unknown>,
  files?: Array<{ fieldname?: string; originalname?: string; mimetype?: string; buffer?: Buffer; size?: number }>,
): SgInboundEmail {
  // Parse envelope (JSON string)
  let envelope: { from: string; to: string[] } = { from: '', to: [] };
  try {
    const raw = fields.envelope;
    if (typeof raw === 'string') {
      envelope = JSON.parse(raw);
    }
  } catch {
    /* ignore parse errors */
  }

  // Parse charsets (JSON string)
  let charsets: Record<string, string> = {};
  try {
    const raw = fields.charsets;
    if (typeof raw === 'string') {
      charsets = JSON.parse(raw);
    }
  } catch {
    /* ignore parse errors */
  }

  // Parse attachment-info (JSON string with metadata about each attachment)
  let attachmentInfo: Record<string, { filename?: string; type?: string; 'content-id'?: string }> = {};
  try {
    const raw = fields['attachment-info'];
    if (typeof raw === 'string') {
      attachmentInfo = JSON.parse(raw);
    }
  } catch {
    /* ignore parse errors */
  }

  // Parse spam score
  const spamScoreRaw = fields.spam_score;
  const spamScore = spamScoreRaw != null ? Number(spamScoreRaw) : null;

  // Build attachments array from files + attachment-info
  const attachments: SgInboundAttachment[] = [];
  const attachmentCount = Number(fields.attachments ?? 0);

  if (files && Array.isArray(files)) {
    for (const file of files) {
      const fieldname = file.fieldname ?? '';
      const info = attachmentInfo[fieldname] ?? {};
      attachments.push({
        filename: info.filename ?? file.originalname ?? fieldname,
        type: info.type ?? file.mimetype ?? 'application/octet-stream',
        contentId: info['content-id'] ?? undefined,
        content: file.buffer,
        size: file.size,
      });
    }
  }

  return {
    from: String(fields.from ?? ''),
    to: String(fields.to ?? ''),
    cc: String(fields.cc ?? ''),
    subject: String(fields.subject ?? ''),
    text: String(fields.text ?? ''),
    html: String(fields.html ?? ''),
    envelope,
    headers: String(fields.headers ?? ''),
    senderIp: String(fields.sender_ip ?? ''),
    spf: String(fields.SPF ?? ''),
    dkim: String(fields.dkim ?? ''),
    spamScore: Number.isNaN(spamScore) ? null : spamScore,
    spamReport: fields.spam_report ? String(fields.spam_report) : null,
    attachmentCount,
    attachments,
    charsets,
  };
}
