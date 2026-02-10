import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

type ServiceEntry = {
  id: string
  name: string
  description: string
  port: number
  healthCheckUrl: string
  repo: string
  status: 'enabled' | 'disabled'
}

type ServicesConfig = {
  services: Array<ServiceEntry>
}

type ServiceWithHealth = ServiceEntry & {
  healthy: boolean
  healthError?: string
}

const CONFIG_PATH = resolve(
  import.meta.dirname ?? __dirname,
  '../server/services-config.json',
)

async function readConfig(): Promise<ServicesConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8')
    return JSON.parse(raw) as ServicesConfig
  } catch {
    return { services: [] }
  }
}

async function writeConfig(config: ServicesConfig): Promise<void> {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8')
}

async function checkHealth(url: string): Promise<{ healthy: boolean; error?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    return { healthy: res.ok }
  } catch (err) {
    return {
      healthy: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export const Route = createFileRoute('/api/services')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const config = await readConfig()

          const results: Array<ServiceWithHealth> = await Promise.all(
            config.services.map(async (svc) => {
              if (!svc.healthCheckUrl) {
                return { ...svc, healthy: false, healthError: 'no healthCheckUrl configured' }
              }
              const health = await checkHealth(svc.healthCheckUrl)
              return {
                ...svc,
                healthy: health.healthy,
                healthError: health.error,
              }
            }),
          )

          return json({ services: results })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          )
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

          const name = typeof body.name === 'string' ? body.name.trim() : ''
          if (!name) {
            return json({ ok: false, error: 'name is required' }, { status: 400 })
          }

          const entry: ServiceEntry = {
            id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : name.toLowerCase().replace(/\s+/g, '-'),
            name,
            description: typeof body.description === 'string' ? body.description : '',
            port: typeof body.port === 'number' ? body.port : 0,
            healthCheckUrl: typeof body.healthCheckUrl === 'string' ? body.healthCheckUrl : '',
            repo: typeof body.repo === 'string' ? body.repo : '',
            status: body.status === 'disabled' ? 'disabled' : 'enabled',
          }

          const config = await readConfig()
          const idx = config.services.findIndex((s) => s.id === entry.id)
          if (idx >= 0) {
            config.services[idx] = entry
          } else {
            config.services.push(entry)
          }

          await writeConfig(config)

          return json({ ok: true, service: entry })
        } catch (err) {
          return json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          )
        }
      },
      DELETE: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const id = url.searchParams.get('id') ?? ''
          if (!id) {
            return json({ ok: false, error: 'id is required' }, { status: 400 })
          }

          const config = await readConfig()
          const idx = config.services.findIndex((s) => s.id === id)
          if (idx < 0) {
            return json({ ok: false, error: 'service not found' }, { status: 404 })
          }

          config.services.splice(idx, 1)
          await writeConfig(config)

          return json({ ok: true })
        } catch (err) {
          return json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          )
        }
      },
    },
  },
})
