import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { formatEnumLabel, formatStatusLabel } from '../../utils/formatters'

interface SuccessStatusBadgeProps {
  status?: string
}

export const SuccessStatusBadge: React.FC<SuccessStatusBadgeProps> = ({ status }) => {
  const normalized = formatStatusLabel(status)
  const label = formatEnumLabel(status) || 'Unknown'
  const className =
    normalized === 'FAILED'
      ? 'gba:h-5 gba:border-none gba:bg-destructive-secondary gba:px-2 gba:text-xs gba:font-medium gba:text-destructive-secondary-foreground'
      : 'gba:h-5 gba:border-none gba:bg-muted gba:px-2 gba:text-xs gba:font-medium gba:text-muted-foreground'

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  )
}
