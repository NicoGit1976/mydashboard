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
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "MEMBER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
