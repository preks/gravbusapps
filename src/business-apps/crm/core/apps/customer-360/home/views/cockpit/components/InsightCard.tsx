import React from 'react'
import { Badge, Card, CardContent } from '@newwork/nw-design-system'
import { CaretRightIcon, type Icon } from '@phosphor-icons/react'

export interface InsightCardProps {
  icon: Icon
  title: string
  description: string
  /** Optional highlight metric shown as a badge (e.g. count of expiring contracts). */
  metric?: string | number
  /** Accessible label / visible affordance for opening the related sub-view. */
  actionLabel: string
  onOpen: () => void
  testId: string
}

/**
 * Compact, fully-clickable summary card for the cockpit insight hub. Surfaces a
 * single portfolio signal and routes into its dedicated sub-view, keeping the
 * cockpit a navigable home rather than a dead-end dashboard.
 */
const InsightCard: React.FC<InsightCardProps> = ({
  icon: CardIcon,
  title,
  description,
  metric,
  actionLabel,
  onOpen,
  testId
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <Card
      variant="surface"
      role="button"
      tabIndex={0}
      aria-label={actionLabel}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className="gba:cursor-pointer gba:transition-colors gba:hover:bg-accent"
      data-testid={testId}
    >
      <CardContent className="gba:flex gba:items-start gba:gap-3 gba:py-4">
        <div className="gba:flex gba:size-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:bg-muted gba:text-muted-foreground">
          <CardIcon className="gba:size-5" />
        </div>
        <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:gap-1">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <span className="gba:text-sm gba:font-medium gba:text-foreground">{title}</span>
            {metric !== undefined ? (
              <Badge variant="secondary" size="sm" data-testid={`${testId}-metric`}>
                {metric}
              </Badge>
            ) : null}
          </div>
          <p className="gba:text-sm gba:text-muted-foreground">{description}</p>
          <span className="gba:mt-1 gba:inline-flex gba:items-center gba:gap-1 gba:text-sm gba:font-medium gba:text-primary">
            {actionLabel}
            <CaretRightIcon className="gba:size-4" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default InsightCard
export { InsightCard }
