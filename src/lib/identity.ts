// Single normalization contract for login identifiers. Used by auth, the seed
// and account creation, so an account can never be created under a form its
// owner can't type back at the login screen.

export function normalizeIdentifier(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

const RESERVED = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "api",
  "null",
  "undefined",
]);

// 3–32 chars, starts and ends alphanumeric, dots/dashes/underscores inside.
// No "@": that keeps usernames and emails unambiguous at the login prompt.
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/;

export function validateUsername(raw: unknown): { ok: true; value: string } | { ok: false; message: string } {
  const value = normalizeIdentifier(raw);
  if (!value) return { ok: false, message: "L'identifiant est obligatoire." };
  if (value.includes("@"))
    return { ok: false, message: "L'identifiant ne peut pas contenir « @ » (c'est un email)." };
  if (!USERNAME_RE.test(value))
    return {
      ok: false,
      message:
        "3 à 32 caractères : lettres, chiffres, point, tiret ou tiret bas, en commençant et finissant par une lettre ou un chiffre.",
    };
  if (RESERVED.has(value)) return { ok: false, message: "Cet identifiant est réservé." };
  return { ok: true, value };
}

export function normalizeEmail(v: unknown): string | null {
  const e = normalizeIdentifier(v);
  if (!e) return null;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}
