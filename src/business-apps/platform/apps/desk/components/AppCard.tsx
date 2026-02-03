import React from 'react'
import { Card, CardContent, Button } from '@newwork/nw-design-system'
import { Plus, ArrowRight, LucideIcon } from 'lucide-react'

export interface AppCardProps {
  title: string
  description: string
  icon: LucideIcon
  count: number
  sharedCount?: number
  /** Kept for API compat; Desk uses glass blue style for all cards. */
  accentColor?: 'sky' | 'teal' | 'amber'
  onOpen: () => void
  onCreate: () => void
  'data-testid'?: string
  animationDelay?: number
  isLoading?: boolean
}

/* Card hover/gradient – subtle blue tint; icon uses .desk-app-card-icon-glass in CSS */
const glassBlue = {
  hoverBorder: 'hover:gba:border-primary/40',
  gradient: 'gba:from-primary/5 gba:to-transparent',
  ring: 'hover:gba:ring-primary/20 hover:gba:ring-2'
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
  onOpen,
  onCreate,
  'data-testid': testId,
  animationDelay = 0,
  isLoading = false
}) => {
  return (
    <Card
      className={`gba:group gba:relative gba:overflow-hidden gba:border gba:border-border gba:bg-card gba:transition-all gba:duration-300 ${glassBlue.hoverBorder} hover:gba:shadow-lg gba:cursor-pointer`}
      onClick={onOpen}
      data-testid={testId}
      style={{ animation: `fadeInUp 0.5s ease-out ${animationDelay}s both` }}
    >
      {/* Hover gradient overlay – glass blue tint */}
      <div
        className={`gba:absolute gba:inset-0 gba:bg-gradient-to-br ${glassBlue.gradient} gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:duration-300`}
      />

      <CardContent className="gba:relative gba:p-5">
        {/* Header */}
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
          {/* Icon container – blueish glass (CSS class for explicit blue) */}
          <div
            className="desk-app-card-icon-glass gba:w-12 gba:h-12 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:transition-transform gba:duration-300 group-hover:gba:scale-110"
          >
            <Icon className="gba:h-6 gba:w-6" />
          </div>

          {/* Create button */}
          <Button
            size="sm"
            variant="outline"
            className={`gba:h-8 gba:w-8 gba:p-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-all gba:duration-200 ${glassBlue.ring}`}
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
