import crypto from 'node:crypto';

const DEFAULT_ENCODING = 'base64';

/**
 * Encrypt a UTF-8 string using the given cipher algorithm, key, and IV.
 *
 * @param alg - Cipher algorithm, e.g. `'aes-256-cbc'`.
 * @param key - Encryption key (Buffer or hex string, length depends on algorithm).
 * @param iv - Initialisation vector (Buffer or hex string).
 * @param text - Plaintext to encrypt.
 * @param encoding - Output encoding. Defaults to `'base64'`.
 */
export const encryptText = (
  alg: string,
  key: crypto.CipherKey,
  iv: crypto.BinaryLike,
  text: string,
  encoding: BufferEncoding = DEFAULT_ENCODING,
): string => {
  const cipher = crypto.createCipheriv(alg, key, iv);
  return cipher.update(text, 'utf8', encoding) + cipher.final(encoding);
};

/**
 * Decrypt a ciphertext string using the given cipher algorithm, key, and IV.
 *
 * @param alg - Cipher algorithm, e.g. `'aes-256-cbc'`.
 * @param key - Decryption key (Buffer or hex string).
 * @param iv - Initialisation vector (Buffer or hex string).
 * @param text - Ciphertext to decrypt.
 * @param encoding - Input encoding of the ciphertext. Defaults to `'base64'`.
 */
export const decryptText = (
  alg: string,
  key: crypto.CipherKey,
  iv: crypto.BinaryLike,
  text: string,
  encoding: BufferEncoding = DEFAULT_ENCODING,
): string => {
  const decipher = crypto.createDecipheriv(alg, key, iv);
  return decipher.update(text, encoding, 'utf8') + decipher.final('utf8');
};

/** Generate a random 16-byte initialisation vector. */
export const genIv = (): Buffer => crypto.randomBytes(16);

/**
 * Derive a fixed-size key Buffer from a password string using a hash digest.
 * Supports `aes-256-*` (32 bytes via SHA-256) and `aes-128-*` (32 bytes via MD5).
 *
 * @param algorithm - Cipher algorithm string used to infer the key size.
 * @param password - Source password string.
 */
export const genKey = (algorithm: string, password: string): Buffer => {
  const [size, algo] = algorithm.includes('256')
    ? [32, 'sha256']
    : algorithm.includes('128')
      ? [16, 'md5']
      : [32, 'sha256'];
  const hash = crypto.createHash(algo);
  hash.update(password);
  return Buffer.from(hash.digest('hex'), 'hex').subarray(0, size);
};

// ─── Higher-level password-based helpers ──────────────────────────────────────

const DEFAULT_ALG = 'aes-256-cbc';

/**
 * Encrypt a plaintext string using a password.
 * Derives a key from the password, generates a random IV, and returns the
 * result as a `base64(iv):base64(ciphertext)` string safe for DB storage.
 *
 * @param text     - Plaintext to encrypt.
 * @param password - Secret password to derive the key from.
 * @param alg      - Cipher algorithm. Defaults to `'aes-256-cbc'`.
 */
export const encryptWithPassword = (text: string, password: string, alg = DEFAULT_ALG): string => {
  const key = genKey(alg, password);
  const iv = genIv();
  const ciphertext = encryptText(alg, key, iv, text);
  return `${iv.toString('base64')}:${ciphertext}`;
};

/**
 * Decrypt a string produced by `encryptWithPassword`.
 * Expects the format `base64(iv):base64(ciphertext)`.
 *
 * @param encrypted - The encrypted string from DB storage.
 * @param password  - Secret password used during encryption.
 * @param alg       - Cipher algorithm. Defaults to `'aes-256-cbc'`.
 */
export const decryptWithPassword = (encrypted: string, password: string, alg = DEFAULT_ALG): string => {
  const [ivBase64, ciphertext] = encrypted.split(':');
  if (!ivBase64 || !ciphertext) throw new Error('Invalid encrypted format. Expected base64(iv):base64(ciphertext)');
  const key = genKey(alg, password);
  const iv = Buffer.from(ivBase64, 'base64');
  return decryptText(alg, key, iv, ciphertext);
};
