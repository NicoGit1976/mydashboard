# --- build stage ---
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# --- runtime stage ---
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Copy the whole app (incl. node_modules) so the Prisma CLI + tsx are available
# at start for `prisma db push` and seeding.
COPY --from=build /app ./
RUN mkdir -p /app/data /app/public/uploads
EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]
