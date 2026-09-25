import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  deleteNeonProject,
  isNeonConfigured,
  provisionNeonDatabase,
  type Environment,
} from './neon.js'
import { loadEnvFile } from './env.js'

loadEnvFile()

const app = new Hono()

app.use(
  '*',
  cors({
    origin: ['http://localhost:5174', 'http://127.0.0.1:5174'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
)

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    neonConfigured: isNeonConfigured(),
  })
)

app.get('/api/provision/status', (c) =>
  c.json({
    available: isNeonConfigured(),
    message: isNeonConfigured()
      ? 'Neon provisioning is ready'
      : 'Set NEON_API_KEY in apps/atlas-api/.env to enable Create with Neon',
  })
)

app.post('/api/provision', async (c) => {
  if (!isNeonConfigured()) {
    return c.json(
      {
        error:
          'Neon is not configured. Add NEON_API_KEY to apps/atlas-api/.env (see .env.example).',
      },
      503
    )
  }

  let body: { name?: string; environment?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const name = body.name?.trim()
  const environment = body.environment as Environment | undefined

  if (!name) {
    return c.json({ error: 'name is required' }, 400)
  }
  if (environment !== 'staging' && environment !== 'production') {
    return c.json({ error: 'environment must be staging or production' }, 400)
  }

  try {
    const result = await provisionNeonDatabase({ name, environment })
    return c.json({
      connectionUri: result.connectionUri,
      neonProjectId: result.neonProjectId,
      neonBranchId: result.neonBranchId,
      database: result.database,
      host: result.host,
      role: result.role,
      environment,
      name,
    })
  } catch (err) {
    console.error(err)
    return c.json(
      {
        error: err instanceof Error ? err.message : 'Failed to provision database',
      },
      502
    )
  }
})

app.delete('/api/provision/:neonProjectId', async (c) => {
  if (!isNeonConfigured()) {
    return c.json({ error: 'Neon is not configured' }, 503)
  }

  const neonProjectId = c.req.param('neonProjectId')
  try {
    await deleteNeonProject(neonProjectId)
    return c.json({ ok: true })
  } catch (err) {
    console.error(err)
    return c.json(
      {
        error: err instanceof Error ? err.message : 'Failed to delete Neon project',
      },
      502
    )
  }
})

const port = Number(process.env.PORT || 8787)

console.log(`Atlas API listening on http://localhost:${port}`)
console.log(
  isNeonConfigured()
    ? 'Neon provisioning: enabled'
    : 'Neon provisioning: disabled (set NEON_API_KEY)'
)

serve({ fetch: app.fetch, port })
