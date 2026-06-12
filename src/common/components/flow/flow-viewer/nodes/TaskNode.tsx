import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import {
  Ban,
  Bot,
  Brain,
  CheckCircle2,
  ClipboardList,
  Clock,
  Code2,
  Info,
  Play,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  UserCheck,
  UserPlus,
  Users,
  Zap
} from 'lucide-react'
import { TASK_NODE_WIDTH, TASK_NODE_HEIGHT, HANDLE_OFFSET } from './nodeDimensions'
import { NODE_META_BADGE_STANDARD_CLASS } from './nodeBadgeStyles'
import { NodeOutcomeBadge } from './NodeOutcomeBadge'
import type { TaskVariant, StepStatus, FlowNodeOutcome } from '../types/viewerTypes'

interface TaskNodeData {
  title: string
  description?: string
  taskVariant?: TaskVariant
  assignmentMode?: string
  stepNumber?: number
  isSelected?: boolean
  isDeactivated?: boolean
  status?: StepStatus
  outcome?: FlowNodeOutcome
  isOnActivePath?: boolean
  isAwaitingInput?: boolean
  isAwaitingOutput?: boolean
  validationIssues?: Array<{ severity: 'error' | 'warning' | 'info'; message: string }>
  actions?: {
    onTest?: () => void
    onToggleActive?: () => void
  }
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
  AI_TASK_EXPERT: { label: '', Icon: Bot, isAI: true }
}

function getStatusBorder(status?: StepStatus, isSelected?: boolean, isOnActivePath?: boolean): string {
  if (isSelected) return 'gba:border-primary'
  if (isOnActivePath) return 'gba:border-info'
  if (status === 'completed') return 'gba:border-success'
  if (status === 'active') return 'gba:border-info'
  if (status === 'failed') return 'gba:border-destructive'
  if (status === 'skipped') return 'gba:border-muted-foreground/30 gba:opacity-60'
  return 'gba:border-border'
}

function getStatusBg(status?: StepStatus, isSelected?: boolean, isOnActivePath?: boolean): string {
  if (isSelected) return 'gba:bg-card'
  if (isOnActivePath) return 'gba:bg-card'
  if (status === 'completed') return 'gba:bg-card'
  if (status === 'active') return 'gba:bg-card'
  if (status === 'failed') return 'gba:bg-card'
  return 'gba:bg-card'
}

export const TaskNode: React.FC<{ data: TaskNodeData }> = ({ data }) => {
  const { t } = useTranslation(translations)
  const variant = data.taskVariant ?? 'TASK'
  const baseMeta = (VARIANT_META as Record<string, (typeof VARIANT_META)[TaskVariant]>)[variant] ?? VARIANT_META.TASK
  const meta = variant === 'AI_TASK_EXPERT' ? { ...baseMeta, label: t('task-node-label-enterprise-agent') } : baseMeta
  const borderClass = getStatusBorder(data.status, data.isSelected, data.isOnActivePath)
  const bgClass = getStatusBg(data.status, data.isSelected, data.isOnActivePath)
  const isAI = meta.isAI === true
  const isFunction = variant === 'FUNCTION'
  const isDeactivated = data.isDeactivated === true
  const showAssignmentMode = !isAI && !isFunction && Boolean(data.assignmentMode)
  const isMultiAssign = data.assignmentMode === 'ASSIGN'
  const blockingIssues = (data.validationIssues ?? []).filter(issue => issue.severity === 'error')
  const warningIssues = (data.validationIssues ?? []).filter(issue => issue.severity !== 'error')
  const hasIssues = blockingIssues.length > 0 || warningIssues.length > 0
  const showTestAction = Boolean(data.actions?.onTest && !isDeactivated)
  const showToggleAction = Boolean(data.actions?.onToggleActive)
  const hasInputData = Boolean(data.outcome?.inputData || data.outcome?.formData)
  const hasExecutionDetails = Boolean(
    data.outcome?.executionDetails && Object.keys(data.outcome.executionDetails).length > 0
  )
  const hasOutputData = Boolean(
    data.outcome?.outputData ||
      hasExecutionDetails ||
      data.outcome?.error ||
      (data.outcome?.fields && data.outcome.fields.length > 0)
  )
  const isAwaitingInput = data.isAwaitingInput === true || (data.status === 'active' && !hasInputData)
  const isAwaitingOutput =
    data.isAwaitingOutput === true || (data.status === 'active' && !isAwaitingInput && !hasOutputData)
  let CategoryIcon = UserCheck
  if (isFunction) CategoryIcon = Zap
  else if (isAI) CategoryIcon = Sparkles
  const selectNode = () => data.onSelect?.()
  const handleNodeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    data.onSelect?.()
  }

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
      <div
        role="button"
        tabIndex={0}
        className={`nopan nodrag gba:group gba:relative gba:z-10 gba:h-full gba:w-full gba:border-2 gba:rounded-lg gba:p-3 gba:transition-all gba:duration-200 gba:shadow-sm gba:cursor-pointer gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring ${borderClass} ${bgClass} ${
          isDeactivated ? 'gba:opacity-60 gba:saturate-50' : ''
        }`}
        onClick={selectNode}
        onKeyDown={handleNodeKeyDown}
        data-testid={data.testId ?? 'flow-viewer-task-node'}
      >
        {showTestAction || showToggleAction ? (
          <div className="gba:pointer-events-auto gba:absolute gba:-top-10 gba:left-1/2 gba:z-50 gba:flex gba:-translate-x-1/2 gba:items-center gba:gap-1 gba:rounded-md gba:bg-popover gba:p-1 gba:opacity-0 gba:shadow-md gba:transition-opacity gba:group-hover:opacity-100 gba:focus-within:opacity-100">
            {showTestAction ? (
              <button
                type="button"
                className="gba:inline-flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded gba:text-foreground hover:gba:bg-muted"
                title="Test this step"
                aria-label="Test this step"
                onClick={event => {
                  event.stopPropagation()
                  data.actions?.onTest?.()
                }}
                onKeyDown={event => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  event.stopPropagation()
                  data.actions?.onTest?.()
                }}
              >
                <Play className="gba:h-3.5 gba:w-3.5" />
              </button>
            ) : null}
            {showToggleAction ? (
              <button
                type="button"
                className="gba:inline-flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded gba:text-foreground hover:gba:bg-muted"
                title={isDeactivated ? 'Activate this step' : 'Deactivate this step'}
                aria-label={isDeactivated ? 'Activate this step' : 'Deactivate this step'}
                onClick={event => {
                  event.stopPropagation()
                  data.actions?.onToggleActive?.()
                }}
                onKeyDown={event => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  event.stopPropagation()
                  data.actions?.onToggleActive?.()
                }}
              >
                {isDeactivated ? (
                  <RotateCcw className="gba:h-3.5 gba:w-3.5" />
                ) : (
                  <Ban className="gba:h-3.5 gba:w-3.5" />
                )}
              </button>
            ) : null}
          </div>
        ) : null}
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
          <div
            className={`gba:font-semibold gba:text-sm gba:line-clamp-1 gba:text-foreground gba:text-center ${
              isDeactivated ? 'gba:line-through' : ''
            }`}
          >
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
            {isDeactivated ? (
              <Badge variant="secondary" className={`${NODE_META_BADGE_STANDARD_CLASS}`}>
                Deactivated
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

        {hasIssues ? (
          <div
            className="gba:absolute gba:top-2 gba:right-2"
            title={(data.validationIssues ?? []).map(issue => issue.message).join('\n')}
          >
            <TriangleAlert
              className={`gba:h-4 gba:w-4 ${blockingIssues.length > 0 ? 'gba:text-destructive' : 'gba:text-warning'}`}
            />
          </div>
        ) : null}

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
        <NodeOutcomeBadge
          outcome={data.outcome}
          isAwaitingInput={isAwaitingInput}
          isRunning={isAwaitingOutput}
          placement="edge"
        />
      </div>
    </div>
  )
}
