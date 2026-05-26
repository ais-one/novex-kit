// Multi-tenant communications — shared types

/** Supported communication channels */
export type CommsChannel = 'telegram' | 'email' | 'whatsapp' | 'sms';

/** Supported providers per channel */
export type CommsProvider = 'telegram' | 'sendgrid' | 'meta' | 'nexmo';

/** Decrypted credentials + sender identity for a tenant's channel */
export interface TenantCommsConfig {
  id: number;
  tenantId: number;
  label: string;
  channel: CommsChannel;
  provider: CommsProvider;
  credentials: Record<string, string>;
  senderIdentity: Record<string, string>;
  isActive: boolean;
}

export interface TelegramCredentials {
  bot_token: string;
}
export interface SendGridCredentials {
  api_key: string;
}
export interface WhatsAppCredentials {
  token: string;
}

export interface TelegramSenderIdentity {
  bot_name?: string;
}
export interface SendGridSenderIdentity {
  sender_name: string;
  sender_email: string;
}
export interface WhatsAppSenderIdentity {
  phone_number_id: string;
  business_account_id: string;
}
