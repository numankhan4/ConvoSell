import * as crypto from 'crypto';

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
