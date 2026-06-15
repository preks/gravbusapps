// One step in the Custom Flow Engine list view. Shows step status / actor /
// timings and, for completed or active steps, an expandable Results section
// that lazily loads the step's captured output from the engine.

import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'
import React, { useState } from 'react'

import { formatTimestamp } from '../runDisplay'
import { FlowStepResult } from './FlowStepResult'
import type { FlowDetailStep } from './flowDetailTypes'
import { Field, StatusBadge } from './flowDetailPrimitives'
import { NOT_AVAILABLE, formatMinutes, resolveStepActor } from './flowStepFormat'
import { useFlowStepResult } from './useFlowStepResult'

const RESULT_STATUSES = new Set(['COMPLETED', 'IN_PROGRESS', 'CLAIMED', 'ACTIVE', 'RUNNING'])

function canHaveResults(status: string): boolean {
  return RESULT_STATUSES.has(status.toUpperCase())
}

export interface FlowStepRowProps {
  step: FlowDetailStep
  nameByStep: Map<number, string>
  workflowId?: string
  accessToken?: string
}

export const FlowStepRow: React.FC<FlowStepRowProps> = ({ step, nameByStep, workflowId, accessToken }) => {
  const [expanded, setExpanded] = useState(false)
  const actor = resolveStepActor(step, nameByStep)
  const duration = formatMinutes(step.completionTimeMinutes)
  const resultsAvailable = canHaveResults(step.status) && Boolean(workflowId)

  const stepResult = useFlowStepResult({
    workflowId,
    stepReference: `step_${step.stepIndex}`,
    accessToken,
    enabled: expanded && resultsAvailable
  })

  return (
    <li
      className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-card gba:p-3 gba:text-xs gba:text-foreground"
      data-testid="flow-step-row"
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
        <div className="gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <span className="gba:font-semibold">
              {step.stepIndex + 1}. {step.title}
            </span>
            {step.type && <span className="gba:text-[11px] gba:text-muted-foreground">· {step.type}</span>}
          </div>
        </div>
        <StatusBadge code={step.status} testId="flow-step-status" />
      </div>
      <div className="gba:mt-2 gba:grid gba:grid-cols-2 gba:gap-x-4 gba:gap-y-2 sm:gba:grid-cols-3">
        <Field label="Who" value={actor.label} muted={actor.isPlaceholder} testId="flow-step-actor" />
        <Field label="Started" value={formatTimestamp(step.startedAt)} />
        <Field label="Completed" value={formatTimestamp(step.completedAt)} />
        <Field label="Claimed" value={formatTimestamp(step.claimedAt)} />
        <Field label="Duration" value={duration ?? NOT_AVAILABLE} muted={!duration} />
        <Field
          label="Due / SLA"
          value={step.dueDate ? formatTimestamp(step.dueDate) : NOT_AVAILABLE}
          muted={!step.dueDate}
        />
      </div>

      {resultsAvailable && (
        <div className="gba:mt-2 gba:border-t gba:border-border/50 gba:pt-2">
          <button
            type="button"
            className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:hover:text-foreground"
            onClick={() => setExpanded(value => !value)}
            aria-expanded={expanded}
            data-testid="flow-step-results-toggle"
          >
            {expanded ? <CaretDownIcon className="gba:h-3 gba:w-3" /> : <CaretRightIcon className="gba:h-3 gba:w-3" />}
            Results
          </button>
          {expanded && (
            <div className="gba:mt-2">
              <FlowStepResult {...stepResult} accessToken={accessToken} />
            </div>
          )}
        </div>
      )}
    </li>
  )
}
