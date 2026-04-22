import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Mã 6 chữ số (100000–999999). */
export function generateVerificationCode(): string {
  return String(randomInt(100000, 1000000));
}

export function normalizeVerificationCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function hashVerificationCode(normalizedSixDigits: string): string {
  return createHash("sha256")
    .update(normalizedSixDigits, "utf8")
    .digest("hex");
}

/** So sánh hai chuỗi hex SHA-256 an toàn thời gian. */
export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
