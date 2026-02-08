import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'

type GatewayFrame =
  | { type: 'req'; id: string; method: string; params?: unknown }
  | {
      type: 'res'
      id: string
      ok: boolean
      payload?: unknown
      error?: { code: string; message: string; details?: unknown }
    }
  | { type: 'event'; event: string; payload?: unknown; seq?: number }

type ConnectParams = {
  minProtocol: number
  maxProtocol: number
  client: {
    id: string
    displayName?: string
    version: string
    platform: string
    mode: string
    instanceId?: string
  }
  auth?: { token?: string; password?: string }
  role?: 'operator' | 'node'
  scopes?: Array<string>
}

type GatewayWaiter = {
  waitForRes: (id: string) => Promise<unknown>
  handleMessage: (evt: MessageEvent) => void
}

function getGatewayConfig() {
  const url = process.env.CLAWDBOT_GATEWAY_URL?.trim() || 'ws://127.0.0.1:18789'
  const token = process.env.CLAWDBOT_GATEWAY_TOKEN?.trim() || ''
  const password = process.env.CLAWDBOT_GATEWAY_PASSWORD?.trim() || ''

  // For a minimal dashboard we require shared auth, otherwise we'd need a device identity signature.
  if (!token && !password) {
    throw new Error(
      'Missing gateway auth. Set CLAWDBOT_GATEWAY_TOKEN (recommended) or CLAWDBOT_GATEWAY_PASSWORD in the server environment.',
    )
  }

  return { url, token, password }
}

function buildConnectParams(token: string, password: string): ConnectParams {
  return {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: 'gateway-client',
      displayName: 'webclaw',
      version: 'dev',
      platform: process.platform,
      mode: 'ui',
      instanceId: randomUUID(),
    },
    auth: {
      token: token || undefined,
      password: password || undefined,
    },
    role: 'operator',
    scopes: ['operator.admin'],
  }
}

function createGatewayWaiter(): GatewayWaiter {
  const waiters = new Map<
    string,
    {
      resolve: (v: unknown) => void
      reject: (e: Error) => void
    }
  >()

  function waitForRes(id: string) {
    return new Promise<unknown>((resolve, reject) => {
      waiters.set(id, { resolve, reject })
    })
  }

  function handleMessage(evt: MessageEvent) {
    try {
      const data = typeof evt.data === 'string' ? evt.data : ''
      const parsed = JSON.parse(data) as GatewayFrame
      if (parsed.type !== 'res') return
      const w = waiters.get(parsed.id)
      if (!w) return
      waiters.delete(parsed.id)
      if (parsed.ok) w.resolve(parsed.payload)
      else w.reject(new Error(parsed.error?.message ?? 'gateway error'))
    } catch {
      // ignore parse errors
    }
  }

  return { waitForRes, handleMessage }
}

async function wsOpen(ws: WebSocket): Promise<void> {
  if (ws.readyState === ws.OPEN) return
  await new Promise<void>((resolve, reject) => {
    const onOpen = () => {
      cleanup()
      resolve()
    }
    const onError = (e: Event) => {
      cleanup()
      reject(new Error(`WebSocket error: ${String((e as any)?.message ?? e)}`))
    }
    const cleanup = () => {
      ws.removeEventListener('open', onOpen)
      ws.removeEventListener('error', onError)
    }
    ws.addEventListener('open', onOpen)
    ws.addEventListener('error', onError)
  })
}

async function wsClose(ws: WebSocket): Promise<void> {
  if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) return
  await new Promise<void>((resolve) => {
    ws.addEventListener('close', () => resolve(), { once: true })
    ws.close()
  })
}

export async function gatewayRpc<TPayload = unknown>(
  method: string,
  params?: unknown,
): Promise<TPayload> {
  const { url, token, password } = getGatewayConfig()

  const ws = new WebSocket(url)
  try {
    await wsOpen(ws)

    // 1) connect handshake (must be first request)
    const connectId = randomUUID()
    const connectParams = buildConnectParams(token, password)

    const connectReq: GatewayFrame = {
      type: 'req',
      id: connectId,
      method: 'connect',
      params: connectParams,
    }

    const requestId = randomUUID()
    const req: GatewayFrame = {
      type: 'req',
      id: requestId,
      method,
      params,
    }

    const waiter = createGatewayWaiter()

    ws.addEventListener('message', waiter.handleMessage)

    ws.send(JSON.stringify(connectReq))
    await waiter.waitForRes(connectId)

    ws.send(JSON.stringify(req))
    const payload = await waiter.waitForRes(requestId)

    ws.removeEventListener('message', waiter.handleMessage)
    return payload as TPayload
  } finally {
    try {
      await wsClose(ws)
    } catch {
      // ignore
    }
  }
}

export async function gatewayConnectCheck(): Promise<void> {
  const { url, token, password } = getGatewayConfig()

  const ws = new WebSocket(url)
  try {
    await wsOpen(ws)

    const connectId = randomUUID()
    const connectParams = buildConnectParams(token, password)
    const connectReq: GatewayFrame = {
      type: 'req',
      id: connectId,
      method: 'connect',
      params: connectParams,
    }

    const waiter = createGatewayWaiter()
    ws.addEventListener('message', waiter.handleMessage)
    ws.send(JSON.stringify(connectReq))
    await waiter.waitForRes(connectId)
    ws.removeEventListener('message', waiter.handleMessage)
  } finally {
    try {
      await wsClose(ws)
    } catch {
      // ignore
    }
  }
}

/**
 * Test a gateway connection with user-provided credentials.
 * Used by the connect screen to validate settings before the user
 * saves them to .env.local.
 */
export async function gatewayConnectTest(
  url: string,
  token: string,
  password: string,
): Promise<void> {
  if (!token && !password) {
    throw new Error('Provide a token or password.')
  }

  const ws = new WebSocket(url)
  try {
    await wsOpen(ws)

    const connectId = randomUUID()
    const connectParams = buildConnectParams(token, password)
    const connectReq: GatewayFrame = {
      type: 'req',
      id: connectId,
      method: 'connect',
      params: connectParams,
    }

    const waiter = createGatewayWaiter()
    ws.addEventListener('message', waiter.handleMessage)
    ws.send(JSON.stringify(connectReq))
    await waiter.waitForRes(connectId)
    ws.removeEventListener('message', waiter.handleMessage)
  } finally {
    try {
      await wsClose(ws)
    } catch {
      // ignore
    }
  }
}
