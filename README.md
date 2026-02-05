# WebClaw

![Cover](./public/cover.webp)

Fast web client for OpenClaw

Currently in beta.

## Features

- 💬 **Chat** — Real-time chat with your OpenClaw agent
- 📁 **File Explorer** — Browse, upload, download, rename and delete files on the host filesystem
- ✏️ **Text Editor** — Edit YAML, JSON, Markdown, Python, JavaScript, and 30+ file types directly in the browser (Ctrl+S to save)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
# Gateway connection (required)
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
CLAWDBOT_GATEWAY_TOKEN=your_gateway_token_here
# Or use password auth:
# CLAWDBOT_GATEWAY_PASSWORD=your_password_here

# File Explorer — root directory for browsing (optional)
# Defaults to the current user's home directory if not set.
FILES_ROOT=/home/your_user
```

| Variable | Required | Description |
|---|---|---|
| `CLAWDBOT_GATEWAY_URL` | No | WebSocket URL for the OpenClaw Gateway. Default: `ws://127.0.0.1:18789` |
| `CLAWDBOT_GATEWAY_TOKEN` | Yes* | Gateway auth token (`gateway.auth.token` in OpenClaw config) |
| `CLAWDBOT_GATEWAY_PASSWORD` | Yes* | Alternative: Gateway password (`gateway.auth.password`) |
| `FILES_ROOT` | No | Absolute path to the root directory for the file explorer. Default: `$HOME` |

\* One of `CLAWDBOT_GATEWAY_TOKEN` or `CLAWDBOT_GATEWAY_PASSWORD` is required.

### 3. Run

```bash
npm run dev
```

The app will be available at `http://localhost:3000`. Use `--host` to expose on the network:

```bash
npm run dev -- --host
```

## File Explorer

The file explorer reads and writes directly to the host filesystem under the `FILES_ROOT` directory. Key points:

- **Security**: All paths are jailed to `FILES_ROOT` — directory traversal and symlink escapes are blocked.
- **Hidden files**: Visible by default (dotfiles are shown).
- **Text editing**: Double-click any supported text file to open the built-in editor. Supported extensions include `.yaml`, `.yml`, `.json`, `.md`, `.txt`, `.py`, `.js`, `.ts`, `.sh`, `.html`, `.css`, and many more.
- **Context menu**: Right-click any file or folder for actions (Open, Edit, Download, Rename, Delete).

## Docs

Gateway auth docs: https://docs.openclaw.ai/gateway
