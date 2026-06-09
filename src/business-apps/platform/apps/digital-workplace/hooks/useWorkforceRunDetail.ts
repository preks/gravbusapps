import { useCallback, useEffect, useRef, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { isTerminalRunStatus } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/useWorkforceRuns'
import type { WorkforceRun } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'

const POLL_INTERVAL_MS = 2500

/**
 * Loads a single Workforce run by session id and keeps polling while it is
 * non-terminal (e.g. waiting_for_human), so an inline HITL dialog reflects the
 * latest pending prompt and reacts after the user responds. Only active while
 * `enabled` is true (dialog open).
 */
export function useWorkforceRunDetail(accessToken: string | undefined, sessionId: string | null, enabled: boolean) {
  const client = usePromptManagerClient(accessToken)
  const [run, setRun] = useState<WorkforceRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!sessionId || !accessToken) return
    try {
      const fresh = await client.getWorkforceRun(sessionId)
      setRun(fresh)
      setError(null)
      return fresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load run.')
      return undefined
    }
  }, [client, sessionId, accessToken])

  useEffect(() => {
    if (!enabled || !sessionId || !accessToken) {
      setRun(null)
      setError(null)
      clearTimer()
      return
    }

    let cancelled = false
    setLoading(true)
    setRun(null)

    const load = () => {
      client
        .getWorkforceRun(sessionId)
        .then(fresh => {
          if (cancelled) return
          setRun(fresh)
          setError(null)
          if (!isTerminalRunStatus(fresh.status)) {
            timerRef.current = setTimeout(load, POLL_INTERVAL_MS)
          }
        })
        .catch(err => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load run.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()

    return () => {
      cancelled = true
      clearTimer()
    }
  }, [client, sessionId, accessToken, enabled, clearTimer])

  return { run, loading, error, refresh }
}
