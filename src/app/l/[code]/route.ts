import { after } from "next/server";
import { db } from "@/lib/db";
import { CODE_RE } from "@/lib/shortlink";
import { recordClick } from "@/lib/shortlink-clicks";

// Public short-link redirect: tools.d-analytica.cloud/l/<code>.
//
// 302 on purpose, never 301: a permanent redirect gets cached by browsers and
// CDNs, after which clicks stop reaching us and the analytics silently die.

export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "no-store",
  // Don't leak the destination back to the network the click came from.
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!CODE_RE.test(code)) return new Response(null, { status: 404, headers: HEADERS });

  const link = await db.shortLink.findUnique({
    where: { code },
    select: { id: true, targetUrl: true, disabled: true },
  });
  if (!link) return new Response(null, { status: 404, headers: HEADERS });
  if (link.disabled) return new Response(null, { status: 410, headers: HEADERS });

  // Traefik appends the real client to the END of x-forwarded-for; the first
  // hop is whatever the client claimed, i.e. spoofable — never use it.
  const xff = req.headers.get("x-forwarded-for");
  const ip =
    xff?.split(",").map((s) => s.trim()).filter(Boolean).pop() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent");

  // Counting happens after the response is sent — a slow DB write must never
  // delay the visitor's redirect.
  after(() => recordClick(link.id, ip, ua));

  return new Response(null, {
    status: 302,
    headers: { ...HEADERS, Location: link.targetUrl },
  });
}
