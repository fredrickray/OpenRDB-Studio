import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  Download,
} from 'lucide-react'
import { AppLogo } from '@/components/AppLogo'
import { clearSession, getSession } from '@/lib/session'
import {
  buildOpenInStudioUrl,
  deleteProject,
  listProjects,
  type Project,
  type ProjectEnvironment,
} from '@/lib/projects'
import { useNavigate } from 'react-router-dom'

function EnvBadge({ environment }: { environment: ProjectEnvironment }) {
  const isProd = environment === 'production'
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        isProd
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-amber-500/15 text-amber-400'
      }`}
    >
      {environment}
    </span>
  )
}

function ProjectCard({
  project,
  onDeleted,
}: {
  project: Project
  onDeleted: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  const openStudio = () => {
    const url = buildOpenInStudioUrl(project)
    window.location.href = url
    setShowFallback(true)
  }

  const copyConn = async () => {
    try {
      await navigator.clipboard.writeText(project.connectionString)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  const remove = () => {
    if (!confirm(`Delete project “${project.name}”?`)) return
    deleteProject(project.id)
    onDeleted()
  }

  return (
    <article className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{project.name}</h2>
            <EnvBadge environment={project.environment} />
          </div>
          <p className="mt-1 font-mono text-xs text-[var(--color-muted-foreground)]">
            {project.username}@{project.host}:{project.port}/{project.database}
            {project.ssl ? ' · SSL' : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Link
            to={`/projects/${project.id}/edit`}
            className="rounded-lg p-2 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)]"
            title="Edit"
            aria-label="Edit project"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={remove}
            className="rounded-lg p-2 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-background)] hover:text-red-400"
            title="Delete"
            aria-label="Delete project"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openStudio}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in Studio
        </button>
        <button
          type="button"
          onClick={copyConn}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-background)] px-3.5 py-2 text-xs font-medium transition hover:border-[var(--color-primary)]/40"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? 'Copied' : 'Copy URL'}
        </button>
      </div>

      {showFallback && (
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
          If Studio did not open,{' '}
          <Link to="/#download" className="text-[var(--color-primary)] hover:underline">
            download it
          </Link>{' '}
          and try again. Deep links need the desktop app installed.
        </p>
      )}
    </article>
  )
}

export function ProjectsPage() {
  const session = getSession()!
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const projects = useMemo(() => listProjects(), [tick])

  const signOut = () => {
    clearSession()
    navigate('/sign-in')
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-card-border)] bg-[var(--color-card)]/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <AppLogo size="sm" />
            <span className="text-sm font-semibold tracking-tight">
              OpenRDB <span className="text-[var(--color-muted-foreground)]">Atlas</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[var(--color-muted-foreground)] sm:inline">
              {session.name}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="text-xs text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Paste Postgres connection strings and open them in Studio. Staging and production stay labeled here.
            </p>
          </div>
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            New project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-[var(--color-card-border)] px-6 py-16 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No projects yet. Add a staging or production connection string to get started.
            </p>
            <Link
              to="/projects/new"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              <Plus className="h-4 w-4" />
              Create your first project
            </Link>
            <p className="mt-8 text-xs text-[var(--color-muted-foreground)]">
              Need the desktop app?{' '}
              <Link to="/#download" className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                <Download className="h-3 w-3" />
                Download Studio
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDeleted={() => setTick((t) => t + 1)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
