// Multi-tenant communications — credential encryption/decryption

import { decryptText, encryptText, genIv, genKey } from '../../utils/aes.ts';

const ALG = 'aes-256-cbc';

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
  const password = getPassword();
  const key = genKey(ALG, password);
  const iv = genIv();
  const plaintext = JSON.stringify(credentials);
  const ciphertext = encryptText(ALG, key, iv, plaintext);
  const ivBase64 = iv.toString('base64');
  return `${ivBase64}:${ciphertext}`;
}

/**
 * Decrypt a credentials string from DB back to an object.
 * Expects format: base64(iv):base64(ciphertext)
 */
export function decryptCredentials(encrypted: string): Record<string, string> {
  const password = getPassword();
  const key = genKey(ALG, password);
  const [ivBase64, ciphertext] = encrypted.split(':');
  if (!ivBase64 || !ciphertext)
    throw new Error('Invalid encrypted credentials format. Expected base64(iv):base64(ciphertext)');
  const iv = Buffer.from(ivBase64, 'base64');
  const plaintext = decryptText(ALG, key, iv, ciphertext);
  return JSON.parse(plaintext);
}
