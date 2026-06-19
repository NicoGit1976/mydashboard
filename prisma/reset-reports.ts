// Dev helper: wipe all reports (cascades to widgets) so each client re-bootstraps
// a fresh default layout on next view. Run: npx tsx prisma/reset-reports.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

db.report
  .deleteMany()
  .then((r) => console.log("Deleted reports (widgets cascade):", r.count))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
