import React, { useEffect } from 'react'
import { useProcessListener } from '../../hooks/useProcessListener'

export interface ProcessLocalDevEvent {
  domain: string
  processName: string
  startProcessBody: any
  processInstanceId?: string
  builderType?: 'NATIVE_SCREEN' | 'LOWCODER'
  skipScreen?: boolean
}

interface ProcessEventListenerProps {
  onLocalDevEvent?: (event: ProcessLocalDevEvent) => void
}

/**
 * Component that sets up global event listeners for process-related events.
 * This component doesn't render anything visible but provides event handling functionality.
 * It should be placed high in the component tree to ensure it's always active.
 */
export const ProcessEventListener: React.FC<ProcessEventListenerProps> = ({ onLocalDevEvent }) => {
  // Use the process listener hook to set up event handling
  useProcessListener()

  // Set up listener for local development events
  useEffect(() => {
    const handleLocalDevEvent = (event: CustomEvent<ProcessLocalDevEvent>) => {
      if (onLocalDevEvent) {
        onLocalDevEvent(event.detail)
      }
    }

    // Add event listener
    window.addEventListener('com.newwork.business.app.ide.localdev', handleLocalDevEvent as EventListener)

    // Cleanup function
    return () => {
      window.removeEventListener('com.newwork.business.app.ide.localdev', handleLocalDevEvent as EventListener)
    }
  }, [onLocalDevEvent])

  // This component doesn't render anything
  return null
}

export default ProcessEventListener
