import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  sign,
} from 'node:crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve as pathResolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import WebSocket from 'ws'
import type { KeyObject } from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DEVICE_KEYS_PATH = pathResolve(__dirname, '../../.device-keys.json')
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

type StoredDeviceKeys = {
  version: 2
  algorithm: 'ed25519'
  publicKeyPem: string
  privateKeyPem: string
  createdAtMs: number
}

type DeviceIdentity = {
  deviceId: string
  privateKey: KeyObject
  publicKeyRawBase64Url: string
}

function isStoredDeviceKeys(value: unknown): value is StoredDeviceKeys {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    candidate.version === 2 &&
    candidate.algorithm === 'ed25519' &&
    typeof candidate.publicKeyPem === 'string' &&
    typeof candidate.privateKeyPem === 'string'
  )
}

function base64UrlEncode(buf: Uint8Array): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function derivePublicKeyRaw(publicKey: KeyObject): Buffer {
  const spki = publicKey.export({ type: 'spki', format: 'der' }) as Buffer
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length)
  }
  return spki
}

function deriveDeviceIdFromRawPublicKey(rawPublicKey: Uint8Array): string {
  return createHash('sha256').update(rawPublicKey).digest('hex')
}

function importStoredKeyPair(stored: StoredDeviceKeys): {
  publicKey: KeyObject
  privateKey: KeyObject
} {
  const publicKey = createPublicKey(stored.publicKeyPem)
  const privateKey = createPrivateKey(stored.privateKeyPem)
  return { publicKey, privateKey }
}

function generateAndPersistKeyPair(): {
  publicKey: KeyObject
  privateKey: KeyObject
} {
  const keyPair = generateKeyPairSync('ed25519')
  const publicKeyPem = keyPair.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString()
  const privateKeyPem = keyPair.privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString()

  const payload: StoredDeviceKeys = {
    version: 2,
    algorithm: 'ed25519',
    publicKeyPem,
    privateKeyPem,
    createdAtMs: Date.now(),
  }

  mkdirSync(dirname(DEVICE_KEYS_PATH), { recursive: true })
  writeFileSync(DEVICE_KEYS_PATH, JSON.stringify(payload, null, 2) + '\n', {
    mode: 0o600,
  })
  try {
    chmodSync(DEVICE_KEYS_PATH, 0o600)
  } catch {
    // ignore chmod errors on unsupported filesystems
  }

  return { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey }
}

function loadOrCreateDeviceIdentity(): DeviceIdentity {
  let keyPair: { publicKey: KeyObject; privateKey: KeyObject } | null = null

  if (existsSync(DEVICE_KEYS_PATH)) {
    try {
      const stored = JSON.parse(readFileSync(DEVICE_KEYS_PATH, 'utf8')) as unknown
      if (isStoredDeviceKeys(stored)) {
        keyPair = importStoredKeyPair(stored)
      }
    } catch {
      // ignore parse/import errors and regenerate
    }
  }

  if (!keyPair) {
    keyPair = generateAndPersistKeyPair()
  }

  const rawPublicKey = derivePublicKeyRaw(keyPair.publicKey)
  const deviceId = deriveDeviceIdFromRawPublicKey(rawPublicKey)

  return {
    deviceId,
    privateKey: keyPair.privateKey,
    publicKeyRawBase64Url: base64UrlEncode(rawPublicKey),
  }
}

function signPayload(privateKey: KeyObject, payload: string): string {
  const signature = sign(null, Buffer.from(payload, 'utf8'), privateKey)
  return base64UrlEncode(signature)
}

let _deviceIdentityPromise: Promise<DeviceIdentity> | null = null
function getDeviceIdentity(): Promise<DeviceIdentity> {
  if (!_deviceIdentityPromise) {
    _deviceIdentityPromise = Promise.resolve(loadOrCreateDeviceIdentity())
  }
  return _deviceIdentityPromise
}

function reportPairingRequired(reason?: string) {
  void getDeviceIdentity()
    .then((identity) => {
      console.error(
        `[gateway-ws] Device auth rejected (${reason || 'policy violation'}). Device ID: ${identity.deviceId}`,
      )
      console.error(
        `[gateway-ws] If pairing is required, run: openclaw devices approve ${identity.deviceId}`,
      )
    })
    .catch(() => {
      console.error(
        `[gateway-ws] Device auth rejected (${reason || 'policy violation'}).`,
      )
    })
}

type GatewayFrame =
  | { type: 'req'; id: string; method: string; params?: unknown }
  | {
      type: 'res'
      id: string
      ok: boolean
      payload?: unknown
      error?: { code: string; message: string; details?: unknown }
    }
  | {
      type: 'event'
      event: string
      payload?: unknown
      seq?: number
      stateVersion?: number
    }

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
  device?: {
    id: string
    publicKey: string
    signature: string
    signedAt: number
    nonce?: string
  }
}

type GatewayWaiter = {
  waitForRes: (id: string) => Promise<unknown>
  handleMessage: (evt: MessageEvent) => void
}

type GatewayEventFrame = {
  type: 'event'
  event: string
  payload?: unknown
  seq?: number
  stateVersion?: number
}

type GatewayEventStreamOptions = {
  sessionKey?: string
  friendlyId?: string
  signal?: AbortSignal
  onEvent: (event: GatewayEventFrame) => void
  onError?: (error: Error) => void
}

type GatewayClient = {
  connect: () => Promise<void>
  sendReq: <TPayload = unknown>(
    method: string,
    params?: unknown,
  ) => Promise<TPayload>
  close: () => void
  setOnEvent: (handler?: (event: GatewayEventFrame) => void) => void
  setOnError: (handler?: (error: Error) => void) => void
  isClosed: () => boolean
}

type GatewayClientEntry = {
  key: string
  refs: number
  client: GatewayClient
}

type GatewayClientHandle = {
  client: GatewayClient
  release: () => void
}

const sharedGatewayClients = new Map<string, GatewayClientEntry>()

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

async function buildConnectParams(
  token: string,
  password: string,
): Promise<ConnectParams> {
  const clientId = 'gateway-client'
  const clientMode = 'ui'
  const role = 'operator'
  const scopes = ['operator.admin']

  const params: ConnectParams = {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: clientId,
      displayName: 'webclaw',
      version: 'dev',
      platform: process.platform,
      mode: clientMode,
      instanceId: randomUUID(),
    },
    auth: {
      token: token || undefined,
      password: password || undefined,
    },
    role,
    scopes,
  }

  try {
    const identity = await getDeviceIdentity()
    const signedAt = Date.now()
    const payload = [
      'v1',
      identity.deviceId,
      clientId,
      clientMode,
      role,
      scopes.join(','),
      String(signedAt),
      token || '',
    ].join('|')
    const signature = await signPayload(identity.privateKey, payload)

    params.device = {
      id: identity.deviceId,
      publicKey: identity.publicKeyRawBase64Url,
      signature,
      signedAt,
    }
  } catch (err) {
    console.warn(
      '[gateway-ws] Device auth unavailable, continuing without device signature:',
      err instanceof Error ? err.message : String(err),
    )
  }

  return params
}

async function connectGateway(ws: WebSocket): Promise<void> {
  const { token, password } = getGatewayConfig()
  await wsOpen(ws)
  const connectId = randomUUID()
  const connectParams = await buildConnectParams(token, password)
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
}

function createGatewayClient(): GatewayClient {
  const { url, token, password } = getGatewayConfig()
  const ws = new WebSocket(url)
  let closed = false
  let connected = false
  let onEvent: ((event: GatewayEventFrame) => void) | undefined
  let onError: ((error: Error) => void) | undefined
  const waiters = new Map<
    string,
    {
      resolve: (v: unknown) => void
      reject: (e: Error) => void
    }
  >()

  function rejectAll(error: Error) {
    for (const [, waiter] of waiters) {
      waiter.reject(error)
    }
    waiters.clear()
  }

  function handleMessage(evt: MessageEvent) {
    try {
      const data = typeof evt.data === 'string' ? evt.data : ''
      const parsed = JSON.parse(data) as GatewayFrame
      if (parsed.type === 'event') {
        if (onEvent) onEvent(parsed)
        return
      }
      if (parsed.type !== 'res') return
      const waiter = waiters.get(parsed.id)
      if (!waiter) return
      waiters.delete(parsed.id)
      if (parsed.ok) waiter.resolve(parsed.payload)
      else waiter.reject(new Error(parsed.error?.message ?? 'gateway error'))
    } catch {
      // ignore parse errors
    }
  }

  function handleError(err: Event) {
    if (onError) {
      onError(
        new Error(
          `Gateway client error: ${String((err as any)?.message ?? err)}`,
        ),
      )
    }
  }

  function handleClose(evt?: { code?: number; reason?: string }) {
    if (closed) return
    closed = true
    if (evt?.code === 1008) {
      reportPairingRequired(
        typeof evt.reason === 'string' ? evt.reason : undefined,
      )
    }
    rejectAll(new Error('Gateway client closed'))
  }

  ws.addEventListener('message', handleMessage)
  ws.addEventListener('error', handleError)
  ws.addEventListener('close', handleClose)

  async function connect() {
    if (connected || closed) return
    await wsOpen(ws)
    const connectId = randomUUID()
    const connectParams = await buildConnectParams(token, password)
    const connectReq: GatewayFrame = {
      type: 'req',
      id: connectId,
      method: 'connect',
      params: connectParams,
    }
    const waitForRes = new Promise<unknown>((resolve, reject) => {
      waiters.set(connectId, { resolve, reject })
    })
    ws.send(JSON.stringify(connectReq))
    await waitForRes
    connected = true
  }

  function sendReq<TPayload = unknown>(method: string, params?: unknown) {
    if (closed) {
      return Promise.reject(new Error('Gateway client closed'))
    }
    const id = randomUUID()
    const req: GatewayFrame = {
      type: 'req',
      id,
      method,
      params,
    }
    const waitForRes = new Promise<unknown>((resolve, reject) => {
      waiters.set(id, { resolve, reject })
    })
    ws.send(JSON.stringify(req))
    return waitForRes as Promise<TPayload>
  }

  function close() {
    if (closed) return
    closed = true
    ws.removeEventListener('message', handleMessage)
    ws.removeEventListener('error', handleError)
    ws.removeEventListener('close', handleClose)
    rejectAll(new Error('Gateway client closed'))
    void wsClose(ws)
  }

  function setOnEvent(handler?: (event: GatewayEventFrame) => void) {
    onEvent = handler
  }

  function setOnError(handler?: (error: Error) => void) {
    onError = handler
  }

  function isClosed() {
    return closed
  }

  return { connect, sendReq, close, setOnEvent, setOnError, isClosed }
}

export async function acquireGatewayClient(
  key: string,
  options?: {
    onEvent?: (event: GatewayEventFrame) => void
    onError?: (error: Error) => void
  },
): Promise<GatewayClientHandle> {
  const existing = sharedGatewayClients.get(key)
  if (existing && !existing.client.isClosed()) {
    existing.refs += 1
    if (options?.onEvent) existing.client.setOnEvent(options.onEvent)
    if (options?.onError) existing.client.setOnError(options.onError)
    return {
      client: existing.client,
      release: function release() {
        releaseGatewayClient(key)
      },
    }
  }

  const client = createGatewayClient()
  if (options?.onEvent) client.setOnEvent(options.onEvent)
  if (options?.onError) client.setOnError(options.onError)
  await client.connect()
  sharedGatewayClients.set(key, { key, refs: 1, client })
  return {
    client,
    release: function release() {
      releaseGatewayClient(key)
    },
  }
}

function releaseGatewayClient(key: string) {
  const entry = sharedGatewayClients.get(key)
  if (!entry) return
  entry.refs -= 1
  if (entry.refs > 0) return
  entry.client.close()
  sharedGatewayClients.delete(key)
}

export async function gatewayRpcShared<TPayload = unknown>(
  method: string,
  params: unknown,
  key?: string,
): Promise<TPayload> {
  if (key) {
    const entry = sharedGatewayClients.get(key)
    if (entry && !entry.client.isClosed()) {
      await entry.client.connect()
      return entry.client.sendReq<TPayload>(method, params)
    }
  }
  return gatewayRpc<TPayload>(method, params)
}

export function gatewayEventStream({
  sessionKey,
  friendlyId,
  signal,
  onEvent,
  onError,
}: GatewayEventStreamOptions) {
  const { url } = getGatewayConfig()
  const ws = new WebSocket(url)
  let closed = false

  function handleMessage(evt: MessageEvent) {
    try {
      const data = typeof evt.data === 'string' ? evt.data : ''
      const parsed = JSON.parse(data) as GatewayFrame
      if (parsed.type !== 'event') return
      onEvent(parsed)
    } catch {
      // ignore parse errors
    }
  }

  function handleError(err: Event) {
    if (onError) {
      onError(
        new Error(
          `Gateway event stream error: ${String((err as any)?.message ?? err)}`,
        ),
      )
    }
  }

  function handleClose(evt?: { code?: number; reason?: string }) {
    if (closed) return
    closed = true
    if (evt?.code === 1008) {
      reportPairingRequired(
        typeof evt.reason === 'string' ? evt.reason : undefined,
      )
    }
  }

  ws.addEventListener('message', handleMessage)
  ws.addEventListener('error', handleError)
  ws.addEventListener('close', handleClose)

  void connectGateway(ws)
    .then(async () => {
      if (!sessionKey && !friendlyId) return
      const subscribeReq: GatewayFrame = {
        type: 'req',
        id: randomUUID(),
        method: 'chat.subscribe',
        params: {
          sessionKey: sessionKey || undefined,
          friendlyId: friendlyId || undefined,
        },
      }
      const waiter = createGatewayWaiter()
      ws.addEventListener('message', waiter.handleMessage)
      try {
        ws.send(JSON.stringify(subscribeReq))
        await waiter.waitForRes(subscribeReq.id)
      } catch (err) {
        if (onError) {
          onError(err instanceof Error ? err : new Error(String(err)))
        }
        close()
      } finally {
        ws.removeEventListener('message', waiter.handleMessage)
      }
    })
    .catch((err) => {
      if (onError) onError(err instanceof Error ? err : new Error(String(err)))
    })

  if (signal) {
    signal.addEventListener(
      'abort',
      () => {
        close()
      },
      { once: true },
    )
  }

  function close() {
    if (closed) return
    closed = true
    ws.removeEventListener('message', handleMessage)
    ws.removeEventListener('error', handleError)
    ws.removeEventListener('close', handleClose)
    void wsClose(ws)
  }

  return close
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
    const connectParams = await buildConnectParams(token, password)

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
    const connectParams = await buildConnectParams(token, password)
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
