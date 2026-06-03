import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { formatScoreValue, getGradeBadgeVariant } from '@/common/utils/aiScoreDisplay'

export interface AiScoreRecordBadgeProps {
  score: number | null | undefined
  grade: string | null | undefined
  gradeFallback: string
  dataTestId: string
}

export const AiScoreRecordBadge: React.FC<AiScoreRecordBadgeProps> = ({ score, grade, gradeFallback, dataTestId }) => {
  const hasScoreValue = score !== null && score !== undefined
  const hasBadge = hasScoreValue || Boolean(grade)

  if (!hasBadge) {
    return null
  }

  const label = `${formatScoreValue(score)} · ${grade || gradeFallback}`

  return (
    <Badge data-testid={dataTestId} variant={getGradeBadgeVariant(grade)} className="gba:text-sm">
      {label}
    </Badge>
  )
}
