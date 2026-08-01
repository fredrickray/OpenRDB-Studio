import { Reveal } from '@/components/Reveal'
import { GITHUB_RELEASES_URL, platforms } from '@/lib/content'
import { Apple, Download, Monitor } from 'lucide-react'

function PlatformIcon({ icon }: { icon: string }) {
  if (icon === 'apple') return <Apple className="h-6 w-6" />
  if (icon === 'windows') return <Monitor className="h-6 w-6" />
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.732-.488 2.91-1.045 3.674-.686.944-1.206 1.658-1.591 2.575-.513 1.202-.475 2.896-.475 2.896s.019.483.045.875c.253 3.762 2.432 4.494 2.432 4.494.227.064.595.157 1.102.26 1.107.22 2.475.475 3.882.475 3.667 0 6.642-3.167 6.642-7.068 0-3.367-2.702-6.078-6.055-6.078-.339 0-.672.033-.995.085 1.254-4.077-.496-7.462-1.891-9.082-.388-.448-.828-.862-1.312-1.227C15.838.234 14.025 0 12.504 0z" />
    </svg>
  )
}

export function DownloadSection() {
  return (
    <section id="download" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-[var(--color-card-border)] bg-gradient-to-b from-[var(--color-card)] to-[var(--color-background)]">
            <div className="px-6 py-12 sm:px-12 sm:py-16">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-primary)]">
                  Download
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Get OpenRDB Studio
                </h2>
                <p className="mt-4 text-[var(--color-muted-foreground)]">
                  Free and open source. Pick your platform and start exploring your
                  PostgreSQL databases in minutes.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {platforms.map((platform, i) => (
                  <Reveal key={platform.id} delay={i as 0 | 1 | 2}>
                    <a
                      href={platform.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col items-center rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-background)] p-6 text-center transition-all duration-300 hover:border-[var(--color-primary)]/40 hover:shadow-[0_0_32px_var(--color-glow)]"
                    >
                      <div className="mb-4 rounded-xl bg-[var(--color-primary)]/10 p-3 text-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary)]/20">
                        <PlatformIcon icon={platform.icon} />
                      </div>
                      <span className="font-semibold">{platform.name}</span>
                      <span className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {platform.note}
                      </span>
                    </a>
                  </Reveal>
                ))}
              </div>

              <Reveal delay={3}>
                <div className="mt-10 flex justify-center">
                  <a
                    href={GITHUB_RELEASES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-[0_0_32px_var(--color-glow)]"
                  >
                    <Download className="h-4 w-4" />
                    View all releases
                  </a>
                </div>
              </Reveal>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
