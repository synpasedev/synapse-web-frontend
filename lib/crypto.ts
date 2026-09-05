import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY_HEX;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY_HEX must be a 64-character (32-byte) hex string.');
  }
  return Buffer.from(hexKey, 'hex');
}

export interface EncryptedData {
  cipherText: string;
  iv: string;
  authTag: string;
  packed: string; // iv:authTag:cipherText
}

export function encrypt(plainText: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');

  return {
    cipherText: encrypted,
    iv: ivHex,
    authTag,
    packed: `${ivHex}:${authTag}:${encrypted}`,
  };
}

export function decrypt(
  cipherTextOrPacked: string,
  fallbackIv?: string,
  fallbackAuthTag?: string
): string {
  let ivHex = fallbackIv;
  let authTagHex = fallbackAuthTag;
  let cipherTextHex = cipherTextOrPacked;

  if (cipherTextOrPacked.includes(':')) {
    const parts = cipherTextOrPacked.split(':');
    if (parts.length === 3) {
      ivHex = parts[0];
      authTagHex = parts[1];
      cipherTextHex = parts[2];
    }
  }

  if (!ivHex || !authTagHex) {
    throw new Error('Missing IV or AuthTag for decryption.');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(cipherTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

