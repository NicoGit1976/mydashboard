import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // Admin login is driven by env (set securely at deploy); falls back to local
  // dev defaults. Trim: deploy env values can arrive with stray whitespace/CR,
  // which would silently break the password.
  const email = (process.env.SEED_EMAIL || "nicolas@d-analytica.cloud").toLowerCase().trim();
  const password = (process.env.SEED_PASSWORD || "mydashboard").trim();
  const name = (process.env.SEED_NAME || "Nicolas").trim();
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await db.user.findUnique({ where: { email } });

  // Reset the temp password on every (re)deploy AS LONG AS the admin hasn't
  // completed first-login yet (mustChangePassword still true). Once they set
  // their own password, we never touch it again.
  const resetTemp = !existing || existing.mustChangePassword;

  const admin = await db.user.upsert({
    where: { email },
    update: resetTemp
      ? { name, role: "ADMIN", passwordHash, mustChangePassword: true }
      : { name, role: "ADMIN" },
    create: { email, name, passwordHash, role: "ADMIN", mustChangePassword: true },
  });

  // A little demo content so a fresh deploy isn't empty.
  if ((await db.client.count()) === 0) {
    await db.client.createMany({
      data: [
        { ownerId: admin.id, name: "Maison Aurore", sector: "Hôtellerie & Spa", brandColor: "#C2410C" },
        { ownerId: admin.id, name: "Studio Velvet", sector: "Beauté & Bien-être", brandColor: "#7c3aed" },
      ],
    });
  }

  console.log(
    `Seed OK — ${email} · SEED_PASSWORD=${
      process.env.SEED_PASSWORD ? "len " + process.env.SEED_PASSWORD.trim().length : "MISSING(fallback)"
    } · reset-temp=${resetTemp} · clients: ${await db.client.count()}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
