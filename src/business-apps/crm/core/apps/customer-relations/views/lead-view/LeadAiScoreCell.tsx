import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { formatScoreValue, getGradeBadgeVariant } from '@/business-apps/crm/core/features/lead-scoring'

export interface LeadAiScoreCellProps {
  readonly score: number | null | undefined
  readonly grade: string | null | undefined
  readonly notScoredLabel: string
  readonly notAvailableLabel: string
}

export const LeadAiScoreCell: React.FC<LeadAiScoreCellProps> = ({
  score,
  grade,
  notScoredLabel,
  notAvailableLabel
}) => {
  if ((score === null || score === undefined) && !grade) {
    return <span className="gba:text-sm gba:text-muted-foreground">{notScoredLabel}</span>
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-1">
      <span className="gba:font-medium gba:text-sm">{formatScoreValue(score)}</span>
      <Badge variant={getGradeBadgeVariant(grade)}>{grade || notAvailableLabel}</Badge>
    </div>
  )
}
