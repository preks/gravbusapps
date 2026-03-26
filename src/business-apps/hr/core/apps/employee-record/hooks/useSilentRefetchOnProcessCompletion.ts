import { useEffect } from 'react'

const PROCESS_COMPLETION_EVENT = 'com.newwork.process.processCompletion' as const
const FOLLOW_UP_REFETCH_DELAY_MS = 1200

/**
 * After a successful process completion event, refetches employee-related data without a full-page spinner,
 * then once more after a short delay for eventual consistency.
 */
export function useSilentRefetchOnProcessCompletion(silentRefetch: () => void): void {
  useEffect(() => {
    const pendingRefetchTimers = new Set<number>()

    const handleProcessCompletion = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>
      const resolution = customEvent.detail.resolution
      if (resolution === 'success') {
        silentRefetch()
        const followUpRefetchTimer = globalThis.setTimeout(() => {
          pendingRefetchTimers.delete(followUpRefetchTimer)
          silentRefetch()
        }, FOLLOW_UP_REFETCH_DELAY_MS)
        pendingRefetchTimers.add(followUpRefetchTimer)
      }
    }

    globalThis.addEventListener(PROCESS_COMPLETION_EVENT, handleProcessCompletion)

    return () => {
      pendingRefetchTimers.forEach(timerId => globalThis.clearTimeout(timerId))
      globalThis.removeEventListener(PROCESS_COMPLETION_EVENT, handleProcessCompletion)
    }
  }, [silentRefetch])
}
