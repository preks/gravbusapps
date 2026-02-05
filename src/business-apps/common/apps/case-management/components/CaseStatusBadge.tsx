/**
 * Case Status Badge Component
 *
 * Displays a badge with case status
 */

import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { CaseStatus } from '../types'
import { CASE_STATUSES } from '../utils'

interface CaseStatusBadgeProps {
  status: CaseStatus
  className?: string
}

export const CaseStatusBadge: React.FC<CaseStatusBadgeProps> = ({ status, className }) => {
  const statusConfig = CASE_STATUSES[status]

  if (!statusConfig) {
    return null
  }

  return (
    <Badge variant={statusConfig.variant as any} className={className}>
      {statusConfig.label}
    </Badge>
  )
}
