# ============================================================
# StyleSync Salon Partner API — Dockerfile
# Multi-stage build: build → production image
# ============================================================

# --- Stage 1: Build ---
FROM oven/bun:1.3 AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN bun run db:generate

# --- Stage 2: Production ---
FROM oven/bun:1.3-slim AS production
WORKDIR /app

# Install only production dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy built source + Prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/eslint.config.mjs ./

# Copy entry scripts
COPY --from=builder /app/src/scripts ./src/scripts

ENV NODE_ENV=production
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD bun -e "fetch('http://localhost:4000/api/v1/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

EXPOSE 4000

# Start
CMD ["bun", "src/server.ts"]
