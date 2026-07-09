#!/bin/sh
set -e

# Runs as root only long enough to make the mounted volumes writable by the
# unprivileged node user, then drops privileges for everything else.
mkdir -p /app/data /app/public/uploads
chown -R node:node /app/data /app/public/uploads 2>/dev/null || true

exec gosu node sh -c '
  set -e
  echo "[entrypoint] Sync SQLite schema (prisma db push)…"
  # No --accept-data-loss: a destructive schema change must fail loudly here
  # rather than silently dropping production data.
  npx prisma db push --skip-generate

  echo "[entrypoint] Seeding admin user…"
  if ! npx tsx prisma/seed.ts; then
    echo "[entrypoint] SEED FAILED"
    # If an admin-recovery was requested (SEED_RESET), a silent failure would
    # leave the operator locked out — abort so restart:unless-stopped retries.
    if [ "$SEED_RESET" = "1" ]; then
      echo "[entrypoint] recovery (SEED_RESET) requested but seed failed — aborting"
      exit 1
    fi
  fi

  echo "[entrypoint] Starting Next.js on :3000…"
  exec npx next start -p 3000 -H 0.0.0.0
'
