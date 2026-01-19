import { useEffect, useRef } from 'react'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

/**
 * Custom hook to manage the disabled state of footer buttons after dispatchProcessContinueEvent
 * This prevents multiple submissions or actions after a process event has been dispatched
 *
 * @param additionalData - Optional additional data that, when changed, resets the disabled state
 * @returns Object containing dispatchProcessContinueEventIfEnabled function
 */
export const useProcessEventState = (additionalData?: any) => {
  const isProcessEventDispatchedRef = useRef(false)
  const previousAdditionalDataRef = useRef(additionalData)

  useEffect(() => {
    const handleProcessContinue = () => {
      isProcessEventDispatchedRef.current = true
    }

    // Listen for the process continue event
    window.addEventListener('com.newwork.process.continue', handleProcessContinue)

    return () => {
      window.removeEventListener('com.newwork.process.continue', handleProcessContinue)
    }
  }, [])

  // Reset the state when additionalData actually changes (acts as a refresh)
  useEffect(() => {
    if (additionalData !== undefined && additionalData !== previousAdditionalDataRef.current) {
      isProcessEventDispatchedRef.current = false
      previousAdditionalDataRef.current = additionalData
    }
  }, [additionalData])

  /**
   * Dispatches a process continue event only if the form is not currently disabled
   * @param event - The event identifier
   * @param payload - The payload data to include with the event
   * @returns boolean - true if event was dispatched, false if disabled
   */
  const dispatchProcessContinueEventIfEnabled = (event: string, payload: any): boolean => {
    if (isProcessEventDispatchedRef.current) {
      return false
    }

    isProcessEventDispatchedRef.current = true
    dispatchProcessContinueEvent(event, payload)
    return true
  }

  /**
   * Returns the current state of isProcessEventDispatched
   * @returns boolean - true if process event is currently dispatched, false otherwise
   */
  const getIsProcessEventDispatched = (): boolean => {
    return isProcessEventDispatchedRef.current
  }

  return {
    dispatchProcessContinueEventIfEnabled,
    getIsProcessEventDispatched
  }
}
