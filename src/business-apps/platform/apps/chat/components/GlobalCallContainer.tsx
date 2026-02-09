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

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { globalCallManager } from '../services/globalCallManager'
import { GroupCallModalRtk } from './GroupCallModalRtk'
import { RealtimeKitProvider } from '@cloudflare/realtimekit-react'
import { TranslationProvider } from '../contexts/TranslationContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { RTKVirtualBackground } from '../services/rtkVirtualBackground'

export const GlobalCallContainer: React.FC = () => {
  const [instanceId] = useState(() => `global-call-container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const [callData, setCallData] = useState(() => ({ ...globalCallManager.getCallData() }))
  const [uiOwnerId, setUiOwnerId] = useState<string | null>(() => globalCallManager.getUiOwnerId())
  const virtualBackgroundRef = useRef<RTKVirtualBackground | null>(null)

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

  // End call handler with fallback cleanup.
  // After navigation, stored callbacks can become stale/no-op; this ensures UI doesn't get stuck.
  const handleEndCall = useCallback(() => {
    const latest = globalCallManager.getCallData()

    // Prefer hook callback if available
    if (latest.leaveCall) {
      latest.leaveCall()

      // Fallback: if the callback didn't clear the call UI (stale closure), force cleanup.
      setTimeout(async () => {
        const after = globalCallManager.getCallData()
        if (after.callState.status === 'idle') return

        console.warn('[GlobalCallContainer] leaveCall callback did not clear call; running fallback cleanup')

        try {
          await after.realtimeKitMeeting?.self?.disableScreenShare?.()
        } catch {
          // Best-effort
        }
        try {
          await after.realtimeKitMeeting?.leave?.()
        } catch {
          // Best-effort
        }
        try {
          after.localStream?.getTracks?.().forEach((t: MediaStreamTrack) => t.stop())
        } catch {
          // Best-effort
        }

        // Best-effort backend notify (optional): emit left so backend can clean up participant state.
        try {
          const wsClient = after.wsClient
          let socket = wsClient?.getSocket?.()
          const token = after.accessToken
          if (!socket && wsClient && token) {
            wsClient.connect(token)
            socket = wsClient.getSocket()
          }

          const conversationId = after.callState.roomId
          const meetingId = after.callState.meetingId
          const participantId = after.currentUserId

          if (socket && conversationId && meetingId && participantId) {
            socket.emit('rtk-group-call:left', { conversationId, meetingId, participantId })
          }
        } catch {
          // Best-effort
        }

        globalCallManager.clearCall()
      }, 350)

      return
    }

    // No callback at all - at least close UI
    globalCallManager.clearCall()
  }, [])

  // Raise-hand wrapper to avoid stuck UI if callback becomes stale after navigation.
  const handleToggleRaiseHand = useCallback(() => {
    const latest = globalCallManager.getCallData()
    const before = latest.callState.handRaised

    if (latest.toggleRaiseHand) {
      latest.toggleRaiseHand()

      // If callback is stale and doesn't actually change state (e.g. stale closure always emits "lower"),
      // fall back to direct socket emit based on latest global state.
      setTimeout(() => {
        const afterData = globalCallManager.getCallData()
        const after = afterData.callState.handRaised
        if (after !== before) return

        console.warn('[GlobalCallContainer] toggleRaiseHand callback did not change state; using socket fallback')

        const wsClient = afterData.wsClient
        let socket = wsClient?.getSocket?.()
        const token = afterData.accessToken
        if (!socket && wsClient && token) {
          wsClient.connect(token)
          socket = wsClient.getSocket()
        }

        const meetingId = afterData.callState.meetingId
        const participantId = afterData.currentUserId
        if (!socket || !meetingId || !participantId) return

        const nextHandRaised = !before
        socket.emit('group-call:raise-hand', {
          roomId: meetingId,
          participantId,
          handRaised: nextHandRaised,
          timestamp: Date.now()
        })

        globalCallManager.updateCallState({ handRaised: nextHandRaised })
      }, 200)

      return
    }

    // Fallback: emit directly
    const wsClient = latest.wsClient
    let socket = wsClient?.getSocket?.()
    const token = latest.accessToken
    if (!socket && wsClient && token) {
      wsClient.connect(token)
      socket = wsClient.getSocket()
    }

    const meetingId = latest.callState.meetingId
    const participantId = latest.currentUserId
    if (!socket || !meetingId || !participantId) return

    const nextHandRaised = !latest.callState.handRaised
    socket.emit('group-call:raise-hand', {
      roomId: meetingId,
      participantId,
      handRaised: nextHandRaised,
      timestamp: Date.now()
    })

    // Optimistic UI update
    globalCallManager.updateCallState({ handRaised: nextHandRaised })
  }, [])

  // Reaction wrapper (send) with socket fallback.
  const handleSendReaction = useCallback((emoji: string) => {
    const latest = globalCallManager.getCallData()
    if (latest.sendReaction) {
      latest.sendReaction(emoji)
      return
    }

    const wsClient = latest.wsClient
    let socket = wsClient?.getSocket?.()
    const token = latest.accessToken
    if (!socket && wsClient && token) {
      wsClient.connect(token)
      socket = wsClient.getSocket()
    }

    const meetingId = latest.callState.meetingId
    const participantId = latest.currentUserId
    const participantName = latest.currentUser?.odName || (latest.currentUser as any)?.username || 'User'
    if (!socket || !meetingId || !participantId) return

    socket.emit('group-call:send-reaction', {
      roomId: meetingId,
      participantId,
      participantName,
      emoji
    })
  }, [])

  // Screen share wrapper with SDK fallback.
  const handleToggleScreenShare = useCallback(() => {
    const latest = globalCallManager.getCallData()
    const sdkSelf = latest.realtimeKitMeeting?.self
    const sdkBefore = sdkSelf?.screenShareEnabled === true
    const before = sdkBefore || latest.callState.isScreenSharing

    if (latest.toggleScreenShare) {
      latest.toggleScreenShare()
      // If callback is stale/no-op, fall back to SDK directly.
      setTimeout(async () => {
        const afterData = globalCallManager.getCallData()
        const afterSelf = afterData.realtimeKitMeeting?.self
        const sdkAfter = afterSelf?.screenShareEnabled === true
        const after = sdkAfter || afterData.callState.isScreenSharing
        if (after === before) {
          console.warn('[GlobalCallContainer] toggleScreenShare callback did not change state; using SDK fallback')
          try {
            if (afterSelf?.disableScreenShare && sdkAfter) {
              await afterSelf.disableScreenShare()
              globalCallManager.updateCallState({ isScreenSharing: false })
              return
            }
            if (afterSelf?.enableScreenShare && !sdkAfter) {
              await afterSelf.enableScreenShare()
              globalCallManager.updateCallState({ isScreenSharing: true })
              return
            }
          } catch {
            // Best-effort only
          }
          // Last resort: optimistic UI toggle (may be wrong if SDK couldn't change)
          globalCallManager.updateCallState({ isScreenSharing: !before })
        }
      }, 250)
      return
    }

    // No callback at all: try SDK directly if possible
    ;(async () => {
      try {
        if (sdkSelf?.disableScreenShare && sdkBefore) {
          await sdkSelf.disableScreenShare()
          globalCallManager.updateCallState({ isScreenSharing: false })
          return
        }
        if (sdkSelf?.enableScreenShare && !sdkBefore) {
          await sdkSelf.enableScreenShare()
          globalCallManager.updateCallState({ isScreenSharing: true })
          return
        }
      } catch {
        // Best-effort only
      }
      globalCallManager.updateCallState({ isScreenSharing: !before })
    })()
  }, [])

  // Background wrapper with SDK middleware fallback.
  const handleToggleBackground = useCallback(() => {
    const latest = globalCallManager.getCallData()
    const before = latest.callState.backgroundEnabled
    const meeting = latest.realtimeKitMeeting

    if (latest.toggleBackground) {
      latest.toggleBackground()
      setTimeout(async () => {
        const afterData = globalCallManager.getCallData()
        const after = afterData.callState.backgroundEnabled
        if (after === before) {
          console.warn(
            '[GlobalCallContainer] toggleBackground callback did not change state; using SDK middleware fallback'
          )
          if (!meeting?.self) {
            globalCallManager.updateCallState({ backgroundEnabled: !before })
            return
          }
          try {
            const next = !before
            if (next) {
              if (!virtualBackgroundRef.current) {
                virtualBackgroundRef.current = new RTKVirtualBackground()
              }
              await virtualBackgroundRef.current.initialize(meeting)
              await virtualBackgroundRef.current.enableBackground(meeting)
            } else {
              virtualBackgroundRef.current?.disable(meeting)
            }
            globalCallManager.updateCallState({ backgroundEnabled: next })
          } catch {
            // Last resort: optimistic UI toggle only
            globalCallManager.updateCallState({ backgroundEnabled: !before })
          }
        }
      }, 250)
      return
    }

    // No callback at all: apply/disable middleware directly.
    ;(async () => {
      const next = !before
      if (!meeting?.self) {
        globalCallManager.updateCallState({ backgroundEnabled: next })
        return
      }
      try {
        if (next) {
          if (!virtualBackgroundRef.current) {
            virtualBackgroundRef.current = new RTKVirtualBackground()
          }
          await virtualBackgroundRef.current.initialize(meeting)
          await virtualBackgroundRef.current.enableBackground(meeting)
        } else {
          virtualBackgroundRef.current?.disable(meeting)
        }
        globalCallManager.updateCallState({ backgroundEnabled: next })
      } catch {
        globalCallManager.updateCallState({ backgroundEnabled: next })
      }
    })()
  }, [])

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
          onEndCall={handleEndCall}
          onToggleMute={callData.toggleMute || (() => {})}
          onToggleVideo={callData.toggleVideo || (() => {})}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleMinimize={handleToggleMinimize} // Use enhanced handler
          onToggleBackground={handleToggleBackground}
          onToggleRaiseHand={handleToggleRaiseHand}
          onSendReaction={handleSendReaction}
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
