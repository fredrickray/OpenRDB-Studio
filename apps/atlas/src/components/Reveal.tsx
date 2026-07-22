import { useReveal } from '@/hooks/useReveal'

interface RevealProps {
  children: React.ReactNode
  className?: string
  delay?: 0 | 1 | 2 | 3 | 4 | 5
}

export function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  const delayClass = delay > 0 ? ` reveal-delay-${delay}` : ''

  return (
    <div
      ref={ref}
      className={`reveal${delayClass}${revealed ? ' revealed' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
