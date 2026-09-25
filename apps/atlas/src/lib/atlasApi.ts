export interface ProvisionStatus {
  available: boolean
  message: string
}

export interface ProvisionResponse {
  connectionUri: string
  neonProjectId: string
  neonBranchId: string
  database: string
  host: string
  role: string
  environment: 'staging' | 'production'
  name: string
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export async function getProvisionStatus(): Promise<ProvisionStatus> {
  try {
    return await api<ProvisionStatus>('/api/provision/status')
  } catch {
    return {
      available: false,
      message:
        'Atlas API is not running. Start apps/atlas-api (npm run dev) and set NEON_API_KEY.',
    }
  }
}

export async function provisionNeonProject(input: {
  name: string
  environment: 'staging' | 'production'
}): Promise<ProvisionResponse> {
  return api<ProvisionResponse>('/api/provision', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function deleteNeonProvision(neonProjectId: string): Promise<void> {
  await api<{ ok: boolean }>(`/api/provision/${encodeURIComponent(neonProjectId)}`, {
    method: 'DELETE',
  })
}
