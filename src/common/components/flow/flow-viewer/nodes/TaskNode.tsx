import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Badge } from '@newwork/nw-design-system'
import {
  Bot,
  Brain,
  CheckCircle2,
  ClipboardList,
  Clock,
  Code2,
  Info,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Zap
} from 'lucide-react'
import { TASK_NODE_WIDTH, TASK_NODE_HEIGHT, HANDLE_OFFSET } from './nodeDimensions'
import { NODE_META_BADGE_STANDARD_CLASS } from './nodeBadgeStyles'
import type { TaskVariant, StepStatus } from '../types/viewerTypes'

interface TaskNodeData {
  title: string
  description?: string
  taskVariant?: TaskVariant
  assignmentMode?: string
  stepNumber?: number
  isSelected?: boolean
  status?: StepStatus
  isOnActivePath?: boolean
  iteration?: number
  onSelect?: () => void
  testId?: string
}

const VARIANT_META: Record<
  TaskVariant,
  {
    label: string
    Icon: React.FC<{ className?: string }>
    isAI?: boolean
  }
> = {
  TASK: { label: 'Task', Icon: ClipboardList },
  APPROVAL: { label: 'Approval', Icon: UserCheck },
  ACKNOWLEDGE: { label: 'Acknowledge', Icon: CheckCircle2 },
  INFORMATION: { label: 'Information', Icon: Info },
  FUNCTION: { label: 'Function', Icon: Code2 },
  AI_AGENT: { label: 'EveryAI Agent', Icon: Brain, isAI: true },
  AI_TASK_EXPERT: { label: 'AI Task Expert', Icon: Bot, isAI: true }
}

function getStatusBorder(status?: StepStatus, isSelected?: boolean, isOnActivePath?: boolean): string {
  if (isSelected) return 'gba:border-primary gba:shadow-md gba:scale-[1.02]'
  if (isOnActivePath) return 'gba:border-info'
  if (status === 'completed') return 'gba:border-success'
  if (status === 'active') return 'gba:border-info gba:shadow-md'
  if (status === 'failed') return 'gba:border-destructive'
  if (status === 'skipped') return 'gba:border-muted-foreground/30 gba:opacity-60'
  return 'gba:border-border'
}

function getStatusBg(status?: StepStatus, isSelected?: boolean, isOnActivePath?: boolean): string {
  if (isSelected) return 'gba:bg-card'
  if (isOnActivePath) return 'gba:bg-card'
  if (status === 'completed') return 'gba:bg-success-secondary'
  if (status === 'active') return 'gba:bg-accent'
  if (status === 'failed') return 'gba:bg-destructive-secondary'
  return 'gba:bg-card'
}

export const TaskNode: React.FC<{ data: TaskNodeData }> = ({ data }) => {
  const variant = data.taskVariant ?? 'TASK'
  const meta = (VARIANT_META as Record<string, (typeof VARIANT_META)[TaskVariant]>)[variant] ?? VARIANT_META.TASK
  const borderClass = getStatusBorder(data.status, data.isSelected, data.isOnActivePath)
  const bgClass = getStatusBg(data.status, data.isSelected, data.isOnActivePath)
  const isAI = meta.isAI === true
  const isFunction = variant === 'FUNCTION'
  const showAssignmentMode = !isAI && !isFunction && Boolean(data.assignmentMode)
  const isMultiAssign = data.assignmentMode === 'ASSIGN'
  let CategoryIcon = UserCheck
  if (isFunction) CategoryIcon = Zap
  else if (isAI) CategoryIcon = Sparkles

  return (
    <div className="gba:relative gba:overflow-visible" style={{ width: TASK_NODE_WIDTH, height: TASK_NODE_HEIGHT }}>
      {isMultiAssign ? (
        <>
          <div
            aria-hidden="true"
            className="gba:pointer-events-none gba:absolute gba:inset-0 gba:z-[2] gba:translate-x-2 gba:-translate-y-2 gba:rounded-lg gba:border-2 gba:border-border/65 gba:bg-card"
          />
          <div
            aria-hidden="true"
            className="gba:pointer-events-none gba:absolute gba:inset-0 gba:z-[1] gba:translate-x-4 gba:-translate-y-4 gba:rounded-lg gba:border-2 gba:border-border/50 gba:bg-card"
          />
        </>
      ) : null}
      <button
        type="button"
        className={`nopan nodrag gba:relative gba:z-10 gba:h-full gba:w-full gba:border-2 gba:rounded-lg gba:p-3 gba:transition-all gba:duration-200 gba:shadow-sm gba:cursor-pointer ${borderClass} ${bgClass}`}
        onClick={() => data.onSelect?.()}
        data-testid={data.testId ?? 'flow-viewer-task-node'}
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
        {/* Left target handle for send-back edges (avoids overlapping the "+" on the main lane) */}
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

        {/* Header */}
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5 gba:mb-2">
          {/* Category marker (User / AI / Function) */}
          <div className="gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-full gba:bg-muted">
            <CategoryIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          </div>

          {/* Title */}
          <div className="gba:font-semibold gba:text-sm gba:line-clamp-1 gba:text-foreground gba:text-center">
            {data.title || `Step ${data.stepNumber ?? ''}`}
          </div>

          {/* Type pill + assignment pill */}
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <Badge
              variant="outline"
              className={`${NODE_META_BADGE_STANDARD_CLASS} gba:flex gba:items-center gba:gap-1`}
            >
              <meta.Icon className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
              {meta.label}
            </Badge>

            {showAssignmentMode ? (
              <Badge
                variant="outline"
                className={`${NODE_META_BADGE_STANDARD_CLASS} gba:flex gba:items-center gba:gap-1`}
              >
                {data.assignmentMode === 'CLAIM' ? (
                  <>
                    <UserCheck className="gba:h-3 gba:w-3" /> Claim
                  </>
                ) : (
                  <>
                    {isMultiAssign ? <Users className="gba:h-3 gba:w-3" /> : <UserPlus className="gba:h-3 gba:w-3" />}
                    Assign
                  </>
                )}
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Iteration badge */}
        {data.iteration && data.iteration > 1 && (
          <div className="gba:absolute gba:-top-2 gba:-right-2">
            <Badge
              variant="outline"
              className="gba:text-xs gba:bg-warning/10 gba:text-warning gba:border-warning/30 gba:flex gba:items-center gba:gap-0.5"
            >
              <Clock className="gba:h-3 gba:w-3" />x{data.iteration}
            </Badge>
          </div>
        )}

        {/* Step number (inside node so it is not clipped by wrapper overflow) */}
        {data.stepNumber != null && (
          <div
            className={(() => {
              let stepBg = 'gba:bg-muted-foreground'
              if (data.isSelected) stepBg = 'gba:bg-primary'
              else if (data.isOnActivePath) stepBg = 'gba:bg-primary'
              else if (data.status === 'completed') stepBg = 'gba:bg-success'
              return `gba:absolute gba:top-2 gba:left-2 gba:w-6 gba:h-6 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold gba:text-primary-foreground ${stepBg}`
            })()}
          >
            {data.stepNumber}
          </div>
        )}
      </button>
    </div>
  )
}
