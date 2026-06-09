import React, { useCallback, useMemo } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { Card, IconAvatar } from '@newwork/nw-design-system'
import { cn } from '@/common/utils/cn'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface ExportEntityCardProps {
  entityType: string
  title: string
  icon: PhosphorIcon
  onSelect: () => void
  iconVariant?: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'employee' | 'strategy' | 'premium'
  prefixDataTestId?: string
}

export const ExportEntityCard: React.FC<ExportEntityCardProps> = ({
  entityType,
  title,
  icon,
  onSelect,
  iconVariant = 'info',
  prefixDataTestId = 'ExportEntityCard'
}) => {
  const testId = formatDataTestId(prefixDataTestId, entityType)

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onSelect()
      }
    },
    [onSelect]
  )

  const interactionProps = useMemo(
    () => ({
      role: 'button' as const,
      tabIndex: 0,
      'aria-label': title,
      'data-testid': testId,
      onClick: onSelect,
      onKeyDown: handleKeyDown
    }),
    [handleKeyDown, onSelect, testId, title]
  )

  return (
    <Card
      {...interactionProps}
      className={cn(
        'gba:flex gba:h-full gba:min-h-0 gba:w-full gba:cursor-pointer gba:flex-col gba:items-center gba:justify-center',
        'gba:gap-2 gba:border gba:border-border gba:p-4 gba:text-center gba:shadow-sm',
        'gba:transition-colors gba:duration-200',
        'hover:gba:bg-accent/50 hover:gba:border-foreground/20',
        'gba:focus-visible:outline-none gba:focus-visible:ring-3 gba:focus-visible:ring-ring/50 gba:focus-visible:border-ring'
      )}
    >
      <IconAvatar icon={icon} variant={iconVariant} size="md" label={title} />
      <span className="gba:text-sm gba:font-semibold gba:leading-tight gba:text-card-foreground">{title}</span>
    </Card>
  )
}

export default ExportEntityCard
