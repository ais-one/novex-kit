// Unified comms service — send dispatcher
// Resolves credentials and dispatches to the correct channel library.

import {
  sendDynamicEmail,
  sendEmail,
  sendEmailWithAttachments,
  sendScheduledDynamicEmail,
  sendScheduledEmail,
} from '../sendgrid/outbound.ts';
import type { SendGridAuth } from '../sendgrid/types.ts';
import {
  sendAnimation,
  sendAudio,
  sendContact,
  sendDice,
  sendDocument,
  sendLocation,
  sendMessage,
  sendPhoto,
  sendPoll,
  sendSticker,
  sendVenue,
  sendVideo,
  sendVideoNote,
  sendVoice,
} from '../telegram2/outbound.ts';
import { configure, isConfigured, resolveCommsCredentials, setup } from '../tenant/resolver.ts';
import {
  sendAddressRequest,
  sendButtons,
  sendContacts,
  sendCtaUrlButton,
  sendFlow,
  sendImage,
  sendList,
  sendTemplate,
  sendText,
  sendAudio as waSendAudio,
  sendDocument as waSendDoc,
  sendLocation as waSendLocation,
  sendSticker as waSendSticker,
  sendVideo as waSendVideo,
} from '../whatsapp2/outbound.ts';
import type { SendRequest, SendResult } from './types.ts';

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * Initialize the comms service module. Call once at app startup.
 * This replaces the need to call configure() + setup() on the tenant resolver directly.
 *
 * @example
 * import { init } from '@common/node/comms/service/send'
 * import { tenantCommsConfig } from './database/schema-iam.ts'
 * import * as services from '@common/node/services'
 *
 * init({ table: tenantCommsConfig, serviceName: 'drizzle1', lookup: services.get })
 */
export function init(opts: { table: unknown; serviceName?: string; lookup: (name: string) => unknown }) {
  configure({ tenantCommsConfig: opts.table });
  setup(opts.serviceName ?? 'drizzle1', opts.lookup);
}

// ─── Send ─────────────────────────────────────────────────────────────────────

/**
 * Unified send function — resolves credentials and dispatches to the correct channel.
 * Covers sending NEW messages to a single recipient. For multi-recipient, use broadcast().
 *
 * @example
 * import { send } from '@common/node/comms/service/send'
 *
 * await send({ tenantId: 1, channel: 'telegram', to: '12345', type: 'text', payload: { text: 'Hi' } })
 * await send({ tenantId: 1, channel: 'whatsapp', to: '+60123', type: 'text', payload: { text: 'Hi' } })
 * await send({ tenantId: 1, channel: 'email', to: 'a@b.com', type: 'html', payload: { subject: 'Hi', html: '<p>Hi</p>' } })
 */
export async function send(req: SendRequest): Promise<SendResult> {
  if (!isConfigured()) {
    throw new Error(
      'Comms service not initialized. Call init() once in your app.ts:\n\n' +
        "  import { init } from '@common/node/comms/service/send'\n" +
        "  import { tenantCommsConfig } from './database/schema-iam.ts'\n" +
        "  import * as services from '@common/node/services'\n\n" +
        "  init({ table: tenantCommsConfig, serviceName: 'drizzle1', lookup: services.get })\n",
    );
  }

  const config = await resolveCommsCredentials(req.tenantId, req.channel, req.configLabel);

  switch (req.channel) {
    case 'telegram':
      return sendTelegram(config.credentials.bot_token, req);
    case 'whatsapp':
      return sendWhatsApp(config.credentials, config.senderIdentity, req);
    case 'email':
      return sendSendGrid(config.credentials, config.senderIdentity, req);
    default:
      return { success: false, channel: req.channel, error: `Unsupported channel: ${req.channel}` };
  }
}

// ─── Telegram Dispatcher ──────────────────────────────────────────────────────

async function sendTelegram(token: string, req: SendRequest): Promise<SendResult> {
  const { to, type, payload } = req;
  let result: any;
  // The payload itself serves as opts (parse_mode, caption, reply_markup, etc. are top-level fields)
  const opts = payload.opts ?? payload;

  try {
    switch (type) {
      case 'text':
        result = await sendMessage(token, to, String(payload.text ?? ''), opts);
        break;
      case 'photo':
        result = await sendPhoto(token, to, String(payload.photo ?? ''), opts);
        break;
      case 'video':
        result = await sendVideo(token, to, String(payload.video ?? ''), opts);
        break;
      case 'audio':
        result = await sendAudio(token, to, String(payload.audio ?? ''), opts);
        break;
      case 'document':
        result = await sendDocument(token, to, String(payload.document ?? ''), opts);
        break;
      case 'voice':
        result = await sendVoice(token, to, String(payload.voice ?? ''), opts);
        break;
      case 'video_note':
        result = await sendVideoNote(token, to, String(payload.video_note ?? payload.videoNote ?? ''), opts);
        break;
      case 'sticker':
        result = await sendSticker(token, to, String(payload.sticker ?? ''), opts);
        break;
      case 'animation':
        result = await sendAnimation(token, to, String(payload.animation ?? ''), opts);
        break;
      case 'location':
        result = await sendLocation(token, to, Number(payload.latitude), Number(payload.longitude), opts);
        break;
      case 'venue':
        result = await sendVenue(token, to, payload.venue, opts);
        break;
      case 'contact':
        result = await sendContact(token, to, payload.contact, opts);
        break;
      case 'poll':
        result = await sendPoll(token, to, String(payload.question ?? ''), payload.options ?? [], opts);
        break;
      case 'dice':
        result = await sendDice(token, to, typeof payload.emoji === 'string' ? payload.emoji : '🎲', opts);
        break;
      default:
        return { success: false, channel: 'telegram', error: `Unsupported telegram type: ${type}` };
    }

    return { success: true, channel: 'telegram', messageId: String(result?.message_id ?? '') };
  } catch (err: any) {
    return { success: false, channel: 'telegram', error: err.message ?? String(err) };
  }
}

// ─── WhatsApp Dispatcher ──────────────────────────────────────────────────────

async function sendWhatsApp(
  credentials: Record<string, string>,
  identity: Record<string, string>,
  req: SendRequest,
): Promise<SendResult> {
  const { to, type, payload } = req;
  const token = credentials.token;
  const phoneNumberId = identity.phone_number_id;
  let result: any;

  try {
    switch (type) {
      case 'text':
        // Accept both { text: "..." } and { body: "..." } (test page sends body)
        result = await sendText(token, phoneNumberId, to, String(payload.text ?? payload.body ?? ''), payload.opts);
        break;
      case 'image':
      case 'audio':
      case 'video':
      case 'sticker':
      case 'document': {
        // Accept both { media: { id/link } } and flat { id, link } (test page sends flat)
        const media = payload.media ?? (payload.id ? { id: payload.id } : payload.link ? { link: payload.link } : {});
        const mediaOpts = payload.opts ?? {};
        if (payload.caption) mediaOpts.caption = payload.caption;
        if (payload.filename) mediaOpts.filename = payload.filename;
        switch (type) {
          case 'image':
            result = await sendImage(token, phoneNumberId, to, media, mediaOpts);
            break;
          case 'audio':
            result = await waSendAudio(token, phoneNumberId, to, media, mediaOpts);
            break;
          case 'video':
            result = await waSendVideo(token, phoneNumberId, to, media, mediaOpts);
            break;
          case 'sticker':
            result = await waSendSticker(token, phoneNumberId, to, media, mediaOpts);
            break;
          case 'document':
            result = await waSendDoc(token, phoneNumberId, to, media, mediaOpts);
            break;
        }
        break;
      }
      case 'location':
        // Accept both { location: { latitude, longitude } } and flat { latitude, longitude }
        result = await waSendLocation(
          token,
          phoneNumberId,
          to,
          payload.location ?? {
            latitude: Number(payload.latitude),
            longitude: Number(payload.longitude),
            name: payload.name,
            address: payload.address,
          },
          payload.opts,
        );
        break;
      case 'contacts':
        result = await sendContacts(token, phoneNumberId, to, payload.contacts, payload.opts);
        break;
      case 'template':
        // Accept both { opts: { name, language, components } } and flat { name, language, components }
        result = await sendTemplate(token, phoneNumberId, to, payload.opts ?? payload);
        break;
      case 'buttons':
        result = await sendButtons(token, phoneNumberId, to, payload.opts ?? payload);
        break;
      case 'list':
        result = await sendList(token, phoneNumberId, to, payload.opts ?? payload);
        break;
      case 'cta_url':
        result = await sendCtaUrlButton(token, phoneNumberId, to, payload.opts ?? payload);
        break;
      case 'address_request':
        result = await sendAddressRequest(token, phoneNumberId, to, payload.opts ?? payload);
        break;
      case 'flow':
        result = await sendFlow(token, phoneNumberId, to, payload.opts ?? payload);
        break;
      default:
        return { success: false, channel: 'whatsapp', error: `Unsupported whatsapp type: ${type}` };
    }

    return { success: true, channel: 'whatsapp', messageId: result?.messages?.[0]?.id ?? '' };
  } catch (err: any) {
    return { success: false, channel: 'whatsapp', error: err.message ?? String(err) };
  }
}

// ─── Email (SendGrid) Dispatcher ──────────────────────────────────────────────

async function sendSendGrid(
  credentials: Record<string, string>,
  identity: Record<string, string>,
  req: SendRequest,
): Promise<SendResult> {
  const { to, type, payload } = req;
  const auth: SendGridAuth = {
    apiKey: credentials.api_key,
    senderName: identity.sender_name,
    senderEmail: identity.sender_email,
  };

  try {
    switch (type) {
      case 'html':
        await sendEmail(auth, to, payload.subject, payload.html, payload.opts);
        break;
      case 'dynamic':
        await sendDynamicEmail(auth, to, payload.templateId, payload.dynamicData, payload.opts);
        break;
      case 'html_attachments':
        await sendEmailWithAttachments(auth, to, payload.subject, payload.html, payload.attachments, payload.opts);
        break;
      case 'scheduled':
        await sendScheduledEmail(auth, to, payload.subject, payload.html, payload.sendAt, payload.opts);
        break;
      case 'scheduled_dynamic':
        await sendScheduledDynamicEmail(
          auth,
          to,
          payload.templateId,
          payload.dynamicData,
          payload.sendAt,
          payload.opts,
        );
        break;
      default:
        return { success: false, channel: 'email', error: `Unsupported email type: ${type}` };
    }

    return { success: true, channel: 'email' };
  } catch (err: any) {
    return { success: false, channel: 'email', error: err.message ?? String(err) };
  }
}
