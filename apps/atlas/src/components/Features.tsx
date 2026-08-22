import { Reveal } from '@/components/Reveal'
import { features } from '@/lib/content'
import {
  Code2,
  Database,
  GitBranch,
  LayoutGrid,
  Server,
  Table2,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<(typeof features)[number]['icon'], LucideIcon> = {
  server: Server,
  tree: GitBranch,
  table: Table2,
  columns: LayoutGrid,
  code: Code2,
  diagram: Database,
}

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-primary)]">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to work with Postgres
            </h2>
            <p className="mt-4 text-[var(--color-muted-foreground)]">
              OpenRDB Studio brings connection management, querying, and schema
              exploration into a single native desktop experience.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = iconMap[feature.icon]
            return (
              <Reveal key={feature.title} delay={(i % 3) as 0 | 1 | 2}>
                <article className="group h-full rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 transition-all duration-300 hover:border-[var(--color-primary)]/30 hover:shadow-[0_0_40px_var(--color-glow)]">
                  <div className="mb-4 inline-flex rounded-xl bg-[var(--color-primary)]/10 p-2.5 text-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary)]/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                    {feature.description}
                  </p>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
