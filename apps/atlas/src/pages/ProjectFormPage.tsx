import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppLogo } from '@/components/AppLogo'
import { getProvisionStatus, provisionNeonProject } from '@/lib/atlasApi'
import {
  createProject,
  getProject,
  parsePostgresUrl,
  updateProject,
  type ProjectEnvironment,
} from '@/lib/projects'

type Mode = 'neon' | 'paste'

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
  const [mode, setMode] = useState<Mode>(
    isEdit ? 'paste' : 'neon'
  )
  const [error, setError] = useState('')
  const [provisioning, setProvisioning] = useState(false)
  const [neonAvailable, setNeonAvailable] = useState<boolean | null>(null)
  const [neonMessage, setNeonMessage] = useState('')

  const preview = useMemo(() => parsePostgresUrl(connectionString), [connectionString])

  useEffect(() => {
    if (isEdit) return
    void getProvisionStatus().then((status) => {
      setNeonAvailable(status.available)
      setNeonMessage(status.message)
      if (!status.available) setMode('paste')
    })
  }, [isEdit])

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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Enter a project name')
      return
    }

    try {
      if (isEdit && id) {
        if (!preview.ok) {
          setError(preview.error)
          return
        }
        updateProject(id, { name, environment, connectionString })
        navigate('/projects')
        return
      }

      if (mode === 'neon') {
        setProvisioning(true)
        try {
          const result = await provisionNeonProject({ name, environment })
          createProject({
            name,
            environment,
            connectionString: result.connectionUri,
            source: 'neon',
            neonProjectId: result.neonProjectId,
            neonBranchId: result.neonBranchId,
          })
          navigate('/projects')
        } finally {
          setProvisioning(false)
        }
        return
      }

      if (!preview.ok) {
        setError(preview.error)
        return
      }
      createProject({ name, environment, connectionString, source: 'paste' })
      navigate('/projects')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save project')
      setProvisioning(false)
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
          {isEdit
            ? 'Update the project name, environment, or connection string.'
            : 'Create a Postgres database on Neon, or paste an existing connection string.'}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {!isEdit && (
            <fieldset>
              <legend className="mb-1.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                How do you want to add it?
              </legend>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('neon')}
                  disabled={neonAvailable === false}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    mode === 'neon'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-foreground)]'
                      : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]/30'
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Create with Neon
                </button>
                <button
                  type="button"
                  onClick={() => setMode('paste')}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    mode === 'paste'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-foreground)]'
                      : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]/30'
                  }`}
                >
                  Paste connection string
                </button>
              </div>
              {neonAvailable === false && (
                <p className="mt-2 text-xs text-amber-400">{neonMessage}</p>
              )}
              {neonAvailable === true && mode === 'neon' && (
                <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                  Atlas will create a Neon project
                  {environment === 'staging' ? ' with a staging branch' : ''}. Free Neon accounts work.
                </p>
              )}
            </fieldset>
          )}

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

          {(isEdit || mode === 'paste') && (
            <>
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
            </>
          )}

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={provisioning}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
            >
              {provisioning && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit
                ? 'Save changes'
                : mode === 'neon'
                  ? provisioning
                    ? 'Creating database…'
                    : 'Create database'
                  : 'Create project'}
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
