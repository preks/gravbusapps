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
  Zap
} from 'lucide-react'
import { TASK_NODE_WIDTH, TASK_NODE_HEIGHT, HANDLE_OFFSET } from './nodeDimensions'
import type { TaskVariant, StepStatus } from '../types/viewerTypes'

interface TaskNodeData {
  title: string
  description?: string
  taskVariant?: TaskVariant
  assignmentMode?: string
  stepNumber?: number
  isSelected?: boolean
  status?: StepStatus
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

function getStatusBorder(status?: StepStatus, isSelected?: boolean): string {
  if (isSelected) return 'gba:border-primary gba:shadow-md gba:scale-[1.02]'
  if (status === 'completed') return 'gba:border-success'
  if (status === 'active') return 'gba:border-primary gba:shadow-md'
  if (status === 'failed') return 'gba:border-destructive'
  if (status === 'skipped') return 'gba:border-muted-foreground/30 gba:opacity-60'
  return 'gba:border-border'
}

function getStatusBg(status?: StepStatus, isSelected?: boolean): string {
  if (isSelected) return 'gba:bg-accent'
  if (status === 'completed') return 'gba:bg-success-secondary'
  if (status === 'active') return 'gba:bg-accent'
  if (status === 'failed') return 'gba:bg-destructive-secondary'
  return 'gba:bg-card'
}

export const TaskNode: React.FC<{ data: TaskNodeData }> = ({ data }) => {
  const variant = data.taskVariant ?? 'TASK'
  const meta = (VARIANT_META as Record<string, (typeof VARIANT_META)[TaskVariant]>)[variant] ?? VARIANT_META.TASK
  const borderClass = getStatusBorder(data.status, data.isSelected)
  const bgClass = getStatusBg(data.status, data.isSelected)
  const isAI = meta.isAI === true
  const isFunction = variant === 'FUNCTION'
  const CategoryIcon = isFunction ? Zap : isAI ? Sparkles : UserCheck

  return (
    <button
      type="button"
      className={`nopan nodrag gba:border-2 gba:rounded-lg gba:p-3 gba:transition-all gba:duration-200 gba:shadow-sm gba:cursor-pointer ${borderClass} ${bgClass}`}
      style={{ width: TASK_NODE_WIDTH, height: TASK_NODE_HEIGHT }}
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
          <Badge variant="secondary" className="gba:text-xs gba:flex gba:items-center gba:gap-1">
            <meta.Icon className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
            {meta.label}
          </Badge>

          {data.assignmentMode ? (
            <Badge
              variant="secondary"
              className={[
                'gba:text-xs gba:flex gba:items-center gba:gap-1 gba:border-none',
                data.assignmentMode === 'ASSIGN'
                  ? 'gba:bg-success-secondary gba:text-success-secondary-foreground'
                  : data.assignmentMode === 'ASSIGN_DEFERRED'
                    ? 'gba:bg-info-secondary gba:text-info-secondary-foreground'
                    : 'gba:bg-accent gba:text-accent-foreground'
              ].join(' ')}
            >
              {data.assignmentMode === 'CLAIM' ? (
                <>
                  <UserCheck className="gba:h-3 gba:w-3" /> Claim
                </>
              ) : (
                <>
                  <UserPlus className="gba:h-3 gba:w-3" /> Assign
                </>
              )}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Description */}
      {data.description && (
        <div className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1 gba:text-center">{data.description}</div>
      )}

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
          className={`gba:absolute gba:top-2 gba:left-2 gba:w-6 gba:h-6 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold gba:text-primary-foreground ${
            data.isSelected
              ? 'gba:bg-primary'
              : data.status === 'completed'
                ? 'gba:bg-success'
                : 'gba:bg-muted-foreground'
          }`}
        >
          {data.stepNumber}
        </div>
      )}
    </button>
  )
}
