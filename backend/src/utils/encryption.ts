import crypto from 'crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(config.ENCRYPTION_KEY, 'utf-8');
const IV_LENGTH = Number(config.ENCRYPTION_IV_LENGTH);

export interface EncryptedValue {
  iv: string;
  content: string;
  authTag: string;
}

export const encrypt = (plainText: string): EncryptedValue => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

export const decrypt = ({ iv, content, authTag }: EncryptedValue): string => {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(content, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
};

export const encryptToString = (plainText: string): string => {
  const encrypted = encrypt(plainText);
  return JSON.stringify(encrypted);
};

export const decryptFromString = (serialized: string): string => {
  const parsed = JSON.parse(serialized) as EncryptedValue;
  return decrypt(parsed);
};
