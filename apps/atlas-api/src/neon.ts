const NEON_API = 'https://console.neon.tech/api/v2'

export type Environment = 'staging' | 'production'

export interface ProvisionResult {
  connectionUri: string
  neonProjectId: string
  neonBranchId: string
  database: string
  host: string
  role: string
}

interface NeonCreateProjectResponse {
  project: { id: string; name: string }
  connection_uris?: Array<{
    connection_uri: string
    connection_parameters?: {
      database?: string
      host?: string
      role?: string
      password?: string
    }
  }>
  branches?: Array<{ id: string; name: string; default?: boolean }>
}

function apiKey(): string {
  const key = process.env.NEON_API_KEY?.trim()
  if (!key) {
    throw new Error('NEON_API_KEY is not configured on the Atlas API')
  }
  return key
}

export function isNeonConfigured(): boolean {
  return Boolean(process.env.NEON_API_KEY?.trim())
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'project'
}

async function neonFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${NEON_API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
}

/**
 * Creates a Neon project (and default DB). For staging, also creates a
 * child branch named "staging" and returns that branch's connection URI.
 */
export async function provisionNeonDatabase(input: {
  name: string
  environment: Environment
}): Promise<ProvisionResult> {
  const regionId = process.env.NEON_REGION_ID?.trim() || 'aws-us-east-1'
  const pgVersion = Number(process.env.NEON_PG_VERSION || '16')
  const projectName = `openrdb-${slugify(input.name)}-${input.environment}`.slice(0, 64)

  const createRes = await neonFetch('/projects', {
    method: 'POST',
    body: JSON.stringify({
      project: {
        name: projectName,
        region_id: regionId,
        pg_version: Number.isFinite(pgVersion) ? pgVersion : 16,
      },
    }),
  })

  if (!createRes.ok) {
    const body = await createRes.text()
    throw new Error(`Neon create project failed (${createRes.status}): ${body}`)
  }

  const created = (await createRes.json()) as NeonCreateProjectResponse
  const neonProjectId = created.project.id
  const defaultBranch =
    created.branches?.find((b) => b.default) || created.branches?.[0]
  const defaultUri = created.connection_uris?.[0]?.connection_uri
  const defaultParams = created.connection_uris?.[0]?.connection_parameters

  if (!defaultUri) {
    throw new Error('Neon did not return a connection URI')
  }

  // Production uses the default (main) branch.
  if (input.environment === 'production' || !defaultBranch) {
    return {
      connectionUri: defaultUri,
      neonProjectId,
      neonBranchId: defaultBranch?.id || '',
      database: defaultParams?.database || 'neondb',
      host: defaultParams?.host || '',
      role: defaultParams?.role || '',
    }
  }

  // Staging: create a child branch from main.
  const branchRes = await neonFetch(`/projects/${neonProjectId}/branches`, {
    method: 'POST',
    body: JSON.stringify({
      branch: {
        name: 'staging',
        parent_id: defaultBranch.id,
      },
      endpoints: [{ type: 'read_write' }],
    }),
  })

  if (!branchRes.ok) {
    const body = await branchRes.text()
    // Fall back to main connection if branch creation fails.
    console.warn(`Neon staging branch failed (${branchRes.status}): ${body}`)
    return {
      connectionUri: defaultUri,
      neonProjectId,
      neonBranchId: defaultBranch.id,
      database: defaultParams?.database || 'neondb',
      host: defaultParams?.host || '',
      role: defaultParams?.role || '',
    }
  }

  const branchData = (await branchRes.json()) as {
    branch?: { id: string }
    connection_uris?: Array<{
      connection_uri: string
      connection_parameters?: {
        database?: string
        host?: string
        role?: string
      }
    }>
  }

  const stagingUri = branchData.connection_uris?.[0]?.connection_uri || defaultUri
  const stagingParams = branchData.connection_uris?.[0]?.connection_parameters || defaultParams

  return {
    connectionUri: stagingUri,
    neonProjectId,
    neonBranchId: branchData.branch?.id || defaultBranch.id,
    database: stagingParams?.database || 'neondb',
    host: stagingParams?.host || '',
    role: stagingParams?.role || '',
  }
}

export async function deleteNeonProject(projectId: string): Promise<void> {
  if (!projectId) return
  const res = await neonFetch(`/projects/${projectId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    const body = await res.text()
    throw new Error(`Neon delete project failed (${res.status}): ${body}`)
  }
}
