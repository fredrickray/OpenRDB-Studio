import type { Project } from '@/lib/projects'
import { buildOpenInStudioUrl } from '@/lib/projects'

/** Must match apps/frontendui/src-tauri/src/bridge.rs */
export const STUDIO_BRIDGE_URL = 'http://127.0.0.1:17345'

export type OpenInStudioResult = 'bridge' | 'deeplink' | 'unavailable'

export function projectToConnectPayload(project: Project) {
  return {
    name: `${project.name} (${project.environment})`,
    host: project.host,
    port: project.port,
    username: project.username,
    password: project.password,
    database: project.database,
    sslRequired: project.ssl,
  }
}

/** Prefer localhost bridge (Studio running); fall back to openrdb:// deep link. */
export async function openInStudio(project: Project): Promise<OpenInStudioResult> {
  const payload = projectToConnectPayload(project)

  try {
    const health = await fetch(`${STUDIO_BRIDGE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(800),
    })
    if (health.ok) {
      const res = await fetch(`${STUDIO_BRIDGE_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) return 'bridge'
    }
  } catch {
    // Studio not running or bridge blocked — try deep link
  }

  try {
    window.location.href = buildOpenInStudioUrl(project)
    return 'deeplink'
  } catch {
    return 'unavailable'
  }
}

export async function isStudioRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${STUDIO_BRIDGE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(600),
    })
    return res.ok
  } catch {
    return false
  }
}
