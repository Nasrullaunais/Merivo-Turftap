import { createHash, timingSafeEqual } from "node:crypto";

const digest = (text: string) => createHash("sha256").update(text).digest();

/** Compares in constant time, so the reply's timing gives no hint of how much of a guess was right. */
export const sameSecret = (given: string, expected: string) =>
  timingSafeEqual(digest(given), digest(expected));
