import { useCallback, useRef, useState } from 'react'

/**
 * Prevents duplicate quick-add submissions before AppActionProvider sets isProcessing.
 */
export function useQuickAddSubmitGuard() {
  const lockRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const runGuarded = useCallback(async (task: () => Promise<void>) => {
    if (lockRef.current) {
      return
    }
    lockRef.current = true
    setIsSubmitting(true)
    try {
      await task()
    } finally {
      lockRef.current = false
      setIsSubmitting(false)
    }
  }, [])

  return { isSubmitting, runGuarded }
}
