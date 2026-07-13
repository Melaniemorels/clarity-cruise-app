import crypto from "node:crypto";

// AES-256-GCM encryption-at-rest for provider OAuth tokens.
// Stored format: enc:v1:<b64 iv>:<b64 authTag>:<b64 ciphertext>
// Values without the prefix are treated as legacy plaintext (pre-migration
// rows and test fixtures) and returned unchanged by decryptToken.

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw || raw.length < 16) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set (or too short) — cannot encrypt/decrypt provider tokens",
    );
  }
  // Derive a 256-bit AES key from the secret. Accepting any sufficiently long
  // secret string (rather than requiring exact 32-byte base64) lets the key
  // live in Replit Secrets and be rotated without format constraints.
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

export function encryptToken(plain: string): string;
export function encryptToken(plain: null | undefined): null;
export function encryptToken(plain: string | null | undefined): string | null;
export function encryptToken(
  plain: string | null | undefined,
): string | null {
  if (plain == null || plain === "") return plain ?? null;
  if (plain.startsWith(PREFIX)) return plain; // already encrypted
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptToken(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") return stored ?? null;
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext
  const parts = stored.slice(PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("malformed encrypted token payload");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}

export function isEncryptedToken(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.startsWith(PREFIX);
}
