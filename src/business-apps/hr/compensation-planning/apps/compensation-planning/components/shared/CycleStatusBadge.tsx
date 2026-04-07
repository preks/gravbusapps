import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { CycleStatus } from '../../../../types/compensationPlanningTypes'
import { CYCLE_STATUS_LABELS } from '../../../../types/compensationPlanningTypes'

const STATUS_VARIANTS: Record<CycleStatus, 'success' | 'destructive' | 'warning' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  budget_setup: 'outline',
  distribution: 'outline',
  manager_planning: 'warning',
  under_review: 'warning',
  approved: 'success',
  executed: 'success'
}

interface CycleStatusBadgeProps {
  status: CycleStatus
}

export const CycleStatusBadge: React.FC<CycleStatusBadgeProps> = ({ status }) => {
  return <Badge variant={STATUS_VARIANTS[status]}>{CYCLE_STATUS_LABELS[status]}</Badge>
}
