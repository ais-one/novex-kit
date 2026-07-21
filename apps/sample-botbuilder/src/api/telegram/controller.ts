import { getWebhookInfo, setWebhook } from '@common/node/comms/telegram2/inbound';
import { handleWebhook } from './service.ts';

export async function processWebhook(body: Record<string, unknown>) {
  await handleWebhook(body);
}

export async function registerWebhook(baseUrl: string, botToken: string) {
  const webhookUrl = `${baseUrl}/api/sample-botbuilder/telegram/webhook`;
  const result = await setWebhook(botToken, webhookUrl, 'botbuilder-secret');
  return { url: webhookUrl, result };
}

export async function fetchWebhookInfo(botToken: string) {
  return getWebhookInfo(botToken);
}
