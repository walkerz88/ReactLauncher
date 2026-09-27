import * as crypto from 'crypto';

/**
 * Authenticated encryption (AES-256-GCM) for profile files. Any change to the stored bytes — or
 * moving a sealed file under another name — makes `open` fail, so statistics and achievements
 * can't be inflated by editing the file.
 */
export interface Sealer {
  /** `aad` (the file name) is bound to the ciphertext: it must be the same again to open it. */
  seal: (plain: string, aad: string) => string;
  /** The plain text, or `null` if the data was altered, is malformed, or belongs to another file. */
  open: (sealed: string, aad: string) => string | null;
}

const FORMAT_VERSION = 1;
const IV_BYTES = 12;

export const createSealer = (key: Buffer): Sealer => ({
  seal: (plain, aad) => {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(aad));

    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);

    return JSON.stringify({
      v: FORMAT_VERSION,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: data.toString('base64'),
    });
  },
  open: (sealed, aad) => {
    try {
      const envelope = JSON.parse(sealed) as { v?: unknown; iv?: unknown; tag?: unknown; data?: unknown };

      if (
        envelope.v !== FORMAT_VERSION ||
        typeof envelope.iv !== 'string' ||
        typeof envelope.tag !== 'string' ||
        typeof envelope.data !== 'string'
      ) {
        return null;
      }

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
      decipher.setAAD(Buffer.from(aad));
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));

      return Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8');
    } catch {
      return null;
    }
  },
});
