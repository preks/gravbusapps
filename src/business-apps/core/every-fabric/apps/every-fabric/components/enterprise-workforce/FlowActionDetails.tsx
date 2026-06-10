// Flow-row details for the run detail "Records & actions" section.
//
// Unlike CRM records (which carry an immediate, final state), a triggered
// workflow is a running process — so we poll the Flow Engine and show a
// live status badge plus step progress ("Step 2 of 4 · Review claim")
// alongside the deep link into the Flow Detail page.

import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import React from 'react'

import { labelForStatusCode, variantForStatusCode, STATUS_BADGE_CLASS } from '../../utils/actionCardTrace'
import { useLiveFlowProgress } from '../../hooks/useLiveFlowProgress'

export interface FlowActionDetailsProps {
  workflowId?: string
  templateId?: string
  workflowName: string
  accessToken?: string
  succeeded: boolean
  // When set, the workflow name becomes an in-app button that opens the Flows
  // tab for this workflow (no separate external deep-link icon is shown).
  onOpenFlow?: (workflowId: string) => void
}

interface StepSummaryInput {
  currentStep: number | undefined
  completedSteps: number | undefined
  totalSteps: number | undefined
  percentage: number | undefined
  isComplete: boolean
}

function buildStepSummary({
  currentStep,
  completedSteps,
  totalSteps,
  percentage,
  isComplete
}: StepSummaryInput): string | null {
  if (!totalSteps || totalSteps <= 0) return null
  if (isComplete) {
    return `${totalSteps} of ${totalSteps} steps`
  }
  // Prefer the engine's 1-based current-step index; otherwise infer it
  // from the completed count (the step after the last completed one).
  const inferred = (completedSteps ?? 0) + 1
  const current = Math.min(currentStep ?? inferred, totalSteps)
  const base = `Step ${current} of ${totalSteps}`
  return typeof percentage === 'number' ? `${base} · ${Math.round(percentage)}%` : base
}

export const FlowActionDetails: React.FC<FlowActionDetailsProps> = ({
  workflowId,
  templateId,
  workflowName,
  accessToken,
  succeeded,
  onOpenFlow
}) => {
  const initialCode = succeeded ? 'RUNNING' : 'FAILED'
  const live = useLiveFlowProgress({
    workflowId,
    accessToken,
    initialStatus: {
      code: initialCode,
      label: labelForStatusCode(initialCode),
      variant: variantForStatusCode(initialCode)
    },
    enabled: Boolean(workflowId)
  })

  const isComplete = live.status.variant === 'success'
  const stepSummary = buildStepSummary({
    currentStep: live.currentStep,
    completedSteps: live.completedSteps,
    totalSteps: live.totalSteps,
    percentage: live.percentage,
    isComplete
  })
  const flowUrl = workflowId ? `/platform/apps/flow/apps/detail?flowId=${encodeURIComponent(workflowId)}` : null
  const canOpenInApp = Boolean(onOpenFlow && workflowId)

  return (
    <div className="gba:mt-2 gba:space-y-1.5">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
        {canOpenInApp && workflowId ? (
          <button
            type="button"
            onClick={() => onOpenFlow?.(workflowId)}
            className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-md gba:border gba:border-primary/40 gba:bg-primary/5 gba:px-2 gba:py-0.5 gba:font-mono gba:text-[11px] gba:text-primary gba:hover:bg-primary/10"
            data-testid="entity-open-workflow"
          >
            {workflowName}
          </button>
        ) : flowUrl ? (
          <a
            href={flowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-md gba:border gba:border-primary/40 gba:bg-primary/5 gba:px-2 gba:py-0.5 gba:font-mono gba:text-[11px] gba:text-primary gba:hover:bg-primary/10"
            data-testid="entity-link-workflow"
          >
            {workflowName}
            <ArrowSquareOutIcon className="gba:h-3 gba:w-3" />
          </a>
        ) : (
          <span className="gba:inline-flex gba:items-center gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/40 gba:px-2 gba:py-0.5 gba:font-mono gba:text-[11px] gba:text-muted-foreground">
            {workflowName}
          </span>
        )}
        <span
          className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${STATUS_BADGE_CLASS[live.status.variant]}`}
          data-testid="flow-status-badge"
          data-status-code={live.status.code}
        >
          {live.status.variant === 'running' && (
            <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-current gba:animate-pulse" aria-hidden />
          )}
          {live.status.label}
        </span>
        {templateId && (
          <span className="gba:inline-flex gba:items-center gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/40 gba:px-2 gba:py-0.5 gba:font-mono gba:text-[11px] gba:text-muted-foreground">
            template_id: {templateId}
          </span>
        )}
      </div>
      {(stepSummary || live.currentStepTitle) && (
        <p className="gba:text-[11px] gba:text-muted-foreground" data-testid="flow-step-summary">
          {stepSummary}
          {stepSummary && live.currentStepTitle ? ' · ' : ''}
          {live.currentStepTitle && <span className="gba:text-foreground/80">{live.currentStepTitle}</span>}
        </p>
      )}
    </div>
  )
}
