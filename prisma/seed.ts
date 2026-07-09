import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // Admin login is driven by env (set securely at deploy); falls back to local
  // dev defaults. Trim: deploy env values can arrive with stray whitespace/CR,
  // which would silently break the password.
  const email = (process.env.SEED_EMAIL || "nicolas@d-analytica.cloud")
    .toLowerCase()
    .replace(/[^\x21-\x7e]/g, "");
  // Deploy env transport can inject stray/invisible characters into values,
  // which silently breaks bcrypt. Keep only printable ASCII.
  const rawPassword = process.env.SEED_PASSWORD ?? "";
  const password = rawPassword.replace(/[^\x21-\x7e]/g, "") || "mydashboard";
  const name = (process.env.SEED_NAME || "Nicolas").replace(/[^\x20-\x7e]/g, "").trim();
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await db.user.findUnique({ where: { email } });

  // Reset the temp password when the admin hasn't completed first-login yet
  // (mustChangePassword still true), OR when SEED_RESET is explicitly set — used
  // to recover a locked-out admin. Once they set their own password (and
  // SEED_RESET is unset), we never touch it again.
  const forceReset = ["1", "true", "yes"].includes(
    (process.env.SEED_RESET || "").trim().toLowerCase(),
  );
  const resetTemp = !existing || existing.mustChangePassword || forceReset;

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
    `Seed OK — ${email} · cleaned-pw-len=${password.length} · existing-mustChange=${existing?.mustChangePassword ?? "n/a"} · forceReset=${forceReset} · reset-temp=${resetTemp} · clients: ${await db.client.count()}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
