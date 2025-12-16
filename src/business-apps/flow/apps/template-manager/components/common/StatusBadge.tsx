/**
 * StatusBadge Component
 * Displays comparison status with appropriate styling
 */

import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { ComparisonStatus } from '../../types/comparison'

interface StatusBadgeProps {
  status: ComparisonStatus
}

const STATUS_CONFIG: Record<ComparisonStatus, { variant: any; label: string }> = {
  IDENTICAL: {
    variant: 'success',
    label: 'Identical'
  },
  VERSION_DRIFT: {
    variant: 'warning',
    label: 'Version Drift'
  },
  CONTENT_DRIFT: {
    variant: 'destructive',
    label: 'Content Drift'
  },
  NEW_IN_SOURCE: {
    variant: 'info',
    label: 'New in Source'
  },
  NEW_IN_TARGET: {
    variant: 'secondary',
    label: 'New in Target'
  },
  SOURCE_AHEAD: {
    variant: 'warning',
    label: 'Source Ahead'
  },
  TARGET_AHEAD: {
    variant: 'info',
    label: 'Target Ahead'
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status]

  return (
    <Badge variant={config.variant} className="gba:whitespace-nowrap">
      {config.label}
    </Badge>
  )
}
