/**
 * StatusBadge Component
 *
 * Displays publishing status with appropriate colors and icons.
 */

import React from 'react'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import sharedTranslations from '../_i18n'
import { FileText, Eye, CheckCircle, Archive } from 'lucide-react'
import type { PublishStatus } from '../types/versioning'

export interface StatusBadgeProps {
  status: PublishStatus
  'data-testid'?: string
}

const STATUS_LABEL_KEYS: Record<PublishStatus, string> = {
  draft: 'status-badge-draft',
  in_review: 'status-badge-in-review',
  published: 'status-badge-published',
  archived: 'status-badge-archived'
}

const statusVariant: Record<
  PublishStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  in_review: 'warning',
  published: 'success',
  archived: 'secondary'
}

const statusIcon: Record<PublishStatus, React.ReactNode> = {
  draft: <FileText className="gba:h-3 gba:w-3" />,
  in_review: <Eye className="gba:h-3 gba:w-3" />,
  published: <CheckCircle className="gba:h-3 gba:w-3" />,
  archived: <Archive className="gba:h-3 gba:w-3" />
}

/**
 * Badge showing publishing status
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, 'data-testid': testId = 'status-badge' }) => {
  const { t } = useTranslation(sharedTranslations)
  return (
    <Badge variant={statusVariant[status]} data-testid={testId}>
      <span className="gba:flex gba:items-center gba:gap-1">
        {statusIcon[status]}
        {t(STATUS_LABEL_KEYS[status])}
      </span>
    </Badge>
  )
}
