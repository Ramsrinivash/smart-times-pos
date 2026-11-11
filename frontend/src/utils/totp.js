/**
 * Minimal RFC 6238 / RFC 4226 TOTP & Base32 implementation
 * Compatible with Google Authenticator, Microsoft Authenticator, Authy
 * Uses standard Web Crypto API (SubtleCrypto HMAC-SHA1)
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Generate a random Base32 secret key (16 chars = 80 bits, standard for Google Authenticator)
export function generateTOTPSecret(length = 16) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % 32];
  }
  return secret;
}

// Decode base32 string to Uint8Array
function base32Decode(str) {
  const clean = str.replace(/=+$/, '').toUpperCase().replace(/[\s-]/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

// Generate OTP code for given secret and step (30s window)
export async function generateTOTP(secret, counterOffset = 0) {
  const timeStep = 30;
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep) + counterOffset;

  const keyBytes = base32Decode(secret);
  if (keyBytes.length === 0) return '';

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const counterBuf = new ArrayBuffer(8);
  const view = new DataView(counterBuf);
  // Big-endian 64-bit integer
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter & 0xffffffff);

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBuf);
  const sigBytes = new Uint8Array(signature);

  const offset = sigBytes[sigBytes.length - 1] & 0x0f;
  const binary =
    ((sigBytes[offset] & 0x7f) << 24) |
    ((sigBytes[offset + 1] & 0xff) << 16) |
    ((sigBytes[offset + 2] & 0xff) << 8) |
    (sigBytes[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

// Verify entered 6-digit OTP against secret allowing ±1 window (drift tolerance of ~30-60s)
export async function verifyTOTP(token, secret) {
  if (!token || !secret) return false;
  const cleanToken = token.trim().replace(/\s/g, '');
  if (cleanToken.length !== 6) return false;

  for (let offset of [0, -1, 1]) {
    const validCode = await generateTOTP(secret, offset);
    if (validCode === cleanToken) {
      return true;
    }
  }
  return false;
}

// Build otpauth:// URL for Google Authenticator
export function getOTPAuthURL(secret, accountName = 'admin@smarttimes.in', issuer = 'Smart Times POS') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

