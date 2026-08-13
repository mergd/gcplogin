const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_PERIOD_SECONDS = 30;
const DIGITS = 6;

export function normalizeTotpSecret(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (/^otpauth:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return (url.searchParams.get('secret') ?? '')
        .replace(/[\s-]+/g, '')
        .toUpperCase();
    } catch {
      return '';
    }
  }

  return trimmed.replace(/[\s-]+/g, '').toUpperCase();
}

export async function generateTotp(
  raw: string,
  now = Date.now(),
): Promise<string | undefined> {
  const secret = normalizeTotpSecret(raw);
  if (secret.length < 8) return undefined;

  try {
    const keyBytes = decodeBase32(secret);
    const keyMaterial = new Uint8Array(keyBytes);
    const counter = Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setUint32(4, counter, false);

    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign'],
    );
    const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      (hmac[offset + 1] << 16) |
      (hmac[offset + 2] << 8) |
      hmac[offset + 3];
    return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
  } catch {
    return undefined;
  }
}

function decodeBase32(secret: string): Uint8Array {
  const cleaned = secret.replace(/=+$/g, '');
  let bits = '';
  for (const char of cleaned) {
    const value = BASE32.indexOf(char);
    if (value < 0) throw new Error('Invalid TOTP secret');
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Uint8Array.from(bytes);
}
