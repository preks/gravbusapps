/**
 * useRealtimeKitWebSocket Hook
 *
 * Manages WebSocket event coordination for RealtimeKit calls.
 * Handles raise hand, reactions, mute requests, and other real-time communication between participants.
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import type { CallParticipant } from '../services/webrtcClient'
import { rtkDebug } from '../utils/rtkDebug'

export interface UseRealtimeKitWebSocketOptions {
  wsClient: ChatWebSocketClient | null
  roomId: string | null
  meetingId: string | null
  currentUser: CallParticipant | null
  meeting: any // RealtimeKitMeeting instance for auto-mute
  onHandUpdate?: (participantId: string, handRaised: boolean) => void
  onReactionReceived?: (reaction: { participantId: string; participantName: string; emoji: string }) => void
  onMuteRequested?: (requestedByName: string) => void
}

export interface UseRealtimeKitWebSocketReturn {
  emitSocketEvent: (event: string, data: any) => void
  toggleRaiseHand: (currentHandRaised: boolean) => Promise<boolean>
  sendReaction: (emoji: string) => Promise<void>
  handRaised: boolean
  remoteHandsRaised: Record<string, boolean>
}

/**
 * Hook to manage WebSocket communication for RealtimeKit calls
 *
 * Provides functions to:
 * - Emit WebSocket events
 * - Toggle raise hand state
 * - Send emoji reactions
 * - Track hand raised states for all participants
 *
 * Automatically sets up listeners for:
 * - group-call:hand-update - Hand raise state changes
 * - group-call:reaction-received - Emoji reactions (handled via callback)
 *
 * @param options - Configuration options
 * @returns WebSocket functions and hand raised state
 */
export const useRealtimeKitWebSocket = ({
  wsClient,
  roomId,
  meetingId,
  currentUser,
  meeting,
  onHandUpdate,
  onReactionReceived,
  onMuteRequested
}: UseRealtimeKitWebSocketOptions): UseRealtimeKitWebSocketReturn => {
  // Track hand raised states
  const [handRaised, setHandRaised] = useState(false)
  const [remoteHandsRaised, setRemoteHandsRaised] = useState<Record<string, boolean>>({})

  /**
   * Helper to emit WebSocket events
   * Safely checks for socket existence before emitting
   */
  const emitSocketEvent = useCallback(
    (event: string, data: any) => {
      const socket = wsClient?.getSocket()
      if (socket) {
        socket.emit(event, data)
      } else {
        rtkDebug.warn('[RTK] Cannot emit socket event: socket not available', { event, data })
      }
    },
    [wsClient]
  )

  /**
   * Toggle raise hand state
   * Emits WebSocket event to broadcast state change to all participants
   *
   * @param currentHandRaised - Current hand raised state
   * @returns New hand raised state
   */
  const toggleRaiseHand = useCallback(
    async (currentHandRaised: boolean): Promise<boolean> => {
      rtkDebug.log('[RTK] 🖐️ toggleRaiseHand called', {
        roomId,
        meetingId,
        userId: currentUser?.id,
        currentHandRaised
      })

      if (!meetingId || !currentUser) {
        rtkDebug.warn('[RTK] ⚠️ Cannot toggle raise hand: missing meetingId or currentUser', {
          hasMeetingId: !!meetingId,
          hasCurrentUser: !!currentUser
        })
        return currentHandRaised
      }

      try {
        const newHandRaisedState = !currentHandRaised

        rtkDebug.log('[RTK] ✋ Emitting raise-hand WebSocket event', {
          roomId: meetingId,
          participantId: currentUser.id,
          handRaised: newHandRaisedState
        })

        // Send WebSocket event to broadcast raise hand state
        // CRITICAL: Must match the backend listener event name 'group-call:raise-hand'
        // CRITICAL: Must use meetingId (not conversationId) to match the Socket.IO room clients are joined to
        emitSocketEvent('group-call:raise-hand', {
          roomId: meetingId,
          participantId: currentUser.id,
          handRaised: newHandRaisedState
        })

        // Return new state (actual state will be updated via WebSocket event listener)
        return newHandRaisedState
      } catch (error) {
        rtkDebug.error('[RTK] ❌ Failed to toggle raise hand:', error)
        return currentHandRaised
      }
    },
    [meetingId, currentUser, emitSocketEvent]
  )

  /**
   * Send an emoji reaction
   * Broadcasts the reaction to all participants in the call
   *
   * @param emoji - The emoji to send
   */
  const sendReaction = useCallback(
    async (emoji: string): Promise<void> => {
      rtkDebug.log('[RTK] 😊 sendReaction called', {
        emoji,
        roomId,
        meetingId,
        userId: currentUser?.id
      })

      if (!meetingId || !currentUser) {
        rtkDebug.warn('[RTK] ⚠️ Cannot send reaction: missing meetingId or currentUser', {
          hasMeetingId: !!meetingId,
          hasCurrentUser: !!currentUser
        })
        return
      }

      try {
        rtkDebug.log('[RTK] 😊 Emitting send-reaction WebSocket event', {
          roomId: meetingId,
          participantId: currentUser.id,
          participantName: currentUser.odName,
          emoji
        })

        // Send WebSocket event to broadcast reaction
        // CRITICAL: Must use meetingId (not conversationId) to match the Socket.IO room clients are joined to
        emitSocketEvent('group-call:send-reaction', {
          roomId: meetingId,
          participantId: currentUser.id,
          participantName: currentUser.odName,
          emoji
        })

        rtkDebug.log('[RTK] ✅ Reaction sent successfully')
      } catch (error) {
        rtkDebug.error('[RTK] ❌ Failed to send reaction:', error)
      }
    },
    [meetingId, currentUser, emitSocketEvent]
  )

  /**
   * Set up WebSocket event listeners for raise hand updates
   * Listens for hand-update events and updates local/remote hand states
   */
  useEffect(() => {
    rtkDebug.log('[RTK] Raise hand useEffect triggered', {
      hasSocket: !!wsClient?.getSocket(),
      roomId,
      meetingId,
      userId: currentUser?.id
    })

    const socket = wsClient?.getSocket()
    if (!socket || !meetingId || !currentUser) {
      rtkDebug.warn('[RTK] ⚠️ Cannot attach raise hand listener', {
        hasSocket: !!socket,
        hasMeetingId: !!meetingId,
        hasCurrentUser: !!currentUser
      })
      return
    }

    // Handle raise hand state updates
    const handleHandUpdate = (data: { participantId: string; handRaised: boolean }) => {
      rtkDebug.log('[RTK] ✋ Received hand-update event:', data)

      if (data.participantId === currentUser.id) {
        // Update local user's hand state
        rtkDebug.log('[RTK] ✋ Updating own hand raise state:', data.handRaised)
        setHandRaised(data.handRaised)
      } else {
        // Update remote participant's hand state
        rtkDebug.log('[RTK] ✋ Updating remote participant hand state:', {
          participantId: data.participantId,
          handRaised: data.handRaised
        })
        setRemoteHandsRaised(prev => ({
          ...prev,
          [data.participantId]: data.handRaised
        }))
      }

      // Notify parent if callback provided
      onHandUpdate?.(data.participantId, data.handRaised)
    }

    // Listen for events
    socket.on('group-call:hand-update', handleHandUpdate)
    rtkDebug.log('[RTK] ✅ WebSocket listener attached for raise hand')

    return () => {
      socket.off('group-call:hand-update', handleHandUpdate)
      rtkDebug.log('[RTK] WebSocket listener removed for raise hand')
    }
  }, [wsClient, meetingId, currentUser, onHandUpdate])

  /**
   * Set up WebSocket event listener for reactions (if callback provided)
   */
  useEffect(() => {
    if (!onReactionReceived) return

    const socket = wsClient?.getSocket()
    if (!socket || !meetingId) return

    const handleReactionReceived = (data: {
      participantId: string
      participantName: string
      emoji: string
      timestamp: number
    }) => {
      rtkDebug.log('[RTK] 😊 Received reaction event:', data)
      onReactionReceived({
        participantId: data.participantId,
        participantName: data.participantName,
        emoji: data.emoji
      })
    }

    socket.on('group-call:reaction-received', handleReactionReceived)
    rtkDebug.log('[RTK] ✅ WebSocket listener attached for reactions')

    return () => {
      socket.off('group-call:reaction-received', handleReactionReceived)
      rtkDebug.log('[RTK] WebSocket listener removed for reactions')
    }
  }, [wsClient, meetingId, onReactionReceived])

  /**
   * Set up WebSocket event listener for mute requests with auto-mute
   */
  useEffect(() => {
    rtkDebug.log('[RTK] Mute listener useEffect triggered', {
      hasSocket: !!wsClient?.getSocket(),
      hasMeetingId: !!meetingId,
      hasMeeting: !!meeting,
      hasMeetingSelf: !!meeting?.self,
      hasDisableAudio: !!meeting?.self?.disableAudio
    })

    const socket = wsClient?.getSocket()
    if (!socket || !meetingId || !meeting) {
      rtkDebug.warn('[RTK] ⚠️ Cannot attach mute listener', {
        hasSocket: !!socket,
        hasMeetingId: !!meetingId,
        hasMeeting: !!meeting
      })
      return
    }

    const handleMuteRequested = (data: { requestedBy: string; requestedByName: string }) => {
      rtkDebug.log('[RTK] 🔇 Received mute request from:', data.requestedByName)

      try {
        // Auto-mute self via RTK
        if (meeting?.self?.disableAudio) {
          meeting.self.disableAudio()
          rtkDebug.log('[RTK] ✅ Auto-muted self via RTK')

          // Show toast notification
          toast.info(`You were muted by ${data.requestedByName}`, {
            duration: 3000
          })
        } else {
          rtkDebug.error('[RTK] ❌ meeting.self.disableAudio not available')
        }

        // Notify via callback if provided
        onMuteRequested?.(data.requestedByName)
      } catch (error) {
        rtkDebug.error('[RTK] ❌ Failed to auto-mute:', error)
        toast.error('Failed to mute your microphone', {
          duration: 3000
        })
      }
    }

    socket.on('group-call:mute-requested', handleMuteRequested)
    rtkDebug.log('[RTK] ✅ WebSocket listener attached for mute requests')

    return () => {
      socket.off('group-call:mute-requested', handleMuteRequested)
      rtkDebug.log('[RTK] WebSocket listener removed for mute requests')
    }
  }, [wsClient, meetingId, meeting, onMuteRequested])

  return {
    emitSocketEvent,
    toggleRaiseHand,
    sendReaction,
    handRaised,
    remoteHandsRaised
  }
}
