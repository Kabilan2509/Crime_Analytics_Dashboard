/**
 * mfaService.js — Multi-Factor Authentication Service for KSP Command Center
 * 
 * Provides:
 * 1. Cryptographically secure Base32 TOTP secret generation
 * 2. AES-256-GCM authenticated encryption/decryption for secrets stored in DataStore
 * 3. Mathematical RFC 6238 TOTP token verification (Google Authenticator / Authy compatible)
 * 4. QR Code Data-URL generation for mobile app scanning
 */

const crypto = require('crypto');
const QRCode = require('qrcode');

// Derive or fallback encryption key (32 bytes for AES-256)
const MASTER_KEY_SEED = process.env.MFA_ENCRYPTION_KEY || 'KSP_INTELLIGENCE_MFA_PLATFORM_KEY_2026';
const AES_KEY = crypto.createHash('sha256').update(MASTER_KEY_SEED).digest();

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generates a random Base32 secret (standard 160-bit / 32 characters)
 */
function generateBase32Secret(length = 32) {
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[bytes[i] % BASE32_CHARS.length];
  }
  return secret;
}

/**
 * Encrypts a plaintext secret using AES-256-GCM with authentication tag
 */
function encryptSecret(plainText) {
  if (!plainText) return null;
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload
 */
function decryptSecret(payload) {
  if (!payload || typeof payload !== 'string') return null;
  const parts = payload.split(':');
  if (parts.length !== 3) return null;

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Decodes a Base32 string into a Buffer
 */
function base32ToBuffer(base32) {
  const clean = base32.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generates an RFC 6238 TOTP code for a specific time step
 */
function getTOTPAtTimeStep(secretBuffer, timeStep) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP token against a Base32 secret with clock-drift window
 * @param {string} base32Secret - The officer's base32 secret
 * @param {string} token - The 6-digit code entered by the user
 * @param {number} window - Number of 30-second steps to check backward/forward (default 1 = +/- 30s)
 * @returns {boolean}
 */
function verifyTOTP(base32Secret, token, window = 1) {
  if (!base32Secret || !token) return false;
  const cleanToken = String(token).trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

  const secretBuffer = base32ToBuffer(base32Secret);
  const currentTime = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(currentTime / 30);

  for (let stepOffset = -window; stepOffset <= window; stepOffset++) {
    const expectedToken = getTOTPAtTimeStep(secretBuffer, currentStep + stepOffset);
    if (crypto.timingSafeEqual(Buffer.from(expectedToken), Buffer.from(cleanToken))) {
      return true;
    }
  }

  return false;
}

/**
 * Generates an otpauth:// URI for authenticator apps
 */
function generateOtpauthURI(email, secret, issuer = 'KSP Intelligence') {
  const label = encodeURIComponent(email);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedIssuer}:${label}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a QR Code as a Data URL for easy embedding in frontend img tags
 */
async function generateQrDataUrl(uri) {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 220,
    color: {
      dark: '#1e1e2f',
      light: '#ffffff',
    },
  });
}

module.exports = {
  generateBase32Secret,
  encryptSecret,
  decryptSecret,
  verifyTOTP,
  generateOtpauthURI,
  generateQrDataUrl,
};
