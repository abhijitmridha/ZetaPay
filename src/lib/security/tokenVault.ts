import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function getEncryptionKey() {
  const rawKey = process.env.TOKEN_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not configured');
  }

  const key = Buffer.from(rawKey, 'hex');

  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters');
  }

  return key;
}

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function encryptPayload(payload: Record<string, JsonValue>) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_BYTES,
  });

  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptPayload<TPayload extends Record<string, JsonValue>>(
  encryptedPayload: string
) {
  const key = getEncryptionKey();
  const [ivPart, authTagPart, encryptedPart] = encryptedPayload.split('.');

  if (!ivPart || !authTagPart || !encryptedPart) {
    throw new Error('Invalid encrypted payload format');
  }

  const iv = Buffer.from(ivPart, 'base64url');
  const authTag = Buffer.from(authTagPart, 'base64url');
  const encrypted = Buffer.from(encryptedPart, 'base64url');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_BYTES,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return JSON.parse(decrypted.toString('utf8')) as TPayload;
}
