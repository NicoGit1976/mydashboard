import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Trim only: deploy env values can arrive with leading/trailing whitespace or a
// stray CR, which .trim() removes — while leaving every real character (hyphens,
// spaces, accents in a chosen passphrase, "d-analytica.cloud") untouched.
const clean = (s: string) => s.trim();

async function main() {
  const email = clean(process.env.SEED_EMAIL || "nicolas@d-analytica.cloud").toLowerCase();
  const rawPassword = process.env.SEED_PASSWORD ?? "";
  const password = clean(rawPassword) || "mydashboard";
  const name = clean(process.env.SEED_NAME || "Nicolas");
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

  // Never log the password (nor its length) — just the decision path.
  console.log(
    `Seed OK — ${email} · existing-mustChange=${existing?.mustChangePassword ?? "n/a"} · forceReset=${forceReset} · reset-temp=${resetTemp} · clients: ${await db.client.count()}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
