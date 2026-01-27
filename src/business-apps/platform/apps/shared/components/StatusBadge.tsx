/**
 * StatusBadge Component
 *
 * Displays publishing status with appropriate colors and icons.
 */

import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { FileText, Eye, CheckCircle, Archive } from 'lucide-react'
import type { PublishStatus } from '../types/versioning'

export interface StatusBadgeProps {
  status: PublishStatus
  'data-testid'?: string
}

const statusConfig: Record<
  PublishStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
    icon: React.ReactNode
  }
> = {
  draft: {
    label: 'Draft',
    variant: 'outline',
    icon: <FileText className="gba:h-3 gba:w-3" />
  },
  in_review: {
    label: 'In Review',
    variant: 'warning',
    icon: <Eye className="gba:h-3 gba:w-3" />
  },
  published: {
    label: 'Published',
    variant: 'success',
    icon: <CheckCircle className="gba:h-3 gba:w-3" />
  },
  archived: {
    label: 'Archived',
    variant: 'secondary',
    icon: <Archive className="gba:h-3 gba:w-3" />
  }
}

/**
 * Badge showing publishing status
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, 'data-testid': testId = 'status-badge' }) => {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} data-testid={testId}>
      <span className="gba:flex gba:items-center gba:gap-1">
        {config.icon}
        {config.label}
      </span>
    </Badge>
  )
}
