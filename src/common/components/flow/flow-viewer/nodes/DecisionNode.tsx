import React from 'react'
import { Handle, Position } from 'reactflow'
import { Badge } from '@newwork/nw-design-system'
import { GitBranch, User, Bot, Calculator } from 'lucide-react'
import { HANDLE_OFFSET } from './nodeDimensions'
import type { DecisionMode, StepStatus } from '../types/viewerTypes'

interface DecisionNodeData {
  label: string
  decisionMode?: DecisionMode
  isSelected?: boolean
  status?: StepStatus
  onSelect?: () => void
  testId?: string
}

const MODE_ICONS: Record<DecisionMode, React.ElementType> = {
  USER: User,
  AI: Bot,
  LOGIC: Calculator
}

const MODE_LABELS: Record<DecisionMode, string> = {
  USER: 'User',
  AI: 'AI',
  LOGIC: 'Logic'
}

function getStatusBorder(status?: StepStatus, isSelected?: boolean): string {
  if (isSelected) return 'gba:border-primary gba:shadow-md'
  if (status === 'completed') return 'gba:border-success'
  if (status === 'active') return 'gba:border-primary'
  if (status === 'failed') return 'gba:border-destructive'
  return 'gba:border-border'
}

function getStatusBg(status?: StepStatus, isSelected?: boolean): string {
  if (isSelected) return 'gba:bg-accent'
  if (status === 'active') return 'gba:bg-accent'
  if (status === 'completed') return 'gba:bg-success-secondary'
  if (status === 'failed') return 'gba:bg-destructive-secondary'
  return 'gba:bg-card'
}

// 120px square rotated 45deg → visual diagonal ≈ 170px
const DIAMOND_SIZE = 120
const VISUAL_SIZE = Math.ceil(DIAMOND_SIZE * Math.SQRT2) // ~170

export const DecisionNode: React.FC<{ data: DecisionNodeData }> = ({ data }) => {
  const mode = data.decisionMode ?? 'LOGIC'
  const ModeIcon = MODE_ICONS[mode]

  const borderClass = getStatusBorder(data.status, data.isSelected)
  const bgClass = getStatusBg(data.status, data.isSelected)

  return (
    <button
      type="button"
      className="nopan nodrag gba:relative gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:scale-105"
      style={{ width: VISUAL_SIZE, height: VISUAL_SIZE }}
      onClick={() => data.onSelect?.()}
      data-testid={data.testId ?? 'flow-viewer-decision-node'}
    >
      {/* Handles at the actual diamond vertices */}
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

      {/* Diamond shape centered in the visual bounding box */}
      <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
        <div
          className={`gba:rotate-45 gba:border-2 gba:rounded-md gba:shadow-sm gba:flex gba:items-center gba:justify-center ${borderClass} ${bgClass}`}
          style={{ width: DIAMOND_SIZE, height: DIAMOND_SIZE }}
        >
          <div className="gba:-rotate-45 gba:flex gba:flex-col gba:items-center gba:gap-1">
            <div className="gba:flex gba:items-center gba:gap-1">
              <GitBranch className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <ModeIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            </div>
            <div className="gba:text-xs gba:font-semibold gba:text-foreground gba:max-w-[80px] gba:truncate gba:text-center">
              {data.label}
            </div>
            <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
              {MODE_LABELS[mode]}
            </Badge>
          </div>
        </div>
      </div>
    </button>
  )
}
