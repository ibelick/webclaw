# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/webclaw/package.json ./apps/webclaw/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/webclaw/node_modules ./apps/webclaw/node_modules
COPY . .

RUN pnpm -C apps/webclaw build

# ============================================
# Stage 3: Production runtime
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 webclaw

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy built output and required files
COPY --from=builder --chown=webclaw:nodejs /app/apps/webclaw/dist ./apps/webclaw/dist
COPY --from=builder --chown=webclaw:nodejs /app/apps/webclaw/src ./apps/webclaw/src
COPY --from=builder --chown=webclaw:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=webclaw:nodejs /app/apps/webclaw/node_modules ./apps/webclaw/node_modules
COPY --from=builder --chown=webclaw:nodejs /app/package.json ./
COPY --from=builder --chown=webclaw:nodejs /app/apps/webclaw/package.json ./apps/webclaw/
COPY --from=builder --chown=webclaw:nodejs /app/apps/webclaw/vite.config.ts ./apps/webclaw/
COPY --from=builder --chown=webclaw:nodejs /app/apps/webclaw/tsconfig.json ./apps/webclaw/

USER webclaw

EXPOSE 3000

# Health check using /api/ping endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/ping || exit 1

CMD ["pnpm", "-C", "apps/webclaw", "preview", "--host", "--port", "3000"]
