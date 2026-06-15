import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Badge } from '@newwork/nw-design-system'
import { Merge } from 'lucide-react'
import { HANDLE_OFFSET } from './nodeDimensions'
import { NODE_META_BADGE_COMPACT_CLASS } from './nodeBadgeStyles'
import { activeNodeHighlightClass } from './activeNodeStyles'
import type { StepStatus } from '../types/viewerTypes'

interface JoinNodeData {
  label?: string
  joinCondition?: 'ALL' | 'ANY'
  isSelected?: boolean
  status?: StepStatus
  isOnActivePath?: boolean
  onSelect?: () => void
  testId?: string
}

function getStatusBorder(status?: StepStatus, isSelected?: boolean, isOnActivePath?: boolean): string {
  if (isSelected) return 'gba:border-primary'
  if (isOnActivePath) return 'gba:border-info'
  if (status === 'completed') return 'gba:border-success'
  if (status === 'active') return 'gba:border-info'
  return 'gba:border-border'
}

function getStatusBg(status?: StepStatus, isSelected?: boolean, isOnActivePath?: boolean): string {
  if (isSelected) return 'gba:bg-card'
  if (isOnActivePath) return 'gba:bg-card'
  if (status === 'active') return 'gba:bg-card'
  return 'gba:bg-card'
}

export const JoinNode: React.FC<{ data: JoinNodeData }> = ({ data }) => {
  const borderClass = getStatusBorder(data.status, data.isSelected, data.isOnActivePath)
  const bgClass = getStatusBg(data.status, data.isSelected, data.isOnActivePath)
  const activeClass = activeNodeHighlightClass(data.status, data.isSelected)
  const condition = data.joinCondition ?? 'ALL'

  return (
    <button
      type="button"
      className={`nopan nodrag gba:relative gba:overflow-visible gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:scale-[1.02]`}
      onClick={() => data.onSelect?.()}
      data-testid={data.testId ?? 'flow-viewer-join-node'}
    >
      {/* Multiple target handles for branches */}
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
      <Handle
        type="target"
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
        type="target"
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

      <div
        className={`gba:flex gba:items-center gba:justify-center gba:gap-2 gba:rounded-lg gba:border-2 gba:px-6 gba:py-2 gba:min-w-[200px] gba:shadow-sm ${borderClass} ${bgClass} ${activeClass}`}
      >
        <Merge className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        <span className="gba:text-xs gba:font-semibold gba:text-foreground">{data.label || 'Parallel Merge'}</span>
        <Badge variant="outline" className={NODE_META_BADGE_COMPACT_CLASS}>
          {condition === 'ALL' ? 'Wait All' : 'Wait Any'}
        </Badge>
      </div>
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
    </button>
  )
}
