import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayConnectTest } from '../../server/gateway'

export const Route = createFileRoute('/api/connect-test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            url?: string
            token?: string
            password?: string
          }

          const url = (body.url || 'ws://127.0.0.1:18789').trim()
          const token = (body.token || '').trim()
          const password = (body.password || '').trim()

          if (!token && !password) {
            return json(
              { ok: false, error: 'Provide a token or password.' },
              { status: 400 },
            )
          }

          await gatewayConnectTest(url, token, password)
          return json({ ok: true })
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 503 },
          )
        }
      },
    },
  },
})
