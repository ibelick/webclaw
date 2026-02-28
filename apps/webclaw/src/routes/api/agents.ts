import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayRpc } from '../../server/gateway'

type AgentsListGatewayResponse = {
  agents?: Array<Record<string, unknown>>
}

export const Route = createFileRoute('/api/agents')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const payload = await gatewayRpc<AgentsListGatewayResponse>(
            'agents.list',
            {},
          )
          const agents = Array.isArray(payload.agents) ? payload.agents : []
          const defaultAgentId =
            (process.env.CLAWDBOT_AGENT_ID || 'main').trim() || 'main'
          return json({ agents, defaultAgentId })
        } catch (err) {
          return json(
            {
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
