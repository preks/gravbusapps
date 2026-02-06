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

import React, { useEffect, useState, useCallback } from 'react'
import { globalCallManager } from '../services/globalCallManager'
import { GroupCallModalRtk } from './GroupCallModalRtk'
import { RealtimeKitProvider } from '@cloudflare/realtimekit-react'
import { TranslationProvider } from '../contexts/TranslationContext'
import { navigateTo } from '@/common/utils/navigationUtils'

export const GlobalCallContainer: React.FC = () => {
  const [callData, setCallData] = useState(globalCallManager.getCallData())

  // Subscribe to global call manager changes
  useEffect(() => {
    const unsubscribe = globalCallManager.subscribe(() => {
      const data = globalCallManager.getCallData()
      setCallData(data)
    })
    return unsubscribe
  }, [])

  // Enhanced toggle minimize handler - navigates to chat when maximizing
  const handleToggleMinimize = useCallback(() => {
    const isCurrentlyMinimized = callData.callState.isMinimized

    if (isCurrentlyMinimized) {
      // User clicked expand button on minimized widget
      // Check if we're already on the chat page to avoid unnecessary navigation
      const isProduction = process.env.NODE_ENV === 'production'
      const isAlreadyOnChatPage = isProduction
        ? window.location.pathname.startsWith('/platform/chat')
        : new URLSearchParams(window.location.search).get('app') === 'platform/apps/chat'

      if (isAlreadyOnChatPage) {
        // Already on chat page, maximize without navigating
        globalCallManager.updateCallState({ isMinimized: false, hasBeenMinimized: true })
        // Best-effort: keep any still-mounted hook state in sync
        callData.toggleMinimize?.()
      } else {
        // Navigate to chat to show full conversation context
        navigateTo('/platform/chat')

        // Small delay to let navigation happen, then expand
        setTimeout(() => {
          globalCallManager.updateCallState({ isMinimized: false, hasBeenMinimized: true })
          // Best-effort: keep any still-mounted hook state in sync
          callData.toggleMinimize?.()
        }, 100)
      }
    } else {
      // Just minimize normally
      globalCallManager.updateCallState({ isMinimized: true, hasBeenMinimized: true })
      // Best-effort: keep any still-mounted hook state in sync
      callData.toggleMinimize?.()
    }
  }, [callData])

  // Only render if:
  // 1. There's an active call (not idle)
  // 2. We have a RealtimeKit meeting object
  // 3. The call is using RealtimeKit implementation
  if (
    callData.callState.status === 'idle' ||
    !callData.realtimeKitMeeting ||
    callData.callState.callImplementation !== 'realtime-kit'
  ) {
    return null
  }

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
          pendingInvites={callData.pendingInvites || new Map()}
          availableParticipants={callData.availableParticipants || []}
          onInviteParticipant={callData.onInviteParticipant || undefined}
          activeExperts={callData.activeExperts || []}
          prefixDataTestId="global-call"
        />
      </RealtimeKitProvider>
    </TranslationProvider>
  )
}
