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
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        // Brute-force guard: after 5 failures in 15 min the account locks for
        // the window — even a correct password is refused (generic error).
        const rlKey = `login:${email}`;
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
