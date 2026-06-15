// Lazily fetches the captured result/output of a single flow step from the
// Custom Flow Engine (`GET /flows/:id/steps/:ref/data`). Used on demand by the
// list view (row expansion) and the map view (node click) so step outputs are
// only fetched when a user actually opens them. Successful responses are cached
// module-wide because completed-step data is immutable.

import { useEffect, useRef, useState } from 'react'

import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowProgressClient } from '@/common/network/flows/useFlowProgressClient'
import type { StepDataResponse } from '@/common/network/flows/useFlowProgressClient'

const STEP_RESULT_PAGE_SIZE = 20

const resultCache = new Map<string, StepDataResponse>()

function cacheKey(workflowId: string, stepReference: string): string {
  return `${workflowId}:${stepReference}`
}

export interface UseFlowStepResultOptions {
  workflowId: string | null | undefined
  /** Canonical step reference, e.g. `start`, `step_0`, `step_1`. */
  stepReference: string | null | undefined
  accessToken: string | null | undefined
  /** Fetch only when the result is actually being shown. */
  enabled: boolean
}

export interface FlowStepResultState {
  data: StepDataResponse | null
  isLoading: boolean
  error: string | null
}

export function useFlowStepResult({
  workflowId,
  stepReference,
  accessToken,
  enabled
}: UseFlowStepResultOptions): FlowStepResultState {
  const contextForClient = { accessToken } as BusinessAppContextProps
  const { getStepDataByReference } = useFlowProgressClient(contextForClient)

  const [data, setData] = useState<StepDataResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!enabled || !workflowId || !stepReference || !accessToken) return

    const cached = resultCache.get(cacheKey(workflowId, stepReference))
    if (cached) {
      setData(cached)
      setError(null)
      setIsLoading(false)
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    let cancelled = false

    setIsLoading(true)
    setError(null)

    void (async () => {
      try {
        const response = await getStepDataByReference(workflowId, stepReference, { limit: STEP_RESULT_PAGE_SIZE })
        if (cancelled || requestIdRef.current !== requestId) return
        resultCache.set(cacheKey(workflowId, stepReference), response)
        setData(response)
      } catch (err) {
        if (cancelled || requestIdRef.current !== requestId) return
        setError(err instanceof Error ? err.message : 'Failed to load step results')
      } finally {
        if (!cancelled && requestIdRef.current === requestId) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, workflowId, stepReference, accessToken, getStepDataByReference])

  return { data, isLoading, error }
}

/** Clear cached step results (test helper / manual refresh). */
export function clearFlowStepResultCache(): void {
  resultCache.clear()
}
