# WebClaw

![Cover](https://raw.githubusercontent.com/ibelick/webclaw/main/apps/webclaw/public/cover.jpg)

Fast web client for OpenClaw.

[webclaw.dev](https://webclaw.dev)

Currently in beta.

## Setup

Create `apps/webclaw/.env.local` with `CLAWDBOT_GATEWAY_URL` and either
`CLAWDBOT_GATEWAY_TOKEN` (recommended) or `CLAWDBOT_GATEWAY_PASSWORD`. These map
to your OpenClaw Gateway auth (`gateway.auth.token` or `gateway.auth.password`).
Default URL is `ws://127.0.0.1:18789`. Docs: https://docs.openclaw.ai/gateway

```bash
pnpm install
pnpm dev
```

## Docker

```bash
# Build and run
docker compose up --build

# Or build manually
docker build -t webclaw .
docker run -p 3000:3000 \
  -e CLAWDBOT_GATEWAY_URL=ws://host.docker.internal:18789 \
  -e CLAWDBOT_GATEWAY_TOKEN=your_token \
  webclaw
```

Note: Use `host.docker.internal` instead of `127.0.0.1` to connect to a gateway running on your host machine.
