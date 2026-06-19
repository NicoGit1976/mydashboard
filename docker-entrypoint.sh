#!/bin/sh
set -e

echo "[entrypoint] Sync SQLite schema (prisma db push)…"
npx prisma db push --skip-generate --accept-data-loss

echo "[entrypoint] Seeding admin user…"
npx tsx prisma/seed.ts || echo "[entrypoint] seed skipped/failed (continuing)"

echo "[entrypoint] Starting Next.js on :3000…"
exec npx next start -p 3000 -H 0.0.0.0
