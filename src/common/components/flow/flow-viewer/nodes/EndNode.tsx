import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Badge } from '@newwork/nw-design-system'
import { CheckCircle, BarChart3 } from 'lucide-react'
import { HANDLE_OFFSET } from './nodeDimensions'
import { NODE_META_BADGE_STANDARD_CLASS } from './nodeBadgeStyles'
import type { StepStatus } from '../types/viewerTypes'

interface EndNodeData {
  label?: string
  title?: string
  description?: string
  summaryFieldsCount?: number
  isSelected?: boolean
  status?: StepStatus
  isOnActivePath?: boolean
  onSelect?: () => void
  testId?: string
}

function getBorderClass(
  status?: StepStatus,
  isSelected?: boolean,
  hasFields?: boolean,
  isOnActivePath?: boolean
): string {
  if (isSelected) return 'gba:border-primary'
  if (isOnActivePath) return 'gba:border-info'
  if (status === 'completed') return 'gba:border-success'
  if (status === 'active') return 'gba:border-info'
  if (hasFields) return 'gba:border-success/60'
  return 'gba:border-border'
}

function getBgClass(status?: StepStatus, isSelected?: boolean, hasFields?: boolean): string {
  if (isSelected) return 'gba:bg-card'
  if (status === 'completed') return 'gba:bg-card'
  if (hasFields) return 'gba:bg-card'
  return 'gba:bg-card'
}

export const EndNode: React.FC<{ data: EndNodeData }> = ({ data }) => {
  const hasSummaryFields = typeof data.summaryFieldsCount === 'number'
  const hasFields = (data.summaryFieldsCount ?? 0) > 0
  const title = data.title ?? data.label ?? 'Summary'
  const borderClass = getBorderClass(data.status, data.isSelected, hasFields, data.isOnActivePath)
  const bgClass = getBgClass(data.status, data.isSelected, hasFields)

  return (
    <button
      type="button"
      className={`nopan nodrag gba:rounded-full gba:w-[140px] gba:h-[140px] gba:border-2 gba:transition-all gba:duration-200 gba:cursor-pointer gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-1 gba:shadow-sm hover:gba:shadow-md hover:gba:scale-105 ${borderClass} ${bgClass}`}
      onClick={() => data.onSelect?.()}
      data-testid={data.testId ?? 'flow-viewer-end-node'}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          visibility: 'hidden',
          width: 10,
          height: 10,
          top: `calc(20% - ${HANDLE_OFFSET}px)`,
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />

      <div
        className={`gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:mb-1 ${
          hasFields ? 'gba:bg-success/10' : 'gba:bg-muted'
        }`}
      >
        {hasFields ? (
          <BarChart3 className="gba:h-5 gba:w-5 gba:text-success" strokeWidth={2} />
        ) : (
          <CheckCircle className="gba:h-5 gba:w-5 gba:text-muted-foreground" strokeWidth={2} />
        )}
      </div>

      <div
        className={`gba:font-semibold gba:text-sm ${hasFields ? 'gba:text-foreground' : 'gba:text-muted-foreground'}`}
      >
        {title}
      </div>

      {hasSummaryFields ? (
        hasFields ? (
          <Badge variant="outline" className={NODE_META_BADGE_STANDARD_CLASS}>
            {data.summaryFieldsCount} {data.summaryFieldsCount === 1 ? 'field' : 'fields'}
          </Badge>
        ) : (
          <span className="gba:text-muted-foreground gba:text-xs gba:italic">No fields</span>
        )
      ) : data.description ? (
        <span className="gba:text-muted-foreground gba:text-xs gba:text-center gba:px-3 gba:line-clamp-2">
          {data.description}
        </span>
      ) : (
        <span className="gba:text-muted-foreground gba:text-xs gba:italic">End</span>
      )}
    </button>
  )
}
