// Side panel shown when a node is clicked on the workforce Flow Map. Resolves
// the clicked node to a Custom Flow Engine step reference and lazily renders the
// step's captured result, reusing the shared FlowStepResult renderer.

import { XIcon } from '@phosphor-icons/react'
import React from 'react'

import { flowNodeIdToStepIndex } from '@/common/data/flow/templateToFlowGraph'

import { FlowStepResult } from './FlowStepResult'
import type { FlowDetailStep } from './flowDetailTypes'
import { StatusBadge } from './flowDetailPrimitives'
import { useFlowStepResult } from './useFlowStepResult'

export interface WorkforceFlowMapStepDetailProps {
  nodeId: string
  steps: readonly FlowDetailStep[]
  workflowId?: string
  accessToken?: string
  onClose: () => void
}

interface ResolvedNode {
  title: string
  stepReference: string | null
  status?: string
}

function resolveNode(nodeId: string, steps: readonly FlowDetailStep[]): ResolvedNode {
  if (nodeId === 'start') {
    return { title: 'Start', stepReference: 'start' }
  }
  if (nodeId === 'end') {
    return { title: 'End', stepReference: null }
  }

  const stepIndex = flowNodeIdToStepIndex(nodeId)
  if (stepIndex === null) {
    return { title: 'Step', stepReference: null }
  }

  const step = steps.find(candidate => candidate.stepIndex === stepIndex)
  return {
    title: step ? `${step.stepIndex + 1}. ${step.title}` : `Step ${stepIndex + 1}`,
    stepReference: `step_${stepIndex}`,
    status: step?.status
  }
}

export const WorkforceFlowMapStepDetail: React.FC<WorkforceFlowMapStepDetailProps> = ({
  nodeId,
  steps,
  workflowId,
  accessToken,
  onClose
}) => {
  const resolved = resolveNode(nodeId, steps)
  const stepResult = useFlowStepResult({
    workflowId,
    stepReference: resolved.stepReference,
    accessToken,
    enabled: Boolean(resolved.stepReference && workflowId)
  })

  return (
    <div
      className="gba:pointer-events-auto gba:flex gba:h-full gba:w-80 gba:max-w-full gba:flex-col gba:overflow-hidden gba:rounded-lg gba:border gba:border-border/60 gba:bg-card gba:shadow-lg"
      data-testid="flow-map-step-detail"
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:border-b gba:border-border/60 gba:p-3">
        <div className="gba:min-w-0">
          <p className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">{resolved.title}</p>
          {resolved.status && (
            <div className="gba:mt-1">
              <StatusBadge code={resolved.status} testId="flow-map-step-detail-status" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="gba:inline-flex gba:h-7 gba:w-7 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:text-muted-foreground gba:transition-colors gba:hover:bg-muted gba:hover:text-foreground"
          aria-label="Close step details"
          data-testid="flow-map-step-detail-close"
        >
          <XIcon className="gba:h-4 gba:w-4" />
        </button>
      </div>
      <div className="gba:flex-1 gba:overflow-auto gba:p-3">
        {resolved.stepReference ? (
          <FlowStepResult {...stepResult} accessToken={accessToken} />
        ) : (
          <p className="gba:text-xs gba:text-muted-foreground" data-testid="flow-map-step-detail-empty">
            No step result is captured for this node.
          </p>
        )}
      </div>
    </div>
  )
}
