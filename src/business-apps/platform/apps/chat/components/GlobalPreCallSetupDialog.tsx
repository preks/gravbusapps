/**
 * GlobalPreCallSetupDialog - Singleton dialog component for pre-call setup
 *
 * This component renders the PreCallSetupDialog once globally, using state
 * from the globalPreCallSetupManager. Only one instance (the UI owner) will
 * actually render the dialog, preventing duplicates when multiple Chat instances exist.
 */

import React, { useState, useEffect } from 'react'
import { globalPreCallSetupManager } from '../services/globalPreCallSetupManager'
import { PreCallSetupDialog } from './PreCallSetupDialog'

export const GlobalPreCallSetupDialog: React.FC = () => {
  // Generate unique instance ID
  const [instanceId] = useState(() => `pre-call-setup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const [isUiOwner, setIsUiOwner] = useState(false)
  const [dialogState, setDialogState] = useState(globalPreCallSetupManager.getState())
  const [callbacks, setCallbacks] = useState(globalPreCallSetupManager.getCallbacks())

  // Effect to claim/release UI ownership
  useEffect(() => {
    const checkOwnership = () => {
      const currentOwner = globalPreCallSetupManager.getUiOwnerId()
      const isDialogOpen = globalPreCallSetupManager.isDialogOpen()

      if (isDialogOpen && currentOwner === null) {
        // No owner and dialog should be open, claim it
        if (globalPreCallSetupManager.claimUiOwner(instanceId)) {
          setIsUiOwner(true)
        }
      } else if (currentOwner === instanceId) {
        // We are the owner
        setIsUiOwner(true)
      } else if (currentOwner !== null && currentOwner !== instanceId && !isDialogOpen) {
        // Another instance is owner but dialog is closed, try to claim
        setIsUiOwner(false)
      } else {
        // Another instance is owner or no dialog to show
        setIsUiOwner(false)
      }
    }

    // Initial check
    checkOwnership()

    // Subscribe to manager changes to react to ownership changes
    const unsubscribe = globalPreCallSetupManager.subscribe(() => {
      checkOwnership()
      // Also update state and callbacks when global state changes
      setDialogState(globalPreCallSetupManager.getState())
      setCallbacks(globalPreCallSetupManager.getCallbacks())
    })

    return () => {
      globalPreCallSetupManager.releaseUiOwner(instanceId)
      unsubscribe()
    }
  }, [instanceId])

  // Only render if this instance is the UI owner
  if (!isUiOwner) {
    return null
  }

  return (
    <PreCallSetupDialog
      isOpen={dialogState.isOpen}
      callType={dialogState.callType}
      conversationName={dialogState.conversationName}
      participantCount={dialogState.participantCount}
      userName={dialogState.userName}
      userAvatarUrl={dialogState.userAvatarUrl}
      conversationType={dialogState.conversationType}
      onStart={preferences => {
        if (callbacks.onStart) {
          callbacks.onStart(preferences)
        }
      }}
      onCancel={() => {
        if (callbacks.onCancel) {
          callbacks.onCancel()
        }
      }}
      prefixDataTestId="global-pre-call-setup"
    />
  )
}
