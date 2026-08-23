const sizeMap = {
  xs: 'h-4 w-4 rounded',
  sm: 'h-6 w-6 rounded-md',
  md: 'h-8 w-8 rounded-lg',
  lg: 'h-16 w-16 rounded-2xl',
} as const

interface AppLogoProps {
  size?: keyof typeof sizeMap
  className?: string
}

export function AppLogo({ size = 'md', className = '' }: AppLogoProps) {
  return (
    <img
      src="/icon.png"
      alt=""
      aria-hidden
      className={`${sizeMap[size]} shrink-0 object-contain ${className}`.trim()}
    />
  )
}
