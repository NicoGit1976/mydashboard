# --- build stage ---
# Debian-based (glibc), not alpine/musl: avoids npm ci failures on native deps
# (@tailwindcss/oxide, @next/swc, prisma engines).
FROM node:22 AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
# Placeholder env so module-level init (Prisma client, Auth) doesn't fail during
# `next build`. Real values are injected at runtime via the compose environment.
ENV DATABASE_URL="file:/tmp/build.db"
ENV AUTH_SECRET="build-placeholder-secret"
ENV ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000"
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# npm install (not ci): tolerant of cross-platform optional-dep edge cases that
# make `npm ci` fail on linux when the lockfile was generated on macOS.
RUN npm install --no-audit --no-fund
COPY . .
RUN npx prisma generate
RUN npm run build

# --- runtime stage ---
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Copy the whole app (incl. node_modules) so the Prisma CLI + tsx are available
# at start for `prisma db push` and seeding.
COPY --from=build /app ./
RUN mkdir -p /app/data /app/public/uploads
EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]
