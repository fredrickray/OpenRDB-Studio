const PROJECTS_KEY = 'openrdb-atlas-projects'

export type ProjectEnvironment = 'staging' | 'production'

export interface ParsedConnection {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
}

export interface Project {
  id: string
  name: string
  environment: ProjectEnvironment
  connectionString: string
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
  createdAt: string
  updatedAt: string
}

export type ParseResult =
  | { ok: true; value: ParsedConnection }
  | { ok: false; error: string }

/** Parse postgresql:// or postgres:// connection URLs. */
export function parsePostgresUrl(input: string): ParseResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, error: 'Connection string is required' }
  }

  if (!/^postgres(ql)?:\/\//i.test(trimmed)) {
    return { ok: false, error: 'Use a postgres:// or postgresql:// URL' }
  }

  let url: URL
  try {
    // Browser URL parser accepts https; rewrite scheme for parsing only.
    url = new URL(trimmed.replace(/^postgres(ql)?:\/\//i, 'https://'))
  } catch {
    return { ok: false, error: 'Could not parse connection string' }
  }

  const host = url.hostname
  if (!host) {
    return { ok: false, error: 'Host is missing' }
  }

  const port = url.port ? Number(url.port) : 5432
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return { ok: false, error: 'Port is invalid' }
  }

  const database =
    decodeURIComponent(url.pathname.replace(/^\//, '')).split('/')[0] || 'postgres'
  const username = decodeURIComponent(url.username || '')
  const password = decodeURIComponent(url.password || '')

  if (!username) {
    return { ok: false, error: 'Username is missing' }
  }

  const sslmode = (url.searchParams.get('sslmode') || '').toLowerCase()
  const ssl =
    sslmode === 'require' ||
    sslmode === 'verify-ca' ||
    sslmode === 'verify-full' ||
    url.searchParams.get('ssl') === 'true'

  return {
    ok: true,
    value: { host, port, database, username, password, ssl },
  }
}

function readAll(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Project[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

export function listProjects(): Project[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function getProject(id: string): Project | undefined {
  return readAll().find((p) => p.id === id)
}

export function createProject(input: {
  name: string
  environment: ProjectEnvironment
  connectionString: string
}): Project {
  const parsed = parsePostgresUrl(input.connectionString)
  if (!parsed.ok) {
    throw new Error(parsed.error)
  }

  const now = new Date().toISOString()
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    environment: input.environment,
    connectionString: input.connectionString.trim(),
    ...parsed.value,
    createdAt: now,
    updatedAt: now,
  }

  writeAll([...readAll(), project])
  return project
}

export function updateProject(
  id: string,
  input: {
    name: string
    environment: ProjectEnvironment
    connectionString: string
  }
): Project {
  const parsed = parsePostgresUrl(input.connectionString)
  if (!parsed.ok) {
    throw new Error(parsed.error)
  }

  const projects = readAll()
  const index = projects.findIndex((p) => p.id === id)
  if (index === -1) {
    throw new Error('Project not found')
  }

  const updated: Project = {
    ...projects[index],
    name: input.name.trim(),
    environment: input.environment,
    connectionString: input.connectionString.trim(),
    ...parsed.value,
    updatedAt: new Date().toISOString(),
  }

  projects[index] = updated
  writeAll(projects)
  return updated
}

export function deleteProject(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id))
}

/** Build deep link that Studio listens for. */
export function buildOpenInStudioUrl(project: Project): string {
  const params = new URLSearchParams({
    host: project.host,
    port: String(project.port),
    user: project.username,
    password: project.password,
    database: project.database,
    ssl: project.ssl ? '1' : '0',
    name: `${project.name} (${project.environment})`,
  })
  return `openrdb://connect?${params.toString()}`
}
