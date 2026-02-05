# WebClaw

![Cover](./public/cover.webp)

Fast web client for OpenClaw

Currently in beta.

## Setup

Create `.env.local` with `CLAWDBOT_GATEWAY_URL` and either `CLAWDBOT_GATEWAY_TOKEN` (recommended) or `CLAWDBOT_GATEWAY_PASSWORD`. These map to your OpenClaw Gateway auth (`gateway.auth.token` or `gateway.auth.password`). Default URL is `ws://127.0.0.1:18789`. Docs: https://docs.openclaw.ai/gateway

```bash
npm install
npm run dev
```

## Docker

Build and run with Docker:

```bash
docker build -t webclaw .

docker run -p 3000:3000 \
  -e CLAWDBOT_GATEWAY_URL=ws://host.docker.internal:18789 \
  -e CLAWDBOT_GATEWAY_TOKEN=your-token \
  webclaw
```

The container exposes port `3000` and includes a health check on `/api/ping`.
