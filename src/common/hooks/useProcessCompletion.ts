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
      const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>
      const resolution = customEvent.detail.resolution

      if (resolution === 'success' && onSuccessRef.current) {
        onSuccessRef.current()
      } else if (resolution === 'failure' && onFailureRef.current) {
        onFailureRef.current()
      }
    }

    // Add event listener for process completion
    window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion)

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
    }
  }, []) // Empty dependency array - listener registered once per component lifecycle
}
