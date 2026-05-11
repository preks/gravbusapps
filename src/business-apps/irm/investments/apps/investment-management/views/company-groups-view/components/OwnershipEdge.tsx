import React, { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'
import { useTranslation } from '@newwork/nw-design-system'
import type { InvestmentCompanyOwnershipEdge } from '../types/companyGroupGraphTypes'
import translations from '../_i18n'

const formatPercentage = (percentage: number | undefined, ownershipLabel: string): string => {
  if (percentage === undefined || percentage === null) return ownershipLabel
  return `${percentage}%`
}

const OwnershipEdgeComponent: React.FC<EdgeProps<InvestmentCompanyOwnershipEdge>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data
}) => {
  const { t } = useTranslation(translations)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.2
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} className="gba:stroke-primary" />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        className="gba:fill-primary gba:text-xs gba:font-bold"
      >
        {formatPercentage(data?.percentage, t('ownership-label'))}
      </text>
    </>
  )
}

export const OwnershipEdge = memo(OwnershipEdgeComponent)
