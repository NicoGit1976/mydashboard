import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { clearFailures, isBlocked, recordFailure } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds, request) => {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        // Brute-force guard: after 5 failures in 15 min the (email, IP) pair
        // locks for the window. Keying on IP too means an attacker who knows a
        // victim's email can't lock the victim out from the victim's own IP.
        const ip =
          request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
          request?.headers?.get?.("x-real-ip") ||
          "unknown";
        const rlKey = `login:${email}:${ip}`;
        if (isBlocked(rlKey)) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) {
          recordFailure(rlKey);
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          recordFailure(rlKey);
          return null;
        }
        clearFailures(rlKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
});
