import { Reveal } from '@/components/Reveal'
import { AppLogo } from '@/components/AppLogo'
import { GITHUB_RELEASES_URL } from '@/lib/content'
import { ArrowDown, Download } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
      <div className="pointer-events-none absolute inset-0 hero-glow" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                Desktop PostgreSQL client
              </p>
            </Reveal>

            <Reveal delay={1}>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Navigate your databases with{' '}
                <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
                  OpenRDB Studio
                </span>
              </h1>
            </Reveal>

            <Reveal delay={2}>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--color-muted-foreground)] sm:text-lg">
                A fast, native PostgreSQL workspace built with Tauri and Rust. Connect,
                query, browse, and visualize in one desktop app.
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-[0_0_32px_var(--color-glow)]"
                >
                  <Download className="h-4 w-4" />
                  Download Studio
                </a>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-5 py-3 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:border-[var(--color-primary)]/40"
                >
                  See features
                  <ArrowDown className="h-4 w-4" />
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={2} className="flex justify-center lg:justify-end">
            <HeroVisual />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function HeroVisual() {
  return (
    <div className="relative w-full max-w-md animate-float">
      <div className="absolute -inset-4 rounded-3xl bg-[var(--color-primary)]/10 blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 border-b border-[var(--color-card-border)] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          <AppLogo size="xs" className="ml-2" />
          <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
            OpenRDB Studio
          </span>
        </div>

        <div className="p-5">
          <svg viewBox="0 0 320 220" className="w-full" aria-hidden>
            {/* Connection nodes */}
            <circle cx="60" cy="50" r="8" fill="#2563eb" opacity="0.9" />
            <circle cx="160" cy="30" r="6" fill="#3b82f6" opacity="0.7" />
            <circle cx="260" cy="55" r="8" fill="#2563eb" opacity="0.9" />
            <circle cx="90" cy="120" r="7" fill="#60a5fa" opacity="0.8" />
            <circle cx="200" cy="110" r="9" fill="#2563eb" />
            <circle cx="140" cy="180" r="6" fill="#3b82f6" opacity="0.7" />
            <circle cx="250" cy="170" r="7" fill="#60a5fa" opacity="0.8" />

            {/* Connection lines */}
            <line x1="60" y1="50" x2="160" y2="30" stroke="#2563eb" strokeWidth="1.5" opacity="0.4" className="connection-line" />
            <line x1="160" y1="30" x2="260" y2="55" stroke="#2563eb" strokeWidth="1.5" opacity="0.4" className="connection-line" style={{ animationDelay: '0.8s' }} />
            <line x1="60" y1="50" x2="90" y2="120" stroke="#2563eb" strokeWidth="1.5" opacity="0.4" className="connection-line" style={{ animationDelay: '1s' }} />
            <line x1="90" y1="120" x2="200" y2="110" stroke="#2563eb" strokeWidth="1.5" opacity="0.4" className="connection-line" style={{ animationDelay: '1.2s' }} />
            <line x1="200" y1="110" x2="250" y2="170" stroke="#2563eb" strokeWidth="1.5" opacity="0.4" className="connection-line" style={{ animationDelay: '1.4s' }} />
            <line x1="200" y1="110" x2="140" y2="180" stroke="#2563eb" strokeWidth="1.5" opacity="0.4" className="connection-line" style={{ animationDelay: '1.6s' }} />

            {/* Table boxes */}
            <rect x="40" y="38" width="40" height="24" rx="4" fill="var(--color-diagram-fill)" stroke="var(--color-diagram-stroke)" strokeWidth="1" />
            <rect x="148" y="18" width="24" height="24" rx="4" fill="var(--color-diagram-fill)" stroke="var(--color-diagram-stroke)" strokeWidth="1" />
            <rect x="240" y="43" width="40" height="24" rx="4" fill="var(--color-diagram-fill)" stroke="var(--color-diagram-stroke)" strokeWidth="1" />
            <rect x="70" y="108" width="40" height="24" rx="4" fill="var(--color-diagram-fill)" stroke="var(--color-diagram-stroke)" strokeWidth="1" />
            <rect x="180" y="98" width="40" height="28" rx="4" fill="var(--color-diagram-fill)" stroke="#2563eb" strokeWidth="1.5" />
            <rect x="120" y="168" width="40" height="24" rx="4" fill="var(--color-diagram-fill)" stroke="var(--color-diagram-stroke)" strokeWidth="1" />
            <rect x="230" y="158" width="40" height="24" rx="4" fill="var(--color-diagram-fill)" stroke="var(--color-diagram-stroke)" strokeWidth="1" />
          </svg>

          <div className="mt-3 rounded-lg bg-[var(--color-code-bg)] px-3 py-2 font-mono text-[11px] text-[var(--color-muted-foreground)]">
            <span className="text-[var(--color-accent)]">SELECT</span> *{' '}
            <span className="text-[var(--color-accent)]">FROM</span> users{' '}
            <span className="text-[var(--color-accent)]">LIMIT</span> 100;
          </div>
        </div>
      </div>
    </div>
  )
}
