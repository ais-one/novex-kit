// Multi-tenant communications — credential encryption/decryption

import { decryptWithPassword, encryptWithPassword } from '../../utils/aes.ts';

function getPassword(): string {
  const password = process.env.COMMS_ENCRYPTION_KEY;
  if (!password) throw new Error('COMMS_ENCRYPTION_KEY environment variable is not set');
  return password;
}

/**
 * Encrypt a credentials object for storage in DB.
 * Returns a string in format: base64(iv):base64(ciphertext)
 */
export function encryptCredentials(credentials: Record<string, string>): string {
  return encryptWithPassword(JSON.stringify(credentials), getPassword());
}

/**
 * Decrypt a credentials string from DB back to an object.
 * Expects format: base64(iv):base64(ciphertext)
 */
export function decryptCredentials(encrypted: string): Record<string, string> {
  return JSON.parse(decryptWithPassword(encrypted, getPassword()));
}
