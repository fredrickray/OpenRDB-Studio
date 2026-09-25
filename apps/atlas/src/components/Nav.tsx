import { Link } from 'react-router-dom'
import { useNavScroll } from '@/hooks/useReveal'
import { AppLogo } from '@/components/AppLogo'
import { GITHUB_REPO_URL } from '@/lib/content'
import { getSession } from '@/lib/session'
import { Github } from 'lucide-react'

const links = [
  { href: '/#features', label: 'Features' },
  { href: '/#download', label: 'Download' },
]

export function Nav() {
  const scrolled = useNavScroll()
  const session = getSession()

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'nav-scrolled' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <AppLogo size="md" />
          <span className="text-sm font-semibold tracking-tight">
            OpenRDB <span className="text-[var(--color-muted-foreground)]">Atlas</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
            >
              {link.label}
            </a>
          ))}
          <Link
            to={session ? '/projects' : '/sign-in'}
            className="rounded-lg px-3 py-2 text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
          >
            Projects
          </Link>
          {session ? (
            <Link
              to="/projects"
              className="ml-1 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/sign-in"
              className="ml-1 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-3.5 py-2 text-sm font-medium transition hover:border-[var(--color-primary)]/40"
            >
              Sign in
            </Link>
          )}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
            aria-label="View on GitHub"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </nav>
    </header>
  )
}
