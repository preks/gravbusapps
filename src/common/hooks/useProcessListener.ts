import { useEffect } from 'react'

interface ProcessStartEventDetail {
  domain: string
  processName: string
  startProcessBody: any
  processInstanceId?: string
  builderType?: 'NATIVE_SCREEN' | 'LOWCODER'
  skipScreen?: boolean
  targetDesktop?: string
  targetMobile?: string
}

/**
 * A central hook to listen for process start events.
 * This hook sets up a listener for the "com.newwork.process.start" custom event
 * and provides handling logic only on localhost.
 *
 * @returns void
 */
export const useProcessListener = (): void => {
  useEffect(() => {
    const handleProcessStartEvent = (event: CustomEvent<ProcessStartEventDetail>) => {
      const { domain, processName, startProcessBody, processInstanceId } = event.detail

      // Check if running on localhost
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

      if (isLocalhost) {
        // Local development handling
        const { builderType, skipScreen, targetDesktop, targetMobile } = event.detail
        const ideEvent = new CustomEvent('com.newwork.business.app.ide.localdev', {
          detail: {
            domain,
            processName,
            startProcessBody,
            processInstanceId,
            builderType,
            skipScreen,
            targetDesktop,
            targetMobile
          }
        })
        window.dispatchEvent(ideEvent)
      }
    }

    // Add event listener
    window.addEventListener('com.newwork.process.start', handleProcessStartEvent as EventListener)

    // Cleanup function
    return () => {
      window.removeEventListener('com.newwork.process.start', handleProcessStartEvent as EventListener)
    }
  }, [])
}
