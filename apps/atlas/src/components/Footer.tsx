import { GITHUB_REPO_URL } from '@/lib/content'

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-card-border)] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <img src="/icon.png" alt="" className="h-6 w-6 rounded-md opacity-80" />
          <span className="text-sm text-[var(--color-muted-foreground)]">
            OpenRDB Atlas — home of{' '}
            <span className="text-[var(--color-foreground)]">OpenRDB Studio</span>
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-[var(--color-muted-foreground)]">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[var(--color-foreground)]"
          >
            Source code
          </a>
          <a
            href="#download"
            className="transition-colors hover:text-[var(--color-foreground)]"
          >
            Download
          </a>
        </div>
      </div>
    </footer>
  )
}
