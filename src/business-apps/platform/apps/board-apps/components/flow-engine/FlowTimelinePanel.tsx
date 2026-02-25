import React, { useEffect, useState } from 'react'
import { Badge, Spinner } from '@newwork/nw-design-system'
import { Check, Circle, Clock, User, AlertTriangle } from 'lucide-react'
import { getFlowProgressComplete } from '../../services/flowEngine'
import type { FlowProgressComplete, FlowProgressStep } from '../../services/flowEngine'

interface FlowTimelinePanelProps {
  flowId: string
  'data-testid'?: string
}

const stepStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <Check className="gba:w-3.5 gba:h-3.5 gba:text-success" />
    case 'IN_PROGRESS':
    case 'ASSIGNED':
    case 'CLAIMED':
      return <Clock className="gba:w-3.5 gba:h-3.5 gba:text-info" />
    case 'FAILED':
    case 'TIMED_OUT':
      return <AlertTriangle className="gba:w-3.5 gba:h-3.5 gba:text-destructive" />
    default:
      return <Circle className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
  }
}

const stepStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'success' as const
    case 'IN_PROGRESS':
    case 'ASSIGNED':
    case 'CLAIMED':
      return 'info' as const
    case 'FAILED':
    case 'TIMED_OUT':
      return 'destructive' as const
    default:
      return 'secondary' as const
  }
}

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  } catch {
    return iso
  }
}

function StepRow({ step, isLast }: { step: FlowProgressStep; isLast: boolean }) {
  return (
    <div className="gba:flex gba:gap-3">
      <div className="gba:flex gba:flex-col gba:items-center">
        <div className="gba:w-7 gba:h-7 gba:rounded-full gba:border gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:bg-card">
          {stepStatusIcon(step.status)}
        </div>
        {!isLast && <div className="gba:w-px gba:flex-1 gba:bg-border gba:my-0.5" />}
      </div>
      <div className="gba:flex-1 gba:min-w-0 gba:pb-4">
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
          <span className="gba:text-xs gba:font-medium gba:text-foreground">{step.title}</span>
          <Badge variant={stepStatusBadge(step.status)} className="gba:text-[10px]">
            {step.status}
          </Badge>
          {step.type && step.type !== 'TASK' && (
            <Badge variant="outline" className="gba:text-[10px]">
              {step.type}
            </Badge>
          )}
        </div>

        {(step.assignedTo || step.claimedBy) && (
          <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1">
            <User className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
            <span className="gba:text-[11px] gba:text-muted-foreground">
              {step.claimedBy ? `Claimed by ${step.claimedBy}` : `Assigned to ${step.assignedTo}`}
            </span>
          </div>
        )}

        <div className="gba:flex gba:gap-3 gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
          {step.startedAt && <span>Started: {formatDateTime(step.startedAt)}</span>}
          {step.completedAt && <span>Done: {formatDateTime(step.completedAt)}</span>}
          {step.dueDate && <span>Due: {formatDateTime(step.dueDate)}</span>}
        </div>
      </div>
    </div>
  )
}

export const FlowTimelinePanel: React.FC<FlowTimelinePanelProps> = ({
  flowId,
  'data-testid': testId = 'flow-timeline-panel'
}) => {
  const [progress, setProgress] = useState<FlowProgressComplete | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    void (async () => {
      const result = await getFlowProgressComplete(flowId)
      if (!cancelled) {
        setProgress(result)
        setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [flowId])

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-4" data-testid={testId}>
        <Spinner size="sm" />
      </div>
    )
  }

  if (!progress || progress.steps.length === 0) {
    return (
      <p className="gba:text-xs gba:text-muted-foreground gba:py-2" data-testid={testId}>
        No timeline data available.
      </p>
    )
  }

  return (
    <div data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
        <span className="gba:text-xs gba:font-medium gba:text-foreground">{progress.flowName}</span>
        <Badge variant={stepStatusBadge(progress.status)} className="gba:text-[10px]">
          {progress.status}
        </Badge>
        <span className="gba:text-[11px] gba:text-muted-foreground gba:ml-auto">
          {progress.progressPercentage}% complete
        </span>
      </div>

      <div className="gba:border gba:rounded-lg gba:p-3 gba:bg-muted/10">
        {progress.steps.map((step, idx) => (
          <StepRow key={step.stepKey} step={step} isLast={idx === progress.steps.length - 1} />
        ))}
      </div>
    </div>
  )
}
