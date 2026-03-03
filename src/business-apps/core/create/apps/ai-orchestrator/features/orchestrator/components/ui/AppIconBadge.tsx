import { cn } from '@newwork/nw-design-system'
import { AppIcon } from './AppIcon'

interface AppIconBadgeProps {
  iconName?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CONFIG = {
  sm: {
    container: 'gba:w-8 gba:h-8 gba:rounded-lg',
    icon: 'gba:w-4 gba:h-4'
  },
  md: {
    container: 'gba:w-10 gba:h-10 gba:rounded-xl',
    icon: 'gba:w-5 gba:h-5'
  },
  lg: {
    container: 'gba:w-14 gba:h-14 gba:rounded-xl',
    icon: 'gba:w-7 gba:h-7'
  }
}

export function AppIconBadge({ iconName, size = 'md', className }: AppIconBadgeProps) {
  const { container, icon } = SIZE_CONFIG[size]

  return (
    <div
      className={cn(
        'gba:relative gba:flex gba:items-center gba:justify-center gba:shrink-0 gba:overflow-hidden',
        'gba:bg-linear-to-br gba:from-sky-400 gba:to-indigo-600',
        container,
        className
      )}
    >
      {/* Top shine reflection */}
      <div className="gba:absolute gba:inset-x-0 gba:top-0 gba:h-1/2 gba:bg-linear-to-b gba:from-white/30 gba:to-transparent gba:pointer-events-none" />
      <AppIcon name={iconName} className={cn('gba:relative gba:z-10 gba:text-white', icon)} strokeWidth={1.75} />
    </div>
  )
}
