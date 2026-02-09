/**
 * GlobalCallContainer - Persistent call UI mounted at application root
 *
 * This component:
 * - Lives at the BusinessAppIDE root level
 * - Survives all navigation within the platform
 * - Renders RealtimeKit group calls in full or minimized mode
 * - Maintains call state through globalCallManager
 *
 * The call UI will persist regardless of which business app is active.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { globalCallManager } from '../services/globalCallManager'
import { GroupCallModalRtk } from './GroupCallModalRtk'
import { RealtimeKitProvider } from '@cloudflare/realtimekit-react'
import { TranslationProvider } from '../contexts/TranslationContext'
import { navigateTo } from '@/common/utils/navigationUtils'

export const GlobalCallContainer: React.FC = () => {
  const [instanceId] = useState(() => `global-call-container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const [callData, setCallData] = useState(() => ({ ...globalCallManager.getCallData() }))
  const [uiOwnerId, setUiOwnerId] = useState<string | null>(() => globalCallManager.getUiOwnerId())

  // Subscribe to global call manager changes
  useEffect(() => {
    const unsubscribe = globalCallManager.subscribe(() => {
      const data = globalCallManager.getCallData()
      // IMPORTANT: always create a new reference so React re-renders even when the manager mutates in place
      setCallData({ ...data })
      setUiOwnerId(globalCallManager.getUiOwnerId())
    })
    return unsubscribe
  }, [])

  const isEligibleRealtimeKitCall = useMemo(() => {
    return (
      callData.callState.status !== 'idle' &&
      !!callData.realtimeKitMeeting &&
      callData.callState.callImplementation === 'realtime-kit'
    )
  }, [callData.callState.callImplementation, callData.callState.status, callData.realtimeKitMeeting])

  // Claim/release UI ownership based on whether this instance can render the RTK call UI.
  // This prevents duplicate modals/minimized widgets when the chat module is mounted multiple times.
  useEffect(() => {
    const currentOwner = globalCallManager.getUiOwnerId()

    if (isEligibleRealtimeKitCall) {
      // Retry claim when owner becomes null (e.g. owner instance unmounted during navigation)
      if (!currentOwner) {
        globalCallManager.claimUiOwner(instanceId)
      }
      // Sync local state (claim may have been rejected if another instance already owns it)
      setUiOwnerId(globalCallManager.getUiOwnerId())
      return () => {
        globalCallManager.releaseUiOwner(instanceId)
      }
    }

    // Not eligible → release if we were owner
    globalCallManager.releaseUiOwner(instanceId)
    setUiOwnerId(globalCallManager.getUiOwnerId())
    return () => {
      globalCallManager.releaseUiOwner(instanceId)
    }
  }, [instanceId, isEligibleRealtimeKitCall, uiOwnerId])

  // Enhanced toggle minimize handler - navigates to chat when maximizing
  const handleToggleMinimize = useCallback(() => {
    // CRITICAL: Get LATEST callData inside the function, not from closure
    // This ensures we have the most up-to-date callbacks after component remounts
    const latestCallData = globalCallManager.getCallData()
    const isCurrentlyMinimized = latestCallData.callState.isMinimized

    // If maximizing from another page, update globalCallManager FIRST before navigating
    // This ensures the component remounts with the correct maximized state
    if (isCurrentlyMinimized) {
      const isProduction = process.env.NODE_ENV === 'production'
      const isAlreadyOnChatPage = isProduction
        ? window.location.pathname.startsWith('/platform/chat')
        : new URLSearchParams(window.location.search).get('app') === 'platform/apps/chat'

      if (!isAlreadyOnChatPage) {
        // Update globalCallManager state BEFORE navigation
        globalCallManager.updateCallState({ isMinimized: false, hasBeenMinimized: true })

        // Then navigate - component will remount with correct maximized state
        navigateTo('/platform/chat')
        return
      }
    }

    // Always use the hook's callback if available for proper state sync
    if (latestCallData.toggleMinimize) {
      const before = globalCallManager.getCallData().callState.isMinimized
      latestCallData.toggleMinimize()
      const after = globalCallManager.getCallData().callState.isMinimized

      // If the callback was stale/no-op (possible with multiple mounted hook instances),
      // fall back to a direct state update so maximize/minimize still works.
      if (after === before) {
        console.warn('[GlobalCallContainer] toggleMinimize callback did not change state; using fallback update')
        globalCallManager.updateCallState({ isMinimized: !before, hasBeenMinimized: true })
      }
      return
    }

    // Fallback: Hook not available (chat component unmounted)
    if (isCurrentlyMinimized) {
      // Maximizing - navigate to chat first, then update state
      const isProduction = process.env.NODE_ENV === 'production'
      const isAlreadyOnChatPage = isProduction
        ? window.location.pathname.startsWith('/platform/chat')
        : new URLSearchParams(window.location.search).get('app') === 'platform/apps/chat'

      if (!isAlreadyOnChatPage) {
        // Navigate to chat - this will mount the component and register callbacks
        navigateTo('/platform/chat')

        // Wait for chat to mount and check if callback is now available
        setTimeout(() => {
          const updatedCallData = globalCallManager.getCallData()
          if (updatedCallData.toggleMinimize) {
            updatedCallData.toggleMinimize()
          } else {
            globalCallManager.updateCallState({ isMinimized: false, hasBeenMinimized: true })
          }
        }, 150)
      } else {
        // Already on chat page, just update state
        globalCallManager.updateCallState({ isMinimized: false, hasBeenMinimized: true })
      }
    } else {
      // Minimizing - just update state
      globalCallManager.updateCallState({ isMinimized: true, hasBeenMinimized: true })
    }
  }, []) // Empty deps - always get fresh data from globalCallManager

  // Only render if we have an eligible RTK call
  if (!isEligibleRealtimeKitCall) {
    return null
  }

  // UI ownership gating:
  // - if there is no owner yet, render nothing briefly (effects will claim)
  // - if another instance owns it, render nothing
  const currentOwnerId = uiOwnerId
  if (!currentOwnerId || currentOwnerId !== instanceId) {
    return null
  }

  // Hide reactions and raise hand for direct calls only
  // Show for group calls and meetings
  const conversationType = callData.callState.conversationType
  const hideReactionsAndHandRaise = conversationType === 'direct'

  return (
    <TranslationProvider>
      <RealtimeKitProvider value={callData.realtimeKitMeeting}>
        <GroupCallModalRtk
          viewMode={callData.callState.isMinimized ? 'minimized' : 'full'}
          callState={callData.callState}
          localStream={callData.localStream}
          remoteStreams={callData.remoteStreams}
          participants={callData.participants}
          activeSpeakerId={callData.activeSpeakerId}
          activeSpeakerHistory={callData.activeSpeakerHistory}
          onEndCall={callData.leaveCall || (() => {})}
          onToggleMute={callData.toggleMute || (() => {})}
          onToggleVideo={callData.toggleVideo || (() => {})}
          onToggleScreenShare={callData.toggleScreenShare || (() => {})}
          onToggleMinimize={handleToggleMinimize} // Use enhanced handler
          onToggleBackground={callData.toggleBackground || (() => {})}
          onToggleRaiseHand={callData.toggleRaiseHand || (() => {})}
          onSendReaction={callData.sendReaction || (() => {})}
          onSetVideoQuality={callData.setVideoQuality || (() => {})}
          apiClient={callData.apiClient}
          wsClient={callData.wsClient}
          accessToken={callData.accessToken || undefined}
          currentUserId={callData.currentUserId}
          currentUser={callData.currentUser}
          conversationName={callData.conversationName || undefined}
          callConversation={callData.callConversation || undefined}
          activeConversation={callData.activeConversation || undefined}
          pendingInvites={callData.pendingInvites || new Map()}
          availableParticipants={callData.availableParticipants || []}
          onInviteParticipant={callData.onInviteParticipant || undefined}
          activeExperts={callData.activeExperts || []}
          hideReactionsAndHandRaise={hideReactionsAndHandRaise}
          prefixDataTestId="global-call"
        />
      </RealtimeKitProvider>
    </TranslationProvider>
  )
}
