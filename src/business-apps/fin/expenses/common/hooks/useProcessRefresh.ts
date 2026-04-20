import { useEffect, useRef } from 'react'
import { PROCESS_COMPLETION_EVENT_NAMES } from '@/business-apps/fin/expenses/common/constants/processCompletionEventNames'

/**
 * Listens for process/task completion and invokes `onRefresh` when resolution is success.
 * Subscribes to {@link PROCESS_COMPLETION_EVENT_NAMES} and intercepts `dispatchEvent` for
 * types containing "process" or "task" (same behavior as legacy personal-expenses tabs).
 */
export function useProcessRefresh(onRefresh: () => void): void {
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    const handleProcessCompletion = (event: Event) => {
      try {
        const custom = event as CustomEvent<{ resolution?: string }>
        if (custom.detail?.resolution !== 'success') return
        onRefreshRef.current()
      } catch (err) {
        console.error('Error handling process completion:', err)
      }
    }

    const handleAllEvents = (event: Event) => {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        handleProcessCompletion(event)
      }
    }

    PROCESS_COMPLETION_EVENT_NAMES.forEach(eventName => {
      globalThis.addEventListener(eventName, handleProcessCompletion as EventListener)
    })

    const originalDispatchEvent = window.dispatchEvent
    window.dispatchEvent = function dispatchEventPatched(event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        handleAllEvents(event)
      }
      return originalDispatchEvent.call(this, event)
    }

    return () => {
      PROCESS_COMPLETION_EVENT_NAMES.forEach(eventName => {
        globalThis.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })
      window.dispatchEvent = originalDispatchEvent
    }
  }, [])
}
