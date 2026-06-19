// Full-screen, URL-driven run detail (replaces the slide-over drawer).
//
// Driven entirely by a `runId` (a deep-agent session id): it loads the run via
// the prompt-manager client, polls until the run reaches a terminal state, and
// subscribes to the shared SSE registry for a live trace while it runs. The
// header surfaces the run's identity + context; the body renders the task,
// output, artifacts, policies, touched records, trace, audit, and cost.

import { ArrowLeftIcon, CircleNotchIcon, WarningIcon } from '@phosphor-icons/react'
import React, { useCallback, useEffect, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { isTerminalRunStatus } from '../useWorkforceRuns'
import { useWorkforceRunStream } from '../useWorkforceRunStream'
import type { WorkforceRun } from '../workforceTypes'
import { RunDetailBody } from './RunDetailBody'
import { RunDetailHeader } from './RunDetailHeader'
import { resolveAgentName } from './runDetailFacts'

export interface RunDetailScreenProps {
  runId: string
  accessToken: string
  nameById: Record<string, string>
  onBack: () => void
}

const RUN_DETAIL_POLL_INTERVAL_MS = 2000

export const RunDetailScreen: React.FC<RunDetailScreenProps> = ({ runId, accessToken, nameById, onBack }) => {
  const client = usePromptManagerClient(accessToken)
  const [run, setRun] = useState<WorkforceRun | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Live trace via the shared SSE registry; merged with the authoritative REST
  // trace and stopped automatically once the run is terminal.
  const { trace, isStreaming, isConnected } = useWorkforceRunStream(run, accessToken)

  // A terminal run can still be blocking a human on a flow-engine APPROVAL step.
  // The backend stamps `pending_flow_approval` on the run payload, so the header
  // reads "Awaiting approval" on first render (no Completed -> Awaiting flash).
  const awaitingFlowApproval = Boolean(run?.pending_flow_approval)

  // Immediate refresh after a human approval (e.g. sending an email draft) so
  // the operator sees the resolved state without waiting for the next poll.
  const refreshRun = useCallback(async () => {
    const fresh = await client.getWorkforceRun(runId)
    setRun(fresh)
    setError(null)
  }, [client, runId])

  // Fetch on mount / run change, then poll until terminal. Keyed on runId only
  // so a parent re-render does not restart the loop.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    setRun(null)
    setIsLoading(true)
    setError(null)

    const load = (): void => {
      if (cancelled) return
      client
        .getWorkforceRun(runId)
        .then(fresh => {
          if (cancelled) return
          setRun(fresh)
          setError(null)
          if (!isTerminalRunStatus(fresh.status)) {
            timer = setTimeout(load, RUN_DETAIL_POLL_INTERVAL_MS)
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load run detail.')
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
    }

    load()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [client, runId])

  if (!run) {
    return (
      <div
        className="gba:flex gba:h-full gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:bg-background"
        data-testid="run-detail-screen"
      >
        {isLoading ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
            <CircleNotchIcon className="gba:h-4 gba:w-4 gba:animate-spin" />
            Loading run…
          </div>
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:text-center">
            <WarningIcon className="gba:h-6 gba:w-6 gba:text-destructive" />
            <p className="gba:text-sm gba:text-foreground">{error ?? 'Run not found.'}</p>
            <button
              type="button"
              onClick={onBack}
              className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:bg-muted gba:px-3 gba:py-1.5 gba:text-xs gba:font-medium gba:text-foreground gba:hover:bg-muted/70"
              data-testid="run-detail-back"
            >
              <ArrowLeftIcon className="gba:h-3.5 gba:w-3.5" />
              Back
            </button>
          </div>
        )}
      </div>
    )
  }

  const effectiveTrace = trace.length > 0 ? trace : (run.trace ?? [])

  return (
    <div
      className="gba:flex gba:h-full gba:flex-col gba:overflow-hidden gba:bg-background"
      data-testid="run-detail-screen"
    >
      <RunDetailHeader
        run={run}
        agentName={resolveAgentName(run, nameById)}
        accessToken={accessToken}
        trace={effectiveTrace}
        isStreaming={isStreaming}
        isConnected={isConnected}
        isRefreshing={isLoading}
        awaitingFlowApproval={awaitingFlowApproval}
        onBack={onBack}
      />
      <RunDetailBody
        run={run}
        accessToken={accessToken}
        trace={effectiveTrace}
        errorMessage={error}
        onRefreshRun={refreshRun}
      />
    </div>
  )
}
