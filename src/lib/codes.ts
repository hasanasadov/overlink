import { randomBytes, randomInt, createHash } from "node:crypto";

// No look-alike characters (0/o, 1/l/i) so links are easy to read and type.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function shortCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function isValidCode(code: string, length?: number): boolean {
  if (length && code.length !== length) return false;
  return /^[2-9a-hj-km-np-z]{4,12}$/.test(code);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
