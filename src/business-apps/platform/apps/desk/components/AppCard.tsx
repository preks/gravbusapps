import React from 'react'
import { Card, CardContent, Button, useTranslation } from '@newwork/nw-design-system'
import { Plus, ArrowRight, LucideIcon } from 'lucide-react'
import deskTranslations from '../_i18n'

export interface AppCardProps {
  title: string
  description: string
  /** Kept for API compat; icons are not displayed. */
  icon?: LucideIcon
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

/* Card hover/gradient – subtle blue tint; decorative tokens for premium look */
const glassBlue = {
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
  count,
  sharedCount = 0,
  onOpen,
  onCreate,
  'data-testid': testId,
  animationDelay = 0,
  isLoading = false
}) => {
  const { t } = useTranslation(deskTranslations)
  return (
    <Card
      className={`gba:group gba:relative gba:overflow-hidden gba:border gba:border-border gba:bg-background gba:transition-all gba:duration-300 gba:hover:scale-[1.02] gba:cursor-pointer`}
      onClick={onOpen}
      data-testid={testId}
      style={{ animation: `fadeInUp 0.5s ease-out ${animationDelay}s both` }}
    >
      {/* Hover gradient overlay – subtle blue tint */}
      <div
        className={`gba:absolute gba:inset-0 gba:bg-gradient-to-br ${glassBlue.gradient} gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:duration-300`}
      />

      <CardContent className="gba:relative gba:p-5">
        {/* Header: title + create button */}
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:mb-3">
          <h3 className="gba:font-funnel-display gba:text-xl gba:sm:text-2xl gba:font-semibold gba:text-foreground gba:tracking-tight gba:leading-tight">
            {title}
          </h3>
          <Button
            size="sm"
            variant="outline"
            className={`gba:h-8 gba:w-8 gba:p-0 gba:flex-shrink-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-all gba:duration-200 ${glassBlue.ring}`}
            onClick={e => {
              e.stopPropagation()
              onCreate()
            }}
          >
            <Plus className="gba:h-4 gba:w-4" />
          </Button>
        </div>

        <p className="gba:text-sm gba:text-muted-foreground gba:mb-4 gba:leading-relaxed">{description}</p>

        {/* Stats: count + golden badge + open hint */}
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <span className="gba:text-2xl gba:font-bold gba:text-foreground">{isLoading ? '—' : count}</span>
            {sharedCount > 0 && (
              <span className="gba:inline-flex gba:items-center gba:px-1.5 gba:py-0 gba:h-5 gba:rounded-full gba:bg-desk-badge-golden gba:text-desk-badge-golden-foreground gba:text-[10px] gba:font-medium gba:flex-shrink-0">
                {t('app-shared-count', { count: sharedCount })}
              </span>
            )}
          </div>

          <div className="gba:flex gba:items-center gba:text-sm gba:font-medium gba:text-muted-foreground group-hover:gba:text-foreground gba:transition-colors gba:flex-shrink-0">
            <span className="gba:mr-1">{t('app-open')}</span>
            <ArrowRight className="gba:h-4 gba:w-4 gba:transition-transform group-hover:gba:translate-x-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AppCard
