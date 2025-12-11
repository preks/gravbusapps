import { useEffect, useRef } from 'react'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

/**
 * Hook to handle automatic task cancellation when a form closes without submission.
 *
 * Prevents unfinished tasks from polluting the system by dispatching an abort event
 * when the component unmounts, unless the form was explicitly submitted or cancelled.
 *
 * @param cancelEventType - The event type to dispatch on cleanup (default: 'pse_abort')
 * @returns Object with methods to mark form as submitted or cancelled
 *
 * @example
 * ```tsx
 * const { markAsSubmitted, markAsCancelled } = useTaskCancellation()
 *
 * // In submit handler:
 * onSubmit={async (values) => {
 *   markAsSubmitted()
 *   // ... submit logic
 * }}
 *
 * // In cancel handler:
 * onCancel={() => {
 *   markAsCancelled()
 * }}
 * ```
 */
export const useTaskCancellation = (cancelEventType: string = 'pse_abort') => {
  const wasSubmittedRef = useRef(false)
  const wasCancelledRef = useRef(false)

  // Cleanup effect: dispatch abort event if form closes without submission or cancellation
  useEffect(() => {
    return () => {
      // Only dispatch abort if form was never submitted AND never explicitly cancelled
      if (!wasSubmittedRef.current && !wasCancelledRef.current) {
        dispatchProcessContinueEvent(cancelEventType, {})
      }
    }
  }, [cancelEventType])

  return {
    /**
     * Mark the form as submitted to prevent abort event on unmount
     */
    markAsSubmitted: () => {
      wasSubmittedRef.current = true
    },
    /**
     * Mark the form as cancelled to prevent duplicate abort events
     */
    markAsCancelled: () => {
      wasCancelledRef.current = true
    }
  }
}
