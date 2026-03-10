import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Badge } from '@newwork/nw-design-system'
import { GitFork } from 'lucide-react'
import { HANDLE_OFFSET } from './nodeDimensions'
import { NODE_META_BADGE_COMPACT_CLASS } from './nodeBadgeStyles'
import type { StepStatus } from '../types/viewerTypes'

interface ForkNodeData {
  label?: string
  branchCount?: number
  isSelected?: boolean
  status?: StepStatus
  onSelect?: () => void
  testId?: string
}

function getStatusBorder(status?: StepStatus, isSelected?: boolean): string {
  if (isSelected) return 'gba:border-primary'
  if (status === 'completed') return 'gba:border-success'
  if (status === 'active') return 'gba:border-primary'
  return 'gba:border-border'
}

function getStatusBg(status?: StepStatus, isSelected?: boolean): string {
  if (isSelected) return 'gba:bg-accent'
  if (status === 'active') return 'gba:bg-accent'
  return 'gba:bg-card'
}

export const ForkNode: React.FC<{ data: ForkNodeData }> = ({ data }) => {
  const borderClass = getStatusBorder(data.status, data.isSelected)
  const bgClass = getStatusBg(data.status, data.isSelected)

  return (
    <button
      type="button"
      className={`nopan nodrag gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:scale-[1.02]`}
      onClick={() => data.onSelect?.()}
      data-testid={data.testId ?? 'flow-viewer-fork-node'}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          visibility: 'hidden',
          width: 10,
          height: 10,
          left: '50%',
          top: -HANDLE_OFFSET,
          transform: 'translateX(-50%)'
        }}
      />

      <div
        className={`gba:flex gba:items-center gba:justify-center gba:gap-2 gba:rounded-lg gba:border-2 gba:px-6 gba:py-2 gba:min-w-[200px] gba:shadow-sm ${borderClass} ${bgClass}`}
      >
        <GitFork className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        <span className="gba:text-xs gba:font-semibold gba:text-foreground">{data.label || 'Parallel Split'}</span>
        {data.branchCount != null && (
          <Badge variant="outline" className={NODE_META_BADGE_COMPACT_CLASS}>
            {data.branchCount}
          </Badge>
        )}
      </div>

      {/* Multiple source handles for branches */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          visibility: 'hidden',
          width: 10,
          height: 10,
          left: '50%',
          bottom: -HANDLE_OFFSET,
          transform: 'translateX(-50%)'
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{
          visibility: 'hidden',
          width: 10,
          height: 10,
          left: -HANDLE_OFFSET,
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          visibility: 'hidden',
          width: 10,
          height: 10,
          right: -HANDLE_OFFSET,
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />
    </button>
  )
}
