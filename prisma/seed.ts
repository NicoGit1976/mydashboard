import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Trim only: deploy env values can arrive with leading/trailing whitespace or a
// stray CR, which .trim() removes — while leaving every real character (hyphens,
// spaces, accents in a chosen passphrase, "d-analytica.cloud") untouched.
const clean = (s: string) => s.trim();

async function main() {
  // SEED_USERNAME is the new knob; SEED_EMAIL stays supported so the existing
  // VPS env keeps working untouched.
  const username = clean(
    process.env.SEED_USERNAME || process.env.SEED_EMAIL || "nicolas",
  ).toLowerCase();
  const rawPassword = process.env.SEED_PASSWORD ?? "";
  const password = clean(rawPassword) || "mydashboard";
  const name = clean(process.env.SEED_NAME || "Nicolas");
  const passwordHash = await bcrypt.hash(password, 10);

  // Backfill BEFORE looking the admin up. If this ran after, the admin's
  // username would still be NULL, the lookup would miss, and the upsert would
  // insert a SECOND admin row.
  const needBackfill = await db.user.findMany({
    where: { username: null },
    select: { id: true, email: true },
  });
  let backfilled = 0;
  for (const u of needBackfill) {
    const derived = clean(String(u.email ?? "")).toLowerCase();
    if (!derived) continue;
    await db.user.update({ where: { id: u.id }, data: { username: derived } });
    backfilled++;
  }
  if (backfilled) console.log(`Seed — backfilled username on ${backfilled} row(s)`);

  // The very first account to exist is the super admin; later ones default to
  // MEMBER and are promoted from the Team screen.
  const isFirstUser = (await db.user.count()) === 0;

  // Both columns are login identifiers, and uniqueness is PER COLUMN: a row can
  // answer to this string through a legacy value left in `email`. Missing that
  // makes the write below insert a SECOND account with the same login.
  const existing = await db.user.findFirst({
    where: { OR: [{ username }, { email: username }] },
  });

  // One-time admin rename + password reset (recovery / login-id change). Moves
  // the SEED_RENAME_FROM account to the new SEED_EMAIL id and sets the chosen
  // password as DIRECTLY usable (no forced change). Clients stay attached (same
  // user id). Idempotent: skipped once the target id already exists.
  const renameFrom = clean(process.env.SEED_RENAME_FROM || "").toLowerCase();
  if (renameFrom && renameFrom !== username && !existing) {
    const old = await db.user.findFirst({
      where: { OR: [{ username: renameFrom }, { email: renameFrom }] },
    });
    if (old) {
      await db.user.update({
        where: { id: old.id },
        data: {
          username,
          name,
          role: "SUPER_ADMIN",
          passwordHash,
          mustChangePassword: false,
          // Clear the retired identifier instead of leaving it live in `email`,
          // which would let two strings resolve to this account.
          ...(old.email === renameFrom ? { email: null } : {}),
        },
      });
      console.log(
        `Seed OK — renamed ${renameFrom} → ${username} · password reset · direct login · clients: ${await db.client.count()}`,
      );
      return;
    }
  }

  // Reset the temp password when the admin hasn't completed first-login yet
  // (mustChangePassword still true), OR when SEED_RESET is explicitly set — used
  // to recover a locked-out admin. Once they set their own password (and
  // SEED_RESET is unset), we never touch it again.
  const forceReset = ["1", "true", "yes"].includes(
    (process.env.SEED_RESET || "").trim().toLowerCase(),
  );
  const resetTemp = !existing || existing.mustChangePassword || forceReset;

  // Creating an account is a BOOTSTRAP act, allowed only on an empty instance.
  // On a populated one, an unrecognised SEED_USERNAME means the operator changed
  // a variable — not that a new super admin should appear. Minting one would add
  // a full-power account nobody asked for, whose password is whatever is sitting
  // in the deploy env. Refuse, loudly, and leave the instance untouched.
  if (!existing && !isFirstUser) {
    console.error(
      `Seed ABORTED — no account matches "${username}" and this instance already has users. ` +
        `Refusing to create a second SUPER_ADMIN. Check SEED_USERNAME/SEED_EMAIL, ` +
        `or use SEED_RENAME_FROM=<current login> to move the existing account.`,
    );
    return;
  }

  // The seeded account is the operator of this instance: always SUPER_ADMIN.
  // Keyed on the resolved id (not on `username`) so a row found through its
  // `email` is UPDATED rather than duplicated.
  const admin = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: resetTemp
          ? { username, name, role: "SUPER_ADMIN", passwordHash, mustChangePassword: true }
          : { username, name, role: "SUPER_ADMIN" },
      })
    : await db.user.create({
        data: { username, name, passwordHash, role: "SUPER_ADMIN", mustChangePassword: true },
      });

  // Demo content only on a genuinely fresh install — never re-seed sample
  // clients into an instance that already has real ones.
  if (isFirstUser && (await db.client.count()) === 0) {
    await db.client.createMany({
      data: [
        { ownerId: admin.id, name: "Maison Aurore", sector: "Hôtellerie & Spa", brandColor: "#C2410C" },
        { ownerId: admin.id, name: "Studio Velvet", sector: "Beauté & Bien-être", brandColor: "#7c3aed" },
      ],
    });
  }

  // Never log the password (nor its length) — just the decision path.
  console.log(
    `Seed OK — ${username} · role=SUPER_ADMIN · existing-mustChange=${existing?.mustChangePassword ?? "n/a"} · forceReset=${forceReset} · reset-temp=${resetTemp} · clients: ${await db.client.count()}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
