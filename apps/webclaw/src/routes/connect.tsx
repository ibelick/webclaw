import { useState, useCallback, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  Copy01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from '@/components/ui/collapsible'
import { CodeBlock } from '@/components/prompt-kit/code-block'

export const Route = createFileRoute('/connect')({
  component: ConnectRoute,
})

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

function ConnectRoute() {
  const [gatewayUrl, setGatewayUrl] = useState('ws://127.0.0.1:18789')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<TestStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const envSnippet = useMemo(() => {
    const lines = [`CLAWDBOT_GATEWAY_URL=${gatewayUrl}`]
    if (token) {
      lines.push(`CLAWDBOT_GATEWAY_TOKEN=${token}`)
    } else if (password) {
      lines.push(`CLAWDBOT_GATEWAY_PASSWORD=${password}`)
    } else {
      lines.push(`CLAWDBOT_GATEWAY_TOKEN=YOUR_TOKEN_HERE`)
    }
    return lines.join('\n')
  }, [gatewayUrl, token, password])

  const canTest = token.trim() !== '' || password.trim() !== ''

  const handleTest = useCallback(async () => {
    if (!canTest) return
    setStatus('testing')
    setErrorMessage('')

    try {
      const res = await fetch('/api/connect-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: gatewayUrl.trim(),
          token: token.trim() || undefined,
          password: password.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => 'Request failed')
        setStatus('error')
        setErrorMessage(text)
        return
      }

      const data = (await res.json().catch(() => ({ ok: false, error: 'Invalid response' }))) as {
        ok: boolean
        error?: string
      }

      if (data.ok) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(data.error ?? 'Connection failed.')
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Network error — is the dev server running?',
      )
    }
  }, [canTest, gatewayUrl, token, password])

  return (
    <div className="min-h-screen bg-primary-50 text-primary-900">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        <div className="space-y-3">
          <h1 className="text-3xl font-medium tracking-[-0.02em] text-center mb-4">
            Connect to WebClaw
          </h1>
          <p className="text-primary-700 text-center">
            Enter your OpenClaw gateway details to get started.
          </p>
        </div>

        {/* Connection form */}
        <div className="space-y-5 rounded-xl border border-primary-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {/* Gateway URL */}
            <div className="space-y-1.5">
              <label
                htmlFor="gateway-url"
                className="block text-sm font-medium text-primary-700"
              >
                Gateway URL
              </label>
              <input
                id="gateway-url"
                type="text"
                value={gatewayUrl}
                onChange={(e) => {
                  setGatewayUrl(e.target.value)
                  setStatus('idle')
                }}
                placeholder="ws://127.0.0.1:18789"
                className="w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-colors"
              />
              <p className="text-xs text-primary-500">
                Your OpenClaw gateway WebSocket endpoint.
              </p>
            </div>

            {/* Token */}
            <div className="space-y-1.5">
              <label
                htmlFor="gateway-token"
                className="block text-sm font-medium text-primary-700"
              >
                Token{' '}
                <span className="font-normal text-primary-500">
                  (recommended)
                </span>
              </label>
              <input
                id="gateway-token"
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value)
                  setPassword('')
                  setStatus('idle')
                }}
                placeholder="Paste your gateway token"
                className="w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-colors"
              />
              <p className="text-xs text-primary-500">
                Matches{' '}
                <code className="inline-code">gateway.auth.token</code> or{' '}
                <code className="inline-code">OPENCLAW_GATEWAY_TOKEN</code>.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="gateway-password"
                className="block text-sm font-medium text-primary-700"
              >
                Password{' '}
                <span className="font-normal text-primary-500">
                  (fallback)
                </span>
              </label>
              <input
                id="gateway-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setToken('')
                  setStatus('idle')
                }}
                placeholder="Or use your gateway password"
                className="w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-colors"
              />
              <p className="text-xs text-primary-500">
                Matches{' '}
                <code className="inline-code">gateway.auth.password</code>.
              </p>
            </div>
          </div>

          {/* Test Connection button */}
          <Button
            onClick={() => {
              handleTest()
            }}
            disabled={!canTest || status === 'testing'}
            className="w-full"
          >
            {status === 'testing' ? (
              <>
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-primary-50 border-t-transparent" />
                Testing connection…
              </>
            ) : status === 'success' ? (
              <>
                <HugeiconsIcon icon={Tick02Icon} size={16} />
                Connection successful
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          {/* Status messages */}
          {status === 'success' && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">Connected successfully!</p>
              <p className="mt-1 text-green-700">
                Your credentials are valid. Save the{' '}
                <code className="inline-code">.env.local</code> file below
                and restart the dev server to start chatting.
              </p>
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-medium">Connection failed</p>
              <p className="mt-1 text-red-700">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Generated .env.local snippet */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary-700">
            {status === 'success'
              ? '✓ Save this as .env.local in the project root, then restart:'
              : 'Your .env.local — save this file and restart the dev server:'}
          </p>
          <CodeBlock
            content={envSnippet}
            ariaLabel="Copy .env.local content"
            language="bash"
          />
          <CodeBlock
            content="npm run dev"
            ariaLabel="Copy restart command"
            language="bash"
          />
          <p className="text-sm text-primary-600">
            After restarting, refresh the page and you should be connected.
          </p>
        </div>

        {/* Manual setup collapsible */}
        <Collapsible>
          <CollapsibleTrigger>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={14}
              className="transition-transform group-data-panel-open:rotate-180"
            />
            Manual setup instructions
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <div className="space-y-4 pt-3 text-primary-700 text-sm">
              <p>
                At the root of the project, create a new file named{' '}
                <code className="inline-code">.env.local</code>.
              </p>
              <div className="space-y-3">
                <p>Paste this into it:</p>
                <CodeBlock
                  content={`CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789\nCLAWDBOT_GATEWAY_TOKEN=YOUR_TOKEN_HERE`}
                  ariaLabel="Copy gateway token example"
                  language="bash"
                />
                <p className="text-primary-600 text-sm">or:</p>
                <CodeBlock
                  content="CLAWDBOT_GATEWAY_PASSWORD=YOUR_PASSWORD_HERE"
                  ariaLabel="Copy gateway password example"
                  language="bash"
                />
              </div>
              <p>
                Environment variables are loaded at startup. Restart your dev
                server:
              </p>
              <CodeBlock
                content="npm run dev"
                ariaLabel="Copy npm run dev"
                language="bash"
              />
              <p>
                Refresh the page after the restart and you should be connected.
              </p>
            </div>
          </CollapsiblePanel>
        </Collapsible>

        {/* Where to find values */}
        <div className="space-y-3 rounded-lg border border-primary-200 bg-primary-100 px-4 py-3 text-primary-700 text-sm">
          <p className="text-primary-900 font-medium">
            Where to find these values
          </p>
          <div className="space-y-3">
            <p>
              <code className="inline-code">CLAWDBOT_GATEWAY_URL</code>
              <br />
              Your OpenClaw gateway endpoint (default is{' '}
              <code className="inline-code">ws://127.0.0.1:18789</code>).
            </p>
            <p>
              <code className="inline-code">CLAWDBOT_GATEWAY_TOKEN</code>{' '}
              (recommended)
              <br />
              Matches your Gateway token (
              <code className="inline-code">gateway.auth.token</code> or{' '}
              <code className="inline-code">OPENCLAW_GATEWAY_TOKEN</code>).
            </p>
            <p>
              <code className="inline-code">CLAWDBOT_GATEWAY_PASSWORD</code>{' '}
              (fallback)
              <br />
              Matches your Gateway password (
              <code className="inline-code">gateway.auth.password</code>).
            </p>
          </div>
          <p>
            Gateway docs:{' '}
            <a
              className="text-primary-700 hover:text-primary-900 underline"
              href="https://docs.openclaw.ai/gateway"
              target="_blank"
              rel="noreferrer"
            >
              https://docs.openclaw.ai/gateway
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
