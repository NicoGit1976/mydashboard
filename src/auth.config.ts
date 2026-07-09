import type { NextAuthConfig } from "next-auth";

// Edge-safe config (NO Prisma / bcrypt imports) — shared by the middleware.
// The Prisma-backed Credentials provider lives in auth.ts (Node runtime only).
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      // Public share links: read-only report pages for end clients, no login.
      // Exact/segment match so a future route like /shared isn't world-readable.
      const p = nextUrl.pathname;
      if (p === "/share" || p.startsWith("/share/")) return true;
      const onLogin = nextUrl.pathname === "/login";
      if (onLogin) {
        return isLoggedIn
          ? Response.redirect(new URL("/overview", nextUrl))
          : true;
      }
      return isLoggedIn; // every other matched route requires auth
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? "";
        session.user.role = (token.role as string | undefined) ?? "MEMBER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
