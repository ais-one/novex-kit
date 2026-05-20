// WhatsApp Cloud API — simple text message helper
// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/text-messages
//
// Setup:
//   WHATSAPP_TOKEN         — permanent system user access token (from Meta Business Settings > System Users)
//   WHATSAPP_PHONE_NUMBER_ID — phone number ID from the API Setup panel in Meta App Dashboard

const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = process.env;

const BASE_URL = () => `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

/**
 * Send a text message to a WhatsApp user via the Cloud API.
 *
 * @param text - Message text to send (max 4096 characters).
 * @param to   - Recipient phone number with country code, e.g. "+60123456789".
 */
export const sendMsg = async (text: string, to: string): Promise<Response | { err: string }> => {
  try {
    const result = await fetch(BASE_URL(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      }),
    });

    return result
  } catch (e) {
    return { err: String(e) };
  }
};
