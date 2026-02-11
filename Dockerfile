# ---- Stage 1: Install dependencies ----
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/webclaw/package.json ./apps/webclaw/package.json
# Include landing package.json so pnpm workspace resolution succeeds
COPY apps/landing/package.json ./apps/landing/package.json

RUN pnpm install --frozen-lockfile

# ---- Stage 2: Build the app ----
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/webclaw/node_modules ./apps/webclaw/node_modules
COPY --from=deps /app/apps/landing/node_modules ./apps/landing/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/webclaw ./apps/webclaw
COPY apps/landing/package.json ./apps/landing/package.json

RUN pnpm build

# ---- Stage 3: Production runtime ----
FROM node:22-alpine AS runtime

WORKDIR /app

# Copy the Nitro server output (TanStack Start builds to .output/)
COPY --from=build /app/apps/webclaw/.output ./.output

ENV NODE_ENV=production
ENV CLAWDBOT_GATEWAY_URL=ws://host.docker.internal:18789
ENV CLAWDBOT_GATEWAY_TOKEN=
ENV CLAWDBOT_GATEWAY_PASSWORD=

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
