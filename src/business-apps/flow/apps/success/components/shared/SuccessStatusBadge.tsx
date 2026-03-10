import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { formatStatusLabel } from '../../utils/formatters'

interface SuccessStatusBadgeProps {
  status?: string
}

const STATUS_CLASSNAMES: Record<string, string> = {
  COMPLETED: 'gba:bg-success-secondary gba:text-success-secondary-foreground gba:border-none',
  RUNNING: 'gba:bg-info-secondary gba:text-info-secondary-foreground gba:border-none',
  IN_PROGRESS: 'gba:bg-info-secondary gba:text-info-secondary-foreground gba:border-none',
  TIMED_OUT: 'gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:border-none',
  FAILED: 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:border-none',
  TERMINATED: 'gba:bg-offline-secondary gba:text-offline-secondary-foreground gba:border-none',
  PAUSED: 'gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:border-none',
  QUEUED: 'gba:bg-muted gba:text-muted-foreground gba:border-none',
  OPEN: 'gba:bg-muted gba:text-muted-foreground gba:border-none'
}

export const SuccessStatusBadge: React.FC<SuccessStatusBadgeProps> = ({ status }) => {
  const normalized = formatStatusLabel(status)
  return (
    <Badge variant="secondary" className={STATUS_CLASSNAMES[normalized] ?? 'gba:border-border gba:text-foreground'}>
      {normalized}
    </Badge>
  )
}
