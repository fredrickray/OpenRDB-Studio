import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AppLogo } from '@/components/AppLogo'
import { setSession } from '@/lib/session'

export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/projects'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Enter a display name')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email')
      return
    }
    setSession({ name, email })
    navigate(from, { replace: true })
  }

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <Link to="/" className="mb-10 flex items-center gap-2.5 self-start transition-opacity hover:opacity-80">
          <AppLogo size="md" />
          <span className="text-sm font-semibold tracking-tight">
            OpenRDB <span className="text-[var(--color-muted-foreground)]">Atlas</span>
          </span>
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">Sign in locally</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          Projects stay in this browser for now. No password or cloud account required.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-[var(--color-muted-foreground)]">
              Display name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]/50"
              placeholder="Fredrick"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[var(--color-muted-foreground)]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)]/50"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            Continue to projects
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--color-muted-foreground)]">
          <Link to="/" className="text-[var(--color-primary)] hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
