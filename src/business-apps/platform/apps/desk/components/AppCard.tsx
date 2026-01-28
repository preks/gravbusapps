import React from 'react'
import { Card, CardContent, Button } from '@newwork/nw-design-system'
import { Plus, ArrowRight, LucideIcon } from 'lucide-react'

export interface AppCardProps {
  title: string
  description: string
  icon: LucideIcon
  count: number
  sharedCount?: number
  accentColor: 'sky' | 'teal' | 'amber'
  onOpen: () => void
  onCreate: () => void
  'data-testid'?: string
  animationDelay?: number
  isLoading?: boolean
}

const colorConfig = {
  sky: {
    iconBg: 'gba:bg-sky-600',
    hoverBorder: 'hover:gba:border-sky-500/50',
    gradient: 'gba:from-sky-500/10 gba:to-transparent',
    text: 'gba:text-sky-600',
    ring: 'gba:ring-sky-500/20'
  },
  teal: {
    iconBg: 'gba:bg-teal-600',
    hoverBorder: 'hover:gba:border-teal-500/50',
    gradient: 'gba:from-teal-500/10 gba:to-transparent',
    text: 'gba:text-teal-600',
    ring: 'gba:ring-teal-500/20'
  },
  amber: {
    iconBg: 'gba:bg-amber-600',
    hoverBorder: 'hover:gba:border-amber-500/50',
    gradient: 'gba:from-amber-500/10 gba:to-transparent',
    text: 'gba:text-amber-600',
    ring: 'gba:ring-amber-500/20'
  }
}

/**
 * AppCard - Premium card component for content apps
 * Features hover effects, gradient accents, and smooth animations
 */
export const AppCard: React.FC<AppCardProps> = ({
  title,
  description,
  icon: Icon,
  count,
  sharedCount = 0,
  accentColor,
  onOpen,
  onCreate,
  'data-testid': testId,
  animationDelay = 0,
  isLoading = false
}) => {
  const colors = colorConfig[accentColor]

  return (
    <Card
      className={`gba:group gba:relative gba:overflow-hidden gba:border gba:border-border gba:bg-card gba:transition-all gba:duration-300 ${colors.hoverBorder} hover:gba:shadow-lg gba:cursor-pointer`}
      onClick={onOpen}
      data-testid={testId}
      style={{ animation: `fadeInUp 0.5s ease-out ${animationDelay}s both` }}
    >
      {/* Hover gradient overlay */}
      <div
        className={`gba:absolute gba:inset-0 gba:bg-gradient-to-br ${colors.gradient} gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:duration-300`}
      />

      <CardContent className="gba:relative gba:p-5">
        {/* Header */}
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
          {/* Icon container */}
          <div
            className={`gba:w-12 gba:h-12 gba:rounded-xl ${colors.iconBg} gba:flex gba:items-center gba:justify-center gba:transition-transform gba:duration-300 group-hover:gba:scale-110`}
          >
            <Icon className="gba:h-6 gba:w-6 gba:text-white" />
          </div>

          {/* Create button */}
          <Button
            size="sm"
            variant="outline"
            className={`gba:h-8 gba:w-8 gba:p-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-all gba:duration-200 hover:${colors.ring} hover:gba:ring-2`}
            onClick={e => {
              e.stopPropagation()
              onCreate()
            }}
          >
            <Plus className="gba:h-4 gba:w-4" />
          </Button>
        </div>

        {/* Title & Description */}
        <h3 className="gba:text-lg gba:font-semibold gba:text-card-foreground gba:mb-1">{title}</h3>
        <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{description}</p>

        {/* Stats */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-baseline gba:gap-2">
            <span className="gba:text-2xl gba:font-bold gba:text-card-foreground">
              {isLoading ? '—' : count}
            </span>
            {sharedCount > 0 && (
              <span className="gba:text-xs gba:text-muted-foreground">
                ({sharedCount} shared)
              </span>
            )}
          </div>

          {/* Open hint */}
          <div className="gba:flex gba:items-center gba:text-sm gba:font-medium gba:text-muted-foreground group-hover:gba:text-foreground gba:transition-colors">
            <span className="gba:mr-1">Open</span>
            <ArrowRight className="gba:h-4 gba:w-4 gba:transition-transform group-hover:gba:translate-x-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AppCard
