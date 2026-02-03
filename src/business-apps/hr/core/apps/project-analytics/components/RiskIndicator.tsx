import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { RiskStatus } from '../types'

interface RiskIndicatorProps {
  status: RiskStatus
  size?: 'sm' | 'default'
  showLabel?: boolean
}

const statusConfig: Record<
  RiskStatus,
  { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary'; emoji: string }
> = {
  'on-track': { label: 'On Track', variant: 'success', emoji: '🟢' },
  'at-risk': { label: 'At Risk', variant: 'warning', emoji: '🟠' },
  'over-budget': { label: 'Over Budget', variant: 'destructive', emoji: '🔴' },
  'not-started': { label: 'Not Started', variant: 'secondary', emoji: '⚪' }
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({ status, size = 'default', showLabel = true }) => {
  const config = statusConfig[status]

  if (!showLabel) {
    return <span title={config.label}>{config.emoji}</span>
  }

  return (
    <Badge variant={config.variant} className={size === 'sm' ? 'gba:text-xs' : ''}>
      {config.emoji} {config.label}
    </Badge>
  )
}

export const getRiskColor = (status: RiskStatus): string => {
  switch (status) {
    case 'on-track':
      return 'gba:text-success'
    case 'at-risk':
      return 'gba:text-warning'
    case 'over-budget':
      return 'gba:text-destructive'
    case 'not-started':
      return 'gba:text-muted-foreground'
    default:
      return 'gba:text-foreground'
  }
}

export const getRiskBgColor = (status: RiskStatus): string => {
  switch (status) {
    case 'on-track':
      return 'gba:bg-success/10'
    case 'at-risk':
      return 'gba:bg-warning/10'
    case 'over-budget':
      return 'gba:bg-destructive/10'
    case 'not-started':
      return 'gba:bg-muted'
    default:
      return 'gba:bg-card'
  }
}
