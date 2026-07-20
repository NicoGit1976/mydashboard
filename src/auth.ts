import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { clearFailures, isBlocked, recordFailure } from "@/lib/rate-limit";
import { normalizeIdentifier } from "@/lib/identity";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { identifier: {}, password: {} },
      authorize: async (creds, request) => {
        // Accepts a username OR an email: both are unique, and existing
        // accounts predate the username column.
        const identifier = normalizeIdentifier(creds?.identifier);
        const password = String(creds?.password ?? "");
        if (!identifier || !password) return null;

        // Brute-force guard: after 5 failures in 15 min the (identifier, IP)
        // pair locks for the window. Keying on IP too means an attacker who
        // knows an identifier can't lock its owner out from their own IP.
        const ip =
          request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
          request?.headers?.get?.("x-real-ip") ||
          "unknown";
        const rlKey = `login:${identifier}:${ip}`;
        if (isBlocked(rlKey)) return null;

        // Uniqueness is PER COLUMN, so two different rows could each match one
        // arm of an OR. Resolve deterministically: username wins, then email —
        // never let the query planner decide which account you log into.
        const user =
          (await db.user.findUnique({ where: { username: identifier } })) ??
          (await db.user.findUnique({ where: { email: identifier } }));
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
          email: user.email ?? undefined,
          name: user.name ?? user.username ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
});
