"use strict";

const crypto = require("node:crypto");

const VERSION = "v1";

function encryptionKey(env = process.env) {
  const raw = String(env.DATA_ENCRYPTION_KEY || "").trim();
  if (!raw) {
    const error = new Error("DATA_ENCRYPTION_KEY is required to encrypt provider secrets.");
    error.code = "encryption_key_missing";
    error.statusCode = 500;
    throw error;
  }
  return crypto.createHash("sha256").update(raw).digest();
}

function normalizeSecret(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function encryptSecret(value, env = process.env) {
  const text = normalizeSecret(value);
  if (!text) return null;
  const key = encryptionKey(env);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(":");
  return Buffer.from(payload, "utf8");
}

function decryptSecret(value, env = process.env) {
  if (!value) return "";
  const payload = Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
  const [version, iv64, tag64, ciphertext64] = payload.split(":");
  if (version !== VERSION || !iv64 || !tag64 || !ciphertext64) {
    const error = new Error("Encrypted secret payload is invalid.");
    error.code = "invalid_secret_payload";
    error.statusCode = 500;
    throw error;
  }
  const key = encryptionKey(env);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv64, "base64url"));
  decipher.setAuthTag(Buffer.from(tag64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext64, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function secretFingerprint(value) {
  if (!value) return "";
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

module.exports = {
  decryptSecret,
  encryptSecret,
  secretFingerprint
};
