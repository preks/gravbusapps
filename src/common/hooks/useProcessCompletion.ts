import { useEffect } from 'react'

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
 * @param onSuccess - Callback function to execute when process completes successfully
 * @param onFailure - Callback function to execute when process fails
 *
 * @example
 * ```typescript
 * const { refetch } = useEntityDataIntegration(context);
 *
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
  useEffect(() => {
    const handleProcessCompletion = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>
      const resolution = customEvent.detail.resolution

      if (resolution === 'success' && onSuccess) {
        onSuccess()
      } else if (resolution === 'failure' && onFailure) {
        onFailure()
      }
    }

    // Add event listener for process completion
    window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion)

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
    }
  }, [onSuccess, onFailure])
}
