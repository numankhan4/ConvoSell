import * as crypto from 'crypto';

const ENCRYPTED_PREFIX = 'enc:v1:';

/**
 * Generate a cryptographically secure random token
 * @param length - Length of the token in bytes (default: 32)
 * @returns A URL-safe base64 encoded token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a human-readable webhook verify token
 * Format: whv_<random_string> (whv = webhook verify)
 */
export function generateWebhookVerifyToken(): string {
  const randomPart = crypto.randomBytes(24).toString('hex');
  return `whv_${randomPart}`;
}

function getEncryptionKey(): Buffer | null {
  const rawKey = process.env.WHATSAPP_CRM_ENCRYPTION_KEY;
  if (!rawKey) return null;

  // Derive a stable 32-byte key from any provided string format.
  return crypto.createHash('sha256').update(rawKey).digest();
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return !!value && value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptSecret(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  if (isEncryptedSecret(value)) return value;

  const key = getEncryptionKey();
  if (!key) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = `${iv.toString('base64url')}:${authTag.toString('base64url')}:${encrypted.toString('base64url')}`;

  return `${ENCRYPTED_PREFIX}${payload}`;
}

export function decryptSecret(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  if (!isEncryptedSecret(value)) return value;

  const key = getEncryptionKey();
  if (!key) {
    throw new Error('WHATSAPP_CRM_ENCRYPTION_KEY is required to decrypt encrypted secrets');
  }

  const payload = value.slice(ENCRYPTED_PREFIX.length);
  const [ivPart, authTagPart, encryptedPart] = payload.split(':');

  if (!ivPart || !authTagPart || !encryptedPart) {
    throw new Error('Invalid encrypted secret payload format');
  }

  const iv = Buffer.from(ivPart, 'base64url');
  const authTag = Buffer.from(authTagPart, 'base64url');
  const encrypted = Buffer.from(encryptedPart, 'base64url');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
}
