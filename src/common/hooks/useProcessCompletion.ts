import { useEffect, useRef } from 'react'

interface UseProcessCompletionProps {
  onSuccess?: () => void
  onFailure?: () => void
}

/**
 * Custom hook to listen for Kogito process completion events
 * and trigger data refresh or other actions accordingly.
 *
 * The platform dispatches 'com.newwork.process.processCompletion' events
 * when processes complete, allowing components to react appropriately.
 *
 * This hook uses refs internally to store callbacks, ensuring that event listeners
 * are only registered once per component lifecycle, regardless of callback changes.
 * This provides optimal performance and prevents unnecessary event listener churn.
 *
 * @param onSuccess - Callback function to execute when process completes successfully
 * @param onFailure - Callback function to execute when process fails
 *
 * @example
 * ```typescript
 * const { refetch } = useEntityDataIntegration(context);
 *
 * // Callbacks do not need to be memoized - the hook handles this internally
 * useProcessCompletion({
 *   onSuccess: () => {
 *     console.log('Process completed, refreshing data');
 *     refetch();
 *   },
 *   onFailure: () => {
 *     console.log('Process failed');
 *   }
 * });
 * ```
 */
export const useProcessCompletion = ({ onSuccess, onFailure }: UseProcessCompletionProps) => {
  // Store callbacks in refs to avoid re-registering event listeners
  // This ensures the latest callback is always used without triggering effect cleanup
  const onSuccessRef = useRef(onSuccess)
  const onFailureRef = useRef(onFailure)

  // Update refs when callbacks change
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    onFailureRef.current = onFailure
  }, [onFailure])

  // Register event listener once per component lifecycle
  useEffect(() => {
    const handleProcessCompletion = (event: Event) => {
      // Some environments might dispatch without a detail payload or on parent/top windows
      const customEvent = event as CustomEvent<{ resolution?: 'success' | 'failure' } | undefined>
      const resolution = customEvent?.detail?.resolution

      if (resolution === 'failure') {
        if (onFailureRef.current) onFailureRef.current()
        return
      }

      // Default to success when resolution is missing or not explicitly failure
      if (onSuccessRef.current) onSuccessRef.current()
    }

    const eventName = 'com.newwork.process.processCompletion'

    // Always listen on current window
    window.addEventListener(eventName, handleProcessCompletion)

    // Also try to listen on parent/top if accessible (events may be dispatched there)
    const extraTargets: Array<Window | null | undefined> = []
    try {
      if (typeof window !== 'undefined') {
        if (window.parent && window.parent !== window) extraTargets.push(window.parent)
        if (window.top && window.top !== window && window.top !== window.parent) extraTargets.push(window.top)
      }
    } catch {
      // Ignore cross-origin access errors
    }

    extraTargets.forEach(t => {
      try {
        t?.addEventListener?.(eventName, handleProcessCompletion as EventListener)
      } catch {
        // ignore if not allowed
      }
    })

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener(eventName, handleProcessCompletion)
      extraTargets.forEach(t => {
        try {
          t?.removeEventListener?.(eventName, handleProcessCompletion as EventListener)
        } catch {
          // ignore
        }
      })
    }
  }, []) // Empty dependency array - listener registered once per component lifecycle
}
