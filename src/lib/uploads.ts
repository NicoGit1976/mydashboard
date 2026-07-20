import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Central image-upload validation: extension + MIME allowlist and a size cap.
// SVG is deliberately excluded (script-capable → stored-XSS vector).
const ALLOWED_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function saveImageUpload(file: File): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_BYTES) return null;

  const ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!ALLOWED_EXT.has(ext)) return null;
  if (file.type && !file.type.startsWith("image/")) return null;

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  // Served by the route handler, not by Next's boot-time public/ snapshot —
  // otherwise the image 404s until the next container restart.
  return `/api/uploads/${fileName}`;
}
