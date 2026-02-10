import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayRpc } from '../../server/gateway'

type CronJob = {
  id: string
  label?: string
  schedule?: string
  enabled?: boolean
  lastRun?: string
  nextRun?: string
  [key: string]: unknown
}

type CronListResponse = {
  jobs?: Array<CronJob>
}

type CronRunsResponse = {
  runs?: Array<Record<string, unknown>>
}

type CronRunResponse = {
  ok?: boolean
  [key: string]: unknown
}

type CronUpdateResponse = {
  ok?: boolean
  job?: CronJob
  [key: string]: unknown
}

export const Route = createFileRoute('/api/cron')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const jobId = url.searchParams.get('jobId')

          if (jobId) {
            const payload = await gatewayRpc<CronRunsResponse>('cron.runs', {
              jobId,
            })
            return json({ runs: payload.runs ?? [] })
          }

          const payload = await gatewayRpc<CronListResponse>('cron.list', {
            includeDisabled: true,
          })
          return json({ jobs: payload.jobs ?? [] })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          )
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<
            string,
            unknown
          >

          const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : ''
          if (!jobId) {
            return json(
              { ok: false, error: 'jobId is required' },
              { status: 400 },
            )
          }

          const payload = await gatewayRpc<CronRunResponse>('cron.run', {
            jobId,
          })

          return json({ ok: true, ...payload })
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
      PATCH: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<
            string,
            unknown
          >

          const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : ''
          if (!jobId) {
            return json(
              { ok: false, error: 'jobId is required' },
              { status: 400 },
            )
          }

          const patch =
            typeof body.patch === 'object' && body.patch !== null
              ? body.patch
              : {}

          const payload = await gatewayRpc<CronUpdateResponse>('cron.update', {
            jobId,
            patch,
          })

          return json({ ok: true, ...payload })
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
