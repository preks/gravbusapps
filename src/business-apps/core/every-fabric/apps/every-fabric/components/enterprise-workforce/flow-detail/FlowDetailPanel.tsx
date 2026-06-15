// Full Custom Flow Engine detail for one workflow, shown in the Flows tab of
// the run/session screen. Renders the flow header (name, live status, progress,
// initiator), a timings strip (started / completed, with SLA + due-date
// placeholders the engine does not yet expose), and a per-step breakdown
// (status, actor, timings) backfilled with display names from flow history.

import { ArrowSquareOutIcon, ClockIcon } from '@phosphor-icons/react'
import React from 'react'

import { labelForStatusCode, variantForStatusCode } from '../../../utils/actionCardTrace'
import { formatTimestamp } from '../runDisplay'
import { FlowProgressBar } from './FlowProgressBar'
import { FlowStepRow } from './FlowStepRow'
import { Field, StatusBadge } from './flowDetailPrimitives'
import { NOT_AVAILABLE, historyNameByStep, progressSummary } from './flowStepFormat'
import { useFlowDetail } from './useFlowDetail'

export interface FlowDetailPanelProps {
  workflowId?: string
  templateId?: string
  workflowName: string
  accessToken?: string
  succeeded?: boolean
}

export const FlowDetailPanel: React.FC<FlowDetailPanelProps> = ({
  workflowId,
  templateId,
  workflowName,
  accessToken,
  succeeded
}) => {
  const initialCode = succeeded === false ? 'FAILED' : 'RUNNING'
  const { overview, history, status, isLoading, error } = useFlowDetail({
    workflowId,
    accessToken,
    initialStatus: {
      code: initialCode,
      label: labelForStatusCode(initialCode),
      variant: variantForStatusCode(initialCode)
    },
    enabled: Boolean(workflowId)
  })

  if (!workflowId) {
    return (
      <p className="gba:text-xs gba:italic gba:text-muted-foreground" data-testid="flow-detail-empty">
        This action did not return a workflow id.
      </p>
    )
  }

  const displayName = overview?.name ?? workflowName
  const progress = overview?.progress
  const isComplete = status.variant === 'success'
  const stepSummary = progressSummary(
    progress?.currentStep,
    progress?.totalSteps,
    progress?.completedSteps,
    progress?.percentage,
    isComplete
  )
  const flowUrl = `/platform/apps/flow/apps/detail?flowId=${encodeURIComponent(workflowId)}`
  const nameByStep = historyNameByStep(history)
  const steps = overview?.steps ?? []

  return (
    <div className="gba:space-y-3" data-testid="flow-detail-panel">
      <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-card gba:p-4 gba:shadow-sm">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
          <a
            href={flowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gba:inline-flex gba:items-center gba:gap-1 gba:text-sm gba:font-semibold gba:text-foreground gba:hover:text-primary"
            data-testid="flow-detail-link"
          >
            {displayName}
            <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5" />
          </a>
          <StatusBadge code={status.code} testId="flow-detail-status" />
        </div>
        <div className="gba:mt-3 gba:grid gba:grid-cols-2 gba:gap-x-4 gba:gap-y-2 sm:gba:grid-cols-4">
          <Field label="Initiated by" value={overview?.initiatedBy ?? NOT_AVAILABLE} muted={!overview?.initiatedBy} />
          <Field label="Progress" value={stepSummary ?? NOT_AVAILABLE} muted={!stepSummary} />
          <Field label="Started" value={formatTimestamp(overview?.createdAt)} />
          <Field label="Completed" value={formatTimestamp(overview?.completedAt)} />
        </div>
        <div className="gba:mt-3">
          <FlowProgressBar
            completedSteps={progress?.completedSteps}
            totalSteps={progress?.totalSteps}
            percentage={progress?.percentage}
            variant={status.variant}
            isComplete={isComplete}
          />
        </div>
        {templateId && (
          <div className="gba:mt-3">
            <span className="gba:inline-flex gba:items-center gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/40 gba:px-2 gba:py-0.5 gba:font-mono gba:text-[11px] gba:text-muted-foreground">
              template_id: {templateId}
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="gba:text-xs gba:text-destructive" data-testid="flow-detail-error">
          {error}
        </p>
      )}

      <div>
        <div className="gba:mb-2 gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          <ClockIcon className="gba:h-3.5 gba:w-3.5" />
          Steps
        </div>
        {steps.length > 0 ? (
          <ul className="gba:space-y-1.5" data-testid="flow-step-list">
            {steps.map(step => (
              <FlowStepRow
                key={`${step.stepIndex}:${step.title}`}
                step={step}
                nameByStep={nameByStep}
                workflowId={workflowId}
                accessToken={accessToken}
              />
            ))}
          </ul>
        ) : (
          <p className="gba:text-xs gba:italic gba:text-muted-foreground" data-testid="flow-detail-steps-empty">
            {isLoading ? 'Loading steps…' : 'No steps reported yet.'}
          </p>
        )}
      </div>
    </div>
  )
}
