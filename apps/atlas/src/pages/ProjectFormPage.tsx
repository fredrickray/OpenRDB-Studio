import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppLogo } from '@/components/AppLogo'
import {
  createProject,
  getProject,
  parsePostgresUrl,
  updateProject,
  type ProjectEnvironment,
} from '@/lib/projects'

export function ProjectFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const existing = id ? getProject(id) : undefined
  const navigate = useNavigate()

  const [name, setName] = useState(existing?.name ?? '')
  const [environment, setEnvironment] = useState<ProjectEnvironment>(
    existing?.environment ?? 'staging'
  )
  const [connectionString, setConnectionString] = useState(
    existing?.connectionString ?? ''
  )
  const [error, setError] = useState('')

  const preview = useMemo(() => parsePostgresUrl(connectionString), [connectionString])

  if (isEdit && !existing) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">Project not found.</p>
        <Link to="/projects" className="mt-4 inline-block text-sm text-[var(--color-primary)] hover:underline">
          Back to projects
        </Link>
      </div>
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Enter a project name')
      return
    }
    if (!preview.ok) {
      setError(preview.error)
      return
    }
    try {
      if (isEdit && id) {
        updateProject(id, { name, environment, connectionString })
      } else {
        createProject({ name, environment, connectionString })
      }
      navigate('/projects')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save project')
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-card-border)] bg-[var(--color-card)]/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-6">
          <Link to="/projects" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <AppLogo size="sm" />
            <span className="text-sm font-semibold tracking-tight">Projects</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? 'Edit project' : 'New project'}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Paste a Postgres URL from Neon, RDS, Supabase, or your own server.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="project-name" className="mb-1.5 block text-xs font-medium text-[var(--color-muted-foreground)]">
              Project name
            </label>
            <input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]/50"
              placeholder="Acme CRM"
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-[var(--color-muted-foreground)]">
              Environment
            </legend>
            <div className="flex gap-2">
              {(['staging', 'production'] as const).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvironment(env)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ${
                    environment === env
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-foreground)]'
                      : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]/30'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="conn" className="mb-1.5 block text-xs font-medium text-[var(--color-muted-foreground)]">
              Connection string
            </label>
            <textarea
              id="conn"
              rows={3}
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-[var(--color-card-border)] bg-[var(--color-code-bg)] px-3.5 py-2.5 font-mono text-xs outline-none transition focus:border-[var(--color-primary)]/50"
              placeholder="postgresql://user:password@host:5432/dbname?sslmode=require"
            />
          </div>

          {connectionString.trim() && (
            <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-background)] px-4 py-3 text-xs">
              {preview.ok ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[var(--color-muted-foreground)]">
                  <dt>host</dt>
                  <dd className="text-[var(--color-foreground)]">{preview.value.host}</dd>
                  <dt>port</dt>
                  <dd className="text-[var(--color-foreground)]">{preview.value.port}</dd>
                  <dt>database</dt>
                  <dd className="text-[var(--color-foreground)]">{preview.value.database}</dd>
                  <dt>user</dt>
                  <dd className="text-[var(--color-foreground)]">{preview.value.username}</dd>
                  <dt>ssl</dt>
                  <dd className="text-[var(--color-foreground)]">{preview.value.ssl ? 'yes' : 'no'}</dd>
                </dl>
              ) : (
                <p className="text-amber-400">{preview.error}</p>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              {isEdit ? 'Save changes' : 'Create project'}
            </button>
            <Link
              to="/projects"
              className="rounded-xl border border-[var(--color-card-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
