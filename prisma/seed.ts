import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // Admin login is driven by env (set securely at deploy); falls back to the
  // local dev defaults.
  const email = (process.env.SEED_EMAIL || "nicolas@d-analytica.cloud").toLowerCase();
  const password = process.env.SEED_PASSWORD || "mydashboard";
  const name = process.env.SEED_NAME || "Nicolas";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await db.user.upsert({
    where: { email },
    update: { name, role: "ADMIN" }, // never reset the password (or the flag) on re-seed
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

  console.log("Seed OK —", email, "· clients:", await db.client.count());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
