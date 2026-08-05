import { randomInt } from "crypto";
import { db } from "@/lib/db";

// Short-link primitives. Codes are 7 chars from a 54-char alphabet with the
// look-alikes removed (0/O, 1/l/I) so a code can be read out loud over the
// phone without ambiguity. 54^7 ≈ 1.3e12 — collisions are handled anyway.
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWX";
export const CODE_LEN = 7;
export const CODE_RE = /^[23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWX]{7}$/;

export function genCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

// The unique index is the real authority — on the (astronomically rare)
// collision, retry with a fresh code instead of failing the save.
export async function createUniqueCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = genCode();
    const exists = await db.shortLink.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error("shortlink code space exhausted (impossible)");
}

// Appends UTM params WITHOUT overwriting any the user already put in the URL —
// a hand-tagged campaign link must survive shortening.
export function withUtm(rawUrl: string, channel: string | null): string {
  const url = new URL(rawUrl);
  const set = (k: string, v: string) => {
    if (!url.searchParams.has(k)) url.searchParams.set(k, v);
  };
  set("utm_source", channel ?? "social");
  set("utm_medium", "social");
  return url.toString();
}
