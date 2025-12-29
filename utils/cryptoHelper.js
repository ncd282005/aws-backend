const crypto = require("crypto");
require("dotenv").config();

// CONFIG
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // bytes
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const CRYPTO_SECRET_KEY = process.env.CRYPTO_SECRET_KEY;

// Derive a fixed-length key from secret
function getKey(secret) {
  return crypto
    .createHash("sha256")
    .update(secret)
    .digest()
    .slice(0, KEY_LENGTH);
}

/**
 * Encrypt a string
 * @param {string} text
 * @param {string} secretKey
 * @returns {string}
 */
function encode(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey(CRYPTO_SECRET_KEY);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Combine iv + tag + encrypted
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

/**
 * Decrypt a string
 * @param {string} encodedText
 * @param {string} secretKey
 * @returns {string}
 */
function decode(encodedText) {
  const data = Buffer.from(encodedText, "base64");
  const key = getKey(CRYPTO_SECRET_KEY);

  const iv = data.slice(0, IV_LENGTH);
  const tag = data.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encryptedText = data.slice(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

module.exports = {
  encode,
  decode,
};
