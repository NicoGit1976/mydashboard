import { readFile } from "fs/promises";
import path from "path";

// Media helpers shared by publishers. Upload paths look like
// "/api/uploads/<uuid>.<ext>" (see src/lib/uploads.ts).

const NAME_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(png|jpg|jpeg|webp|gif)$/;

export function uploadName(mediaPath: string): string | null {
  const name = mediaPath.split("/").pop() ?? "";
  return NAME_RE.test(name) ? name : null;
}

// Public absolute URL of an upload — what Instagram/Facebook fetch themselves.
export function absoluteUrl(mediaPath: string): string {
  const base = process.env.APP_URL ?? "https://tools.d-analytica.cloud";
  return `${base}${mediaPath.startsWith("/") ? "" : "/"}${mediaPath}`;
}

// Raw bytes of an upload, for networks that take a direct binary upload
// (LinkedIn, X). Strict name check — never read outside uploads/.
export async function readUploadBytes(mediaPath: string): Promise<Buffer | null> {
  const name = uploadName(mediaPath);
  if (!name) return null;
  return readFile(path.join(process.cwd(), "public", "uploads", name)).catch(() => null);
}

// Instagram only accepts JPEG. Extension lies happen (a PNG saved as .jpg), so
// check the magic bytes, not the name.
export function isJpeg(bytes: Buffer): boolean {
  return bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}
