// Adapts the polled Custom Flow Engine detail (status + steps) into the
// FlowExecutionState the shared FlowViewer understands, so the workforce Flow
// Map can colour nodes and highlight the current step / taken path. Polls
// faster than the text views while the flow is still running.

import { useMemo } from 'react'

import { buildExecutionState } from '@/common/components/flow/flow-detail/utils'
import type { FlowExecutionState } from '@/common/components/flow/flow-viewer/types/viewerTypes'

import type { ActionCardStatus } from '../../../utils/actionCardTrace'
import type { FlowDetailOverview, FlowDetailStep } from './flowDetailTypes'
import { useFlowDetail } from './useFlowDetail'

// The live map should feel responsive, so poll more often than the 25s used by
// the list/timeline views (the engine has no push channel for flow progress).
const RUNNING_POLL_INTERVAL_MS = 8_000

export interface UseFlowExecutionStateOptions {
  workflowId: string | null | undefined
  accessToken: string | null | undefined
  initialStatus?: ActionCardStatus
  enabled?: boolean
  pollIntervalMs?: number
}

export interface FlowExecutionStateResult {
  overview: FlowDetailOverview | null
  status: ActionCardStatus
  executionState: FlowExecutionState
  isLoading: boolean
  error: string | null
}

const EMPTY_STATE: FlowExecutionState = { nodeStates: {} }

// `buildExecutionState` only reads `stepIndex` + `status`, but its `FlowStep`
// type also requires `id` / `title`; provide a minimal, stable shape.
function toExecutionSteps(steps: readonly FlowDetailStep[]): Array<{
  id: string
  title: string
  status: string
  stepIndex: number
}> {
  return steps.map(step => ({
    id: `step-${step.stepIndex}`,
    title: step.title,
    status: step.status,
    stepIndex: step.stepIndex
  }))
}

export function useFlowExecutionState({
  workflowId,
  accessToken,
  initialStatus,
  enabled = true,
  pollIntervalMs = RUNNING_POLL_INTERVAL_MS
}: UseFlowExecutionStateOptions): FlowExecutionStateResult {
  const detail = useFlowDetail({ workflowId, accessToken, initialStatus, enabled, pollIntervalMs })

  const executionState = useMemo<FlowExecutionState>(() => {
    const overview = detail.overview
    if (!overview) return EMPTY_STATE
    return buildExecutionState(toExecutionSteps(overview.steps), overview.status, overview.progress?.currentStep)
  }, [detail.overview])

  return {
    overview: detail.overview,
    status: detail.status,
    executionState,
    isLoading: detail.isLoading,
    error: detail.error
  }
}
