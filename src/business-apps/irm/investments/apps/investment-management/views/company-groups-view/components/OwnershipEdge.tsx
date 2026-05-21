import React, { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'
import { useTranslation } from '@newwork/nw-design-system'
import type { InvestmentCompanyOwnershipEdge } from '../types/companyGroupGraphTypes'
import translations from '../_i18n'

const formatPercentage = (percentage: number | undefined, ownershipLabel: string): string => {
  if (percentage === undefined || percentage === null) return ownershipLabel
  return `${percentage}%`
}

const getRoutedPath = (points: Array<{ x: number; y: number }>): string => {
  const [firstPoint, ...restPoints] = points
  if (!firstPoint) return ''

  return restPoints.reduce((path, point) => `${path} L ${point.x} ${point.y}`, `M ${firstPoint.x} ${firstPoint.y}`)
}

const getLabelPosition = (points: Array<{ x: number; y: number }>): { x: number; y: number } => {
  if (points.length < 2) return points[0] || { x: 0, y: 0 }

  const segments = points.slice(1).map((point, index) => {
    const previousPoint = points[index]
    return {
      start: previousPoint,
      end: point,
      length: Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y)
    }
  })
  const [firstSegment, ...restSegments] = segments
  const longestSegment = restSegments.reduce(
    (longest, segment) => (segment.length > longest.length ? segment : longest),
    firstSegment
  )

  return {
    x: (longestSegment.start.x + longestSegment.end.x) / 2,
    y: (longestSegment.start.y + longestSegment.end.y) / 2
  }
}

const getEdgeClassName = (data?: InvestmentCompanyOwnershipEdge['data']): string => {
  if (data?.isHighlighted) {
    return 'gba:stroke-primary gba:stroke-2'
  }

  if (data?.isDimmed) {
    return 'gba:stroke-muted-foreground gba:opacity-25'
  }

  return 'gba:stroke-primary gba:opacity-70'
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
  const edgeClassName = getEdgeClassName(data)
  const routedPoints = data?.routePoints
  const [bezierPath, bezierLabelX, bezierLabelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.2
  })
  const edgePath = routedPoints && routedPoints.length > 1 ? getRoutedPath(routedPoints) : bezierPath
  const labelPosition =
    data?.labelPosition ||
    (routedPoints && routedPoints.length > 1 ? getLabelPosition(routedPoints) : { x: bezierLabelX, y: bezierLabelY })

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} className={edgeClassName} />
      {(data?.isHighlighted || data?.showPercentageLabel) && (
        <EdgeLabelRenderer>
          <div
            className="gba:pointer-events-none gba:absolute gba:-translate-x-1/2 gba:-translate-y-1/2 gba:rounded-full gba:border gba:border-primary/20 gba:bg-background gba:px-2 gba:py-1 gba:text-xs gba:font-bold gba:text-primary gba:shadow-md gba:ring-2 gba:ring-background"
            style={{ transform: `translate(-50%, -50%) translate(${labelPosition.x}px, ${labelPosition.y}px)` }}
          >
            <span>{formatPercentage(data?.percentage, t('ownership-label'))}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const OwnershipEdge = memo(OwnershipEdgeComponent)
