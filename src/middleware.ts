import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge middleware: uses the Prisma-free config to gate routes via the
// `authorized` callback. Next 16 wants a default function export here.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
