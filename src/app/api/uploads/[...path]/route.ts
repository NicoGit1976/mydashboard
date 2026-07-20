import { readFile } from "fs/promises";
import path from "path";

// Next only serves files that existed in public/ at boot: it snapshots the
// directory once and serves from that Set, so a logo uploaded at runtime 404s
// until the container restarts. Serving uploads through a route handler makes
// them available immediately.
//
// Public on purpose: /share/[token] renders client and agency logos to
// logged-out viewers (middleware already excludes /api).

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

// Uploads are always randomUUID().ext — anything else is not ours. Matching the
// exact shape is also what makes path traversal impossible.
const NAME_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(png|jpg|jpeg|webp|gif)$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const name = parts.join("/");
  if (!NAME_RE.test(name)) return new Response(null, { status: 404 });

  const ext = name.split(".").pop() ?? "";
  const file = await readFile(
    path.join(process.cwd(), "public", "uploads", name),
  ).catch(() => null);
  if (!file) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      // Names are content-addressed by UUID, so they never change.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
