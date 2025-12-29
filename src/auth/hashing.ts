import crypto from 'crypto';

export function hashToken(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomNumericCode(length = 6): string {
  const max = 10 ** length;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(length, '0');
}

export function timingSafeEqualHash(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}
