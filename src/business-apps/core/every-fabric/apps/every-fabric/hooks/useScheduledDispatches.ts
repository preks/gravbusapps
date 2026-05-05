import { useCallback, useEffect, useState } from 'react'
import type { DispatchStatus, ScheduledDispatch } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

interface UseScheduledDispatchesResult {
  dispatches: ScheduledDispatch[]
  isLoading: boolean
  error: string | null
  /** Reload dispatches from the API */
  refresh: () => void
  /** Cancel a pending dispatch by id. Returns true on success. */
  cancel: (dispatchId: string) => Promise<boolean>
  update: (
    dispatchId: string,
    body: {
      scheduledAt?: string
      timezone?: string
      recurrence?: Record<string, unknown> | null
      enabled?: boolean
      title?: string
      task?: string
    }
  ) => Promise<boolean>
  retry: (dispatchId: string) => Promise<boolean>
  /** Current status filter applied */
  statusFilter: DispatchStatus | 'all'
  setStatusFilter: (f: DispatchStatus | 'all') => void
}

export const useScheduledDispatches = (accessToken: string): UseScheduledDispatchesResult => {
  const client = usePromptManagerClient(accessToken)
  const [dispatches, setDispatches] = useState<ScheduledDispatch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<DispatchStatus | 'all'>('all')
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    const params =
      statusFilter === 'all' ? { includeAll: true, limit: 100 } : { status: statusFilter, includeAll: true, limit: 100 }

    client
      .getScheduledDispatches(params)
      .then(page => {
        if (!cancelled) {
          setDispatches(page.data)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load scheduled tasks.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [client, statusFilter, refreshKey])

  const cancel = useCallback(
    async (dispatchId: string): Promise<boolean> => {
      try {
        await client.cancelScheduledDispatch(dispatchId)
        refresh()
        return true
      } catch (err) {
        console.error('[useScheduledDispatches] cancel failed:', err)
        return false
      }
    },
    [client, refresh]
  )

  const update = useCallback(
    async (
      dispatchId: string,
      body: {
        scheduledAt?: string
        timezone?: string
        recurrence?: Record<string, unknown> | null
        enabled?: boolean
        title?: string
        task?: string
      }
    ): Promise<boolean> => {
      try {
        await client.updateScheduledDispatch(dispatchId, body)
        refresh()
        return true
      } catch (err) {
        console.error('[useScheduledDispatches] update failed:', err)
        return false
      }
    },
    [client, refresh]
  )

  const retry = useCallback(
    async (dispatchId: string): Promise<boolean> => {
      try {
        await client.retryScheduledDispatch(dispatchId)
        refresh()
        return true
      } catch (err) {
        console.error('[useScheduledDispatches] retry failed:', err)
        return false
      }
    },
    [client, refresh]
  )

  return { dispatches, isLoading, error, refresh, cancel, update, retry, statusFilter, setStatusFilter }
}
