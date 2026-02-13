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
import { RTKVirtualBackground } from '../services/rtkVirtualBackground'
import { STORAGE_KEY_ACCESS_TOKEN } from '@/common/constants/ideStorageKeys'

export const GlobalCallContainer: React.FC = () => {
  const [instanceId] = useState(() => `global-call-container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const [callData, setCallData] = useState(() => ({ ...globalCallManager.getCallData() }))
  const [uiOwnerId, setUiOwnerId] = useState<string | null>(() => globalCallManager.getUiOwnerId())
  const virtualBackgroundRef = useRef<RTKVirtualBackground | null>(null)
  const isSubscribedRef = useRef(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const isPassiveModeRef = useRef(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Subscribe to global call manager changes with subscription ownership locking
  useEffect(() => {
    // Prevent duplicate subscriptions from the same instance
    if (isSubscribedRef.current) {
      return unsubscribeRef.current || undefined
    }

    isSubscribedRef.current = true

    const unsubscribe = globalCallManager.subscribe(() => {
      const data = globalCallManager.getCallData()
      const ownerId = globalCallManager.getUiOwnerId()
      queueMicrotask(() => {
        setCallData({ ...data })
        setUiOwnerId(ownerId)
      })
    }, instanceId)

    unsubscribeRef.current = unsubscribe

    // Check if this instance is in passive mode (couldn't claim subscription ownership)
    const subscriptionOwner = globalCallManager.getSubscriptionOwnerId()
    isPassiveModeRef.current = subscriptionOwner !== instanceId

    // If in passive mode, poll for state changes instead of subscribing
    if (isPassiveModeRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        const data = globalCallManager.getCallData()
        const currentOwner = globalCallManager.getUiOwnerId()

        // Only update state if we're the UI owner or becoming eligible
        if (currentOwner === instanceId || !currentOwner) {
          setCallData({ ...data })
          setUiOwnerId(currentOwner)
        }
      }, 500) // Poll every 500ms for passive instances
    }

    return () => {
      // Clear polling if in passive mode
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      isSubscribedRef.current = false
      unsubscribeRef.current = null
      unsubscribe()
    }
  }, [instanceId])

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

  // Toggle minimize handler - no navigation, just state update
  const handleToggleMinimize = useCallback(() => {
    // CRITICAL: Get LATEST callData inside the function, not from closure
    const latestCallData = globalCallManager.getCallData()
    const isCurrentlyMinimized = latestCallData.callState.isMinimized
    const newMinimizedState = !isCurrentlyMinimized

    // Always update globalCallManager first - this will trigger subscription
    globalCallManager.updateCallState({ isMinimized: newMinimizedState, hasBeenMinimized: true })

    // Try to use the hook's callback if available (for additional side effects)
    if (latestCallData.toggleMinimize) {
      const before = globalCallManager.getCallData().callState.isMinimized

      // Only call the callback if it's still out of sync (to trigger its internal effects)
      if (before !== newMinimizedState) {
        latestCallData.toggleMinimize()
      }
    }

    // Subscription will fire automatically from updateCallState -> notifyListeners
    // No need to manually setCallData here
  }, [instanceId])

  // End call handler with fallback cleanup.
  // After navigation, stored callbacks can become stale/no-op; this ensures UI doesn't get stuck.
  const handleEndCall = useCallback(() => {
    void (async () => {
      const latest = globalCallManager.getCallData()
      const meetingForFallback = latest.realtimeKitMeeting
      const wsClientForFallback = latest.wsClient
      const tokenForFallback = latest.accessToken
      const conversationIdForFallback = latest.callState.roomId
      const meetingIdForFallback = latest.callState.meetingId ?? null
      const sessionIdForFallback = latest.callState.sessionId ?? null
      const participantIdForFallback = latest.currentUserId || latest.currentUser?.id || null
      const isMeetingForFallback = latest.callState.conversationType === 'meeting'

      const getLatestAccessToken = () => {
        try {
          const fromStorage = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN)
          const fromManager = globalCallManager.getCallData().accessToken
          const token = fromStorage || fromManager || tokenForFallback || null

          if (token && token !== fromManager) {
            // Keep global state fresh for subsequent best-effort emits.
            globalCallManager.setCall({ accessToken: token })
          }

          return token
        } catch {
          return globalCallManager.getCallData().accessToken || tokenForFallback || null
        }
      }

      const ensureConnectedSocket = async () => {
        try {
          const wsClient = wsClientForFallback
          if (!wsClient) {
            return null
          }

          let socket = wsClient.getSocket?.()

          if (socket && !socket.connected && typeof (socket as any).connect === 'function') {
            try {
              ;(socket as any).connect()
            } catch (err) {
              console.error('[GlobalCallContainer] ensureConnectedSocket: Reconnect failed', err)
            }
          }

          if (socket && !socket.connected) {
            const s = socket
            await new Promise<void>(resolve => {
              const timeout = setTimeout(() => {
                resolve()
              }, 600)
              s.once('connect', () => {
                clearTimeout(timeout)
                resolve()
              })
            })
          }

          if (!socket) {
            const token = getLatestAccessToken()
            if (!token) {
              return null
            }

            wsClient.connect(token)
            socket = wsClient.getSocket?.()
          }

          if (socket && !socket.connected) {
            const s = socket
            await new Promise<void>(resolve => {
              const timeout = setTimeout(() => {
                resolve()
              }, 600)
              s.once('connect', () => {
                clearTimeout(timeout)
                resolve()
              })
            })
          }

          if (!socket || !socket.connected) {
            return null
          }
          return socket
        } catch (err) {
          console.error('[GlobalCallContainer] ensureConnectedSocket: Exception', err)
          return null
        }
      }

      const emitLeftBestEffort = async () => {
        try {
          const socket = await ensureConnectedSocket()
          if (!socket) {
            console.warn('[GlobalCallContainer] emitLeftBestEffort: No connected socket, cannot emit')
            return
          }

          if (conversationIdForFallback && meetingIdForFallback && participantIdForFallback) {
            const payload = {
              conversationId: conversationIdForFallback,
              meetingId: meetingIdForFallback,
              sessionId: sessionIdForFallback,
              isMeeting: isMeetingForFallback,
              participantId: participantIdForFallback
            }

            // Prefer ack so the event has a chance to reach backend before teardown.
            if (typeof (socket as any).timeout === 'function') {
              await new Promise<void>(resolve => {
                ;(socket as any).timeout(800).emit('rtk-group-call:left', payload, () => {
                  resolve()
                })
              })
            } else {
              socket.emit('rtk-group-call:left', payload)
              await new Promise(resolve => setTimeout(resolve, 0))
            }
          } else {
            console.warn('[GlobalCallContainer] emitLeftBestEffort: Missing required data', {
              hasConversationId: !!conversationIdForFallback,
              hasMeetingId: !!meetingIdForFallback,
              hasParticipantId: !!participantIdForFallback
            })
          }
        } catch (err) {
          console.error('[GlobalCallContainer] emitLeftBestEffort: Exception', err)
        }
      }

      // Prefer hook callback if available
      if (latest.leaveCall) {
        let leaveSettled = false
        try {
          // IMPORTANT: When navigating away, the chat module may be unmounted and its WebSocket torn down.
          // Emit "left" best-effort from the persistent container BEFORE calling into hook cleanup.
          await emitLeftBestEffort()

          const maybePromise = latest.leaveCall()
          if (maybePromise && typeof (maybePromise as any).finally === 'function') {
            ;(maybePromise as Promise<unknown>).finally(() => {
              leaveSettled = true
            })
          } else {
            leaveSettled = true
          }
        } catch (err) {
          console.error('[GlobalCallContainer] handleEndCall: Hook leaveCall threw error', err)
          // If callback throws synchronously, fall back below.
          leaveSettled = false
        }

        // Extra safety: even if the hook resolves quickly, ensure the SDK meeting was actually left.
        setTimeout(async () => {
          const roomState = meetingForFallback?.self?.roomState
          if (roomState && roomState !== 'joined') return
          try {
            await meetingForFallback?.leave?.()
          } catch (err) {
            console.error('[GlobalCallContainer] handleEndCall: Extra safety leave failed', err)
          }
          await emitLeftBestEffort()
        }, 1000)

        // Fallback: if leave is stuck (or callback is stale), force cleanup.
        setTimeout(async () => {
          const after = globalCallManager.getCallData()

          // If the hook already finished and the SDK meeting is not joined, do nothing.
          const roomState = meetingForFallback?.self?.roomState
          if (leaveSettled && roomState && roomState !== 'joined') {
            return
          }

          // Even if the callback cleared state early, ensure we actually left the SDK meeting.
          // We keep a reference to the meeting object captured BEFORE invoking leaveCall().
          if (after.callState.status === 'idle' && !meetingForFallback) {
            return
          }

          try {
            await (after.realtimeKitMeeting || meetingForFallback)?.self?.disableScreenShare?.()
          } catch (err) {
            console.error('[GlobalCallContainer] handleEndCall: Fallback - screen share disable failed', err)
          }
          try {
            await (after.realtimeKitMeeting || meetingForFallback)?.leave?.()
          } catch (err) {
            console.error('[GlobalCallContainer] handleEndCall: Fallback - meeting leave failed', err)
          }
          try {
            after.localStream?.getTracks?.().forEach((t: MediaStreamTrack) => t.stop())
          } catch (err) {
            console.error('[GlobalCallContainer] handleEndCall: Fallback - stop tracks failed', err)
          }

          // Best-effort backend notify: emit the same payload as the hook's leaveCall.
          await emitLeftBestEffort()

          globalCallManager.clearCall()
        }, 2000)

        return
      }

      // No callback at all - at least close UI
      globalCallManager.clearCall()
    })()
  }, [])

  // Mute wrapper with SDK fallback.
  // After navigation, stored callbacks can become stale/no-op; this ensures the button still works.
  const handleToggleMute = useCallback(() => {
    const latest = globalCallManager.getCallData()
    const sdkSelf = latest.realtimeKitMeeting?.self
    const sdkAudioEnabled = sdkSelf?.audioEnabled ?? undefined
    const beforeMuted = sdkAudioEnabled !== undefined ? sdkAudioEnabled === false : latest.callState.isMuted

    if (latest.toggleMute) {
      latest.toggleMute()

      setTimeout(async () => {
        const afterData = globalCallManager.getCallData()
        const afterSelf = afterData.realtimeKitMeeting?.self
        const afterSdkAudioEnabled = afterSelf?.audioEnabled ?? undefined
        const afterMuted =
          afterSdkAudioEnabled !== undefined
            ? afterSdkAudioEnabled === false
            : globalCallManager.getCallData().callState.isMuted

        if (afterMuted !== beforeMuted) {
          // Keep UI in sync even if the callback worked but callState didn't update.
          globalCallManager.updateCallState({ isMuted: afterMuted })
          return
        }
        try {
          const currentEnabled = afterSelf?.audioEnabled ?? false
          if (currentEnabled && afterSelf?.disableAudio) {
            await globalCallManager.executeAudioOperation(async () => {
              await afterSelf!.disableAudio()
            })
            globalCallManager.updateCallState({ isMuted: true })
            return
          }
          if (currentEnabled === false && afterSelf?.enableAudio) {
            await globalCallManager.executeAudioOperation(async () => {
              await afterSelf!.enableAudio()
            })
            globalCallManager.updateCallState({ isMuted: false })
            return
          }
        } catch {
          // Best-effort
        }

        // Last resort: optimistic UI toggle (may be wrong if SDK couldn't change)
        globalCallManager.updateCallState({ isMuted: !beforeMuted })
      }, 250)

      return
    }

    // No callback - use SDK directly.
    ;(async () => {
      try {
        const currentEnabled = sdkSelf?.audioEnabled ?? false
        if (currentEnabled && sdkSelf?.disableAudio) {
          await globalCallManager.executeAudioOperation(async () => {
            await sdkSelf!.disableAudio()
          })
          globalCallManager.updateCallState({ isMuted: true })
          return
        }
        if (currentEnabled === false && sdkSelf?.enableAudio) {
          await globalCallManager.executeAudioOperation(async () => {
            await sdkSelf!.enableAudio()
          })
          globalCallManager.updateCallState({ isMuted: false })
          return
        }
      } catch {
        // Best-effort
      }
    })()
  }, [])

  // Video wrapper with SDK fallback.
  // After navigation, stored callbacks can become stale/no-op; this ensures the button still works.
  const handleToggleVideo = useCallback(() => {
    const latest = globalCallManager.getCallData()
    const sdkSelf = latest.realtimeKitMeeting?.self
    const sdkVideoEnabled = sdkSelf?.videoEnabled ?? undefined
    const beforeEnabled = sdkVideoEnabled !== undefined ? sdkVideoEnabled : latest.callState.isVideoEnabled

    if (latest.toggleVideo) {
      latest.toggleVideo()

      setTimeout(async () => {
        const afterData = globalCallManager.getCallData()
        const afterSelf = afterData.realtimeKitMeeting?.self
        const afterSdkVideoEnabled = afterSelf?.videoEnabled ?? undefined
        const afterEnabled =
          afterSdkVideoEnabled !== undefined
            ? afterSdkVideoEnabled
            : globalCallManager.getCallData().callState.isVideoEnabled

        if (afterEnabled !== beforeEnabled) {
          // Keep UI in sync even if the callback worked but callState didn't update.
          globalCallManager.updateCallState({ isVideoEnabled: afterEnabled })
          return
        }

        console.warn('[GlobalCallContainer] toggleVideo callback did not change state; using SDK fallback')

        try {
          const currentEnabled = afterSelf?.videoEnabled ?? false
          if (currentEnabled && afterSelf?.disableVideo) {
            await afterSelf.disableVideo()
            globalCallManager.updateCallState({ isVideoEnabled: false })
            return
          }
          if (currentEnabled === false && afterSelf?.enableVideo) {
            await afterSelf.enableVideo()
            globalCallManager.updateCallState({ isVideoEnabled: true })
            return
          }
        } catch {
          // Best-effort
        }

        // Last resort: optimistic UI toggle (may be wrong if SDK couldn't change)
        globalCallManager.updateCallState({ isVideoEnabled: !beforeEnabled })
      }, 250)

      return
    }

    // No callback - use SDK directly.
    ;(async () => {
      try {
        const currentEnabled = sdkSelf?.videoEnabled ?? false
        if (currentEnabled && sdkSelf?.disableVideo) {
          await sdkSelf.disableVideo()
          globalCallManager.updateCallState({ isVideoEnabled: false })
          return
        }
        if (currentEnabled === false && sdkSelf?.enableVideo) {
          await sdkSelf.enableVideo()
          globalCallManager.updateCallState({ isVideoEnabled: true })
          return
        }
      } catch {
        // Best-effort
      }
    })()
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

  // RNNoise toggle wrapper
  const handleToggleRnnoise = useCallback(() => {
    const latest = globalCallManager.getCallData()
    if (latest.toggleRnnoise) {
      latest.toggleRnnoise()
      return
    }
    console.warn('[GlobalCallContainer] toggleRnnoise callback not available')
  }, [])

  // RNNoise mode change wrapper
  const handleRnnoiseModeChange = useCallback((mode: 'gentle' | 'moderate' | 'aggressive') => {
    const latest = globalCallManager.getCallData()
    if (latest.setRnnoiseMode) {
      latest.setRnnoiseMode(mode)
      return
    }
    console.warn('[GlobalCallContainer] setRnnoiseMode callback not available')
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
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleMinimize={handleToggleMinimize}
          onToggleBackground={handleToggleBackground}
          onToggleRnnoise={handleToggleRnnoise}
          onRnnoiseModeChange={handleRnnoiseModeChange}
          rnnoiseEnabled={callData.rnnoiseEnabled}
          rnnoiseMode={callData.rnnoiseMode}
          onToggleRaiseHand={handleToggleRaiseHand}
          onSendReaction={handleSendReaction}
          onSetVideoQuality={callData.setVideoQuality || (() => {})}
          onMicDeviceChange={callData.switchAudioDevice || undefined}
          onCameraDeviceChange={callData.switchVideoDevice || undefined}
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
