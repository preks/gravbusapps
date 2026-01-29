/**
 * useRealtimeKitWebSocket Hook
 *
 * Manages WebSocket event coordination for RealtimeKit calls.
 * Handles raise hand, reactions, mute requests, and other real-time communication between participants.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react'
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
  cleanupParticipantHandState: (participantId: string, peerId?: string, userId?: string) => void
  handRaised: boolean
  remoteHandsRaised: Record<string, boolean>
  handRaisedOrder: Record<string, { order: number; timestamp: number }>
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
  // Track hand raised states and order
  const [handRaised, setHandRaised] = useState(false)
  const [remoteHandsRaised, setRemoteHandsRaised] = useState<Record<string, boolean>>({})
  const [handRaisedOrder, setHandRaisedOrder] = useState<Record<string, { order: number; timestamp: number }>>({})

  // Track if user has intentionally toggled their hand (to ignore spurious events on join)
  const userIntentionallyToggledRef = useRef(false)
  const joinTimeRef = useRef<number>(0)

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

        // Mark that user intentionally toggled their hand
        userIntentionallyToggledRef.current = true

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
          handRaised: newHandRaisedState,
          timestamp: Date.now()
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
   * Track join time to implement grace period for spurious hand-raised events
   * Reset when meetingId changes (new call)
   */
  useEffect(() => {
    if (!meetingId) return

    // Record join time
    joinTimeRef.current = Date.now()
    userIntentionallyToggledRef.current = false

    rtkDebug.log('[RTK] 🚫 Just joined - will ignore spurious hand-raised events for 500ms')

    return () => {
      joinTimeRef.current = 0
      userIntentionallyToggledRef.current = false
    }
  }, [meetingId]) // Only depend on meetingId

  /**
   * Set up WebSocket event listeners for raise hand updates
   * Listens for hand-update events and updates local/remote hand states
   */
  useEffect(() => {
    // Early return if not in an active call - this is expected on page load
    if (!meeting) {
      return
    }

    rtkDebug.log('[RTK] Raise hand useEffect triggered', {
      hasSocket: !!wsClient?.getSocket(),
      roomId,
      meetingId,
      userId: currentUser?.id
    })

    const socket = wsClient?.getSocket()
    if (!socket || !meetingId || !currentUser) {
      rtkDebug.log('[RTK] Cannot attach raise hand listener yet', {
        hasSocket: !!socket,
        hasMeetingId: !!meetingId,
        hasCurrentUser: !!currentUser
      })
      return
    }

    // Handle raise hand state updates
    const handleHandUpdate = (data: { participantId: string; handRaised: boolean; timestamp?: number }) => {
      rtkDebug.log('[RTK] ✋ Received hand-update event:', data)

      // CRITICAL: Prevent spurious hand-raised events on join (only for local user)
      // If local user hasn't explicitly toggled their hand AND it's within 500ms of joining,
      // AND the event is trying to raise their hand → ignore it (likely backend sending stale state)
      const isLocalUser = data.participantId === currentUser?.id
      const isWithinGracePeriod = Date.now() - joinTimeRef.current < 500
      const hasNotToggledYet = !userIntentionallyToggledRef.current

      if (isLocalUser && data.handRaised && isWithinGracePeriod && hasNotToggledYet) {
        rtkDebug.warn('[RTK] 🚫 Ignoring spurious hand-raised event on join (within 500ms grace period):', data)
        return
      }

      const timestamp = data.timestamp || Date.now()

      // Resolve ALL possible IDs for this participant (like reactions approach)
      let participantPeerId: string | undefined
      let participantUserId: string | undefined
      let participantCustomId: string | undefined = data.participantId

      if (isLocalUser) {
        // For local user, use self IDs (DO NOT use 'local' string - causes collisions between users)
        participantPeerId = meeting?.self?.id // Use actual peer ID, not 'local'
        participantUserId = meeting?.self?.userId
        participantCustomId = meeting?.self?.customParticipantId || currentUser.id
      } else if (meeting?.participants?.joined) {
        // For remote user, find in participants list
        const joined = Array.from(meeting.participants.joined.values())
        const matchingPeer: any = joined.find(
          (p: any) =>
            p.customParticipantId === data.participantId ||
            p.userId === data.participantId ||
            p.id === data.participantId
        )
        if (matchingPeer) {
          participantPeerId = matchingPeer.id
          participantUserId = matchingPeer.userId
          participantCustomId = matchingPeer.customParticipantId
        }
      }

      if (data.participantId === currentUser.id) {
        // Update local user's hand state
        rtkDebug.log('[RTK] ✋ Updating own hand raise state:', {
          handRaised: data.handRaised,
          participantId: data.participantId
        })
        setHandRaised(data.handRaised)
      } else {
        // Update remote participant's hand state
        rtkDebug.log('[RTK] ✋ Updating remote participant hand state:', {
          participantId: data.participantId,
          handRaised: data.handRaised,
          localUserId: currentUser.id,
          resolvedIds: { peerId: participantPeerId, userId: participantUserId, customId: participantCustomId }
        })

        setRemoteHandsRaised(prev => {
          const updated = { ...prev }
          // Store under ALL possible keys (same approach as reactions filtering)
          if (participantPeerId) updated[participantPeerId] = data.handRaised
          if (participantUserId) updated[participantUserId] = data.handRaised
          if (participantCustomId) updated[participantCustomId] = data.handRaised

          rtkDebug.log('[RTK] ✋ Remote hands raised state after update:', updated)
          return updated
        })
      }

      // Update hand raise order tracking (store under all IDs like remoteHandsRaised)
      setHandRaisedOrder(prev => {
        if (data.handRaised) {
          // Hand raised - first remove any existing entries for this participant to avoid duplicates
          const updated = { ...prev }

          rtkDebug.log('[RTK] 🔍 BEFORE deletion:', {
            prevKeys: Object.keys(prev),
            prevEntries: prev,
            willDelete: { participantPeerId, participantUserId, participantCustomId }
          })

          if (participantPeerId) delete updated[participantPeerId]
          if (participantUserId) delete updated[participantUserId]
          if (participantCustomId) delete updated[participantCustomId]

          rtkDebug.log('[RTK] 🔍 AFTER deletion:', {
            updatedKeys: Object.keys(updated),
            updatedEntries: updated
          })

          // Get all unique timestamps from remaining participants
          const allTimestamps = new Set<number>()
          Object.values(updated).forEach(entry => allTimestamps.add(entry.timestamp))

          // Sort timestamps to get order (oldest = 1, newest = N)
          const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

          // Calculate order for this new timestamp (position + 1)
          const order = sortedTimestamps.length + 1

          rtkDebug.log('[RTK] ✋ Assigning hand raise order:', {
            participantId: data.participantId,
            timestamp,
            order,
            existingCount: sortedTimestamps.length,
            allTimestamps: Array.from(allTimestamps)
          })

          const orderData = { order, timestamp }
          if (participantPeerId) updated[participantPeerId] = orderData
          if (participantUserId) updated[participantUserId] = orderData
          if (participantCustomId) updated[participantCustomId] = orderData
          return updated
        } else {
          // Hand lowered - remove from tracking and recalculate order numbers
          const updated = { ...prev }

          rtkDebug.log('[RTK] 🔍 RECALC BEFORE deletion:', {
            prevKeys: Object.keys(prev),
            prevEntries: prev,
            willDelete: { participantPeerId, participantUserId, participantCustomId }
          })

          if (participantPeerId) delete updated[participantPeerId]
          if (participantUserId) delete updated[participantUserId]
          if (participantCustomId) delete updated[participantCustomId]

          rtkDebug.log('[RTK] 🔍 RECALC AFTER deletion:', {
            updatedKeys: Object.keys(updated),
            updatedEntries: updated
          })

          // Recalculate order numbers for remaining hands (preserve timestamp order)
          const uniqueEntries = new Map<number, { order: number; timestamp: number }>()
          Object.values(updated).forEach(entry => {
            if (!uniqueEntries.has(entry.timestamp)) {
              uniqueEntries.set(entry.timestamp, entry)
            }
          })

          rtkDebug.log('[RTK] 🔍 RECALC unique timestamps:', {
            uniqueCount: uniqueEntries.size,
            timestamps: Array.from(uniqueEntries.keys())
          })

          // Sort by timestamp and reassign sequential order numbers
          const sortedEntries = Array.from(uniqueEntries.entries()).sort((a, b) => a[0] - b[0])
          sortedEntries.forEach(([timestamp], index) => {
            const newOrder = index + 1
            // Update all entries with this timestamp
            Object.keys(updated).forEach(key => {
              if (updated[key].timestamp === timestamp) {
                rtkDebug.log('[RTK] 🔍 RECALC updating key:', {
                  key,
                  timestamp,
                  newOrder,
                  oldOrder: updated[key].order
                })
                updated[key] = { ...updated[key], order: newOrder }
              }
            })
          })

          rtkDebug.log('[RTK] ✋ Recalculated order after hand lowered:', {
            participantId: data.participantId,
            remainingCount: uniqueEntries.size,
            finalEntries: updated
          })

          return updated
        }
      })

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
  }, [wsClient, meetingId, currentUser, meeting, onHandUpdate])

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
    // Early return if not in an active call - this is expected on page load
    if (!meeting) {
      return
    }

    rtkDebug.log('[RTK] Mute listener useEffect triggered', {
      hasSocket: !!wsClient?.getSocket(),
      hasMeetingId: !!meetingId,
      hasMeeting: !!meeting,
      hasMeetingSelf: !!meeting?.self,
      hasDisableAudio: !!meeting?.self?.disableAudio
    })

    const socket = wsClient?.getSocket()
    if (!socket || !meetingId) {
      rtkDebug.log('[RTK] Cannot attach mute listener yet', {
        hasSocket: !!socket,
        hasMeetingId: !!meetingId
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

  /**
   * Set up WebSocket event listener for participant leaving
   * Cleans up raised hand state when a participant leaves
   */
  useEffect(() => {
    // Early return if not in an active call
    if (!meeting) {
      return
    }

    const socket = wsClient?.getSocket()
    if (!socket || !meetingId) {
      return
    }

    const handleParticipantLeft = (data: { roomId: string; participantId: string }) => {
      // Only process if the event is for the current call
      if (data.roomId !== meetingId) {
        return
      }

      rtkDebug.log('[RTK] 👋 Participant left, cleaning up raised hand state:', {
        participantId: data.participantId,
        roomId: data.roomId
      })

      // Resolve ALL possible IDs for the leaving participant
      let participantPeerId: string | undefined
      let participantUserId: string | undefined
      let participantCustomId: string | undefined = data.participantId

      if (meeting?.participants?.joined) {
        const joined = Array.from(meeting.participants.joined.values())
        const matchingPeer: any = joined.find(
          (p: any) =>
            p.customParticipantId === data.participantId ||
            p.userId === data.participantId ||
            p.id === data.participantId
        )
        if (matchingPeer) {
          participantPeerId = matchingPeer.id
          participantUserId = matchingPeer.userId
          participantCustomId = matchingPeer.customParticipantId
        }
      }

      // Clean up remoteHandsRaised state
      setRemoteHandsRaised(prev => {
        const updated = { ...prev }
        let hadRaisedHand = false

        // Remove all entries for this participant
        if (participantPeerId && updated[participantPeerId]) {
          delete updated[participantPeerId]
          hadRaisedHand = true
        }
        if (participantUserId && updated[participantUserId]) {
          delete updated[participantUserId]
          hadRaisedHand = true
        }
        if (participantCustomId && updated[participantCustomId]) {
          delete updated[participantCustomId]
          hadRaisedHand = true
        }

        if (hadRaisedHand) {
          rtkDebug.log('[RTK] 🧹 Removed raised hand state for leaving participant:', {
            participantId: data.participantId,
            removedIds: { peerId: participantPeerId, userId: participantUserId, customId: participantCustomId },
            remainingHandsRaised: updated
          })
        }

        return updated
      })

      // Clean up handRaisedOrder state and recalculate order numbers
      setHandRaisedOrder(prev => {
        const updated = { ...prev }
        let hadRaisedHand = false

        rtkDebug.log('[RTK] 🔍 CLEANUP BEFORE deletion:', {
          prevKeys: Object.keys(prev),
          prevEntries: prev,
          willDelete: { participantPeerId, participantUserId, participantCustomId }
        })

        // Remove all entries for this participant
        if (participantPeerId && updated[participantPeerId]) {
          delete updated[participantPeerId]
          hadRaisedHand = true
        }
        if (participantUserId && updated[participantUserId]) {
          delete updated[participantUserId]
          hadRaisedHand = true
        }
        if (participantCustomId && updated[participantCustomId]) {
          delete updated[participantCustomId]
          hadRaisedHand = true
        }

        if (!hadRaisedHand) {
          // Participant didn't have a raised hand, no need to recalculate
          return updated
        }

        rtkDebug.log('[RTK] 🔍 CLEANUP AFTER deletion:', {
          updatedKeys: Object.keys(updated),
          updatedEntries: updated
        })

        // Recalculate order numbers for remaining hands (preserve timestamp order)
        const uniqueEntries = new Map<number, { order: number; timestamp: number }>()
        Object.values(updated).forEach(entry => {
          if (!uniqueEntries.has(entry.timestamp)) {
            uniqueEntries.set(entry.timestamp, entry)
          }
        })

        rtkDebug.log('[RTK] 🔍 CLEANUP unique timestamps:', {
          uniqueCount: uniqueEntries.size,
          timestamps: Array.from(uniqueEntries.keys())
        })

        // Sort by timestamp and reassign sequential order numbers
        const sortedEntries = Array.from(uniqueEntries.entries()).sort((a, b) => a[0] - b[0])
        sortedEntries.forEach(([timestamp], index) => {
          const newOrder = index + 1
          // Update all entries with this timestamp
          Object.keys(updated).forEach(key => {
            if (updated[key].timestamp === timestamp) {
              rtkDebug.log('[RTK] 🔍 CLEANUP updating key:', {
                key,
                timestamp,
                newOrder,
                oldOrder: updated[key].order
              })
              updated[key] = { ...updated[key], order: newOrder }
            }
          })
        })

        rtkDebug.log('[RTK] 🧹 Recalculated order after participant left:', {
          participantId: data.participantId,
          remainingCount: uniqueEntries.size,
          finalEntries: updated
        })

        return updated
      })
    }

    socket.on('group-call:participant-left', handleParticipantLeft)
    rtkDebug.log('[RTK] ✅ WebSocket listener attached for participant left')

    return () => {
      socket.off('group-call:participant-left', handleParticipantLeft)
      rtkDebug.log('[RTK] WebSocket listener removed for participant left')
    }
  }, [wsClient, meetingId, meeting])

  // Clear hand raise state when roomId changes (new call starts)
  const prevRoomIdRef = useRef<string | null>(null)
  React.useEffect(() => {
    // If roomId changed from a previous value, clear stale hand raise state
    if (prevRoomIdRef.current !== null && prevRoomIdRef.current !== roomId) {
      rtkDebug.log('[RTK] 🧹 Clearing hand raise state - new call starting', {
        prevRoomId: prevRoomIdRef.current,
        newRoomId: roomId
      })
      setHandRaised(false)
      setRemoteHandsRaised({})
      setHandRaisedOrder({})
    }
    prevRoomIdRef.current = roomId
  }, [roomId])

  // Calculate order numbers based on UNIQUE timestamps
  // Multiple keys (peerId, userId, customId) can have the same timestamp = same participant
  const calculatedOrder = React.useMemo(() => {
    // Group by unique timestamps
    const timestampToEntries = new Map<number, Array<[string, { order: number; timestamp: number }]>>()
    Object.entries(handRaisedOrder).forEach(([participantId, data]) => {
      if (!timestampToEntries.has(data.timestamp)) {
        timestampToEntries.set(data.timestamp, [])
      }
      timestampToEntries.get(data.timestamp)!.push([participantId, data])
    })

    // Sort unique timestamps
    const sortedTimestamps = Array.from(timestampToEntries.keys()).sort((a, b) => a - b)

    // Assign same order to all keys with the same timestamp
    const orderMap: Record<string, { order: number; timestamp: number }> = {}
    sortedTimestamps.forEach((timestamp, index) => {
      const order = index + 1 // 1-based order
      const entries = timestampToEntries.get(timestamp)!
      entries.forEach(([participantId, data]) => {
        orderMap[participantId] = { order, timestamp: data.timestamp }
      })
    })

    rtkDebug.log('[RTK] 🔢 Calculated order from unique timestamps:', {
      uniqueTimestamps: sortedTimestamps.length,
      totalKeys: Object.keys(handRaisedOrder).length,
      orderMap
    })

    return orderMap
  }, [handRaisedOrder])

  /**
   * Clean up hand raised state for a participant who left
   * Removes entries for all possible IDs and recalculates order numbers
   *
   * @param participantId - Custom participant ID (database ID)
   * @param peerId - RTK peer ID
   * @param userId - RTK user ID
   */
  const cleanupParticipantHandState = useCallback((participantId: string, peerId?: string, userId?: string) => {
    rtkDebug.log('[RTK] 🧹 Cleaning up hand state for departed participant:', {
      participantId,
      peerId,
      userId
    })

    // Clean up remoteHandsRaised state
    setRemoteHandsRaised(prev => {
      const updated = { ...prev }
      let hadRaisedHand = false

      // Remove all entries for this participant
      if (peerId && updated[peerId]) {
        delete updated[peerId]
        hadRaisedHand = true
      }
      if (userId && updated[userId]) {
        delete updated[userId]
        hadRaisedHand = true
      }
      if (updated[participantId]) {
        delete updated[participantId]
        hadRaisedHand = true
      }

      if (hadRaisedHand) {
        rtkDebug.log('[RTK] 🧹 Removed raised hand state:', {
          participantId,
          removedIds: { peerId, userId, customId: participantId },
          remainingHandsRaised: updated
        })
      }

      return updated
    })

    // Clean up handRaisedOrder state and recalculate order numbers
    setHandRaisedOrder(prev => {
      const updated = { ...prev }
      let hadRaisedHand = false

      rtkDebug.log('[RTK] 🔍 CLEANUP BEFORE deletion:', {
        prevKeys: Object.keys(prev),
        prevEntries: prev,
        willDelete: { peerId, userId, customId: participantId }
      })

      // Remove all entries for this participant
      if (peerId && updated[peerId]) {
        delete updated[peerId]
        hadRaisedHand = true
      }
      if (userId && updated[userId]) {
        delete updated[userId]
        hadRaisedHand = true
      }
      if (updated[participantId]) {
        delete updated[participantId]
        hadRaisedHand = true
      }

      if (!hadRaisedHand) {
        // Participant didn't have a raised hand, no need to recalculate
        return updated
      }

      rtkDebug.log('[RTK] 🔍 CLEANUP AFTER deletion:', {
        updatedKeys: Object.keys(updated),
        updatedEntries: updated
      })

      // Recalculate order numbers for remaining hands (preserve timestamp order)
      const uniqueEntries = new Map<number, { order: number; timestamp: number }>()
      Object.values(updated).forEach(entry => {
        if (!uniqueEntries.has(entry.timestamp)) {
          uniqueEntries.set(entry.timestamp, entry)
        }
      })

      rtkDebug.log('[RTK] 🔍 CLEANUP unique timestamps:', {
        uniqueCount: uniqueEntries.size,
        timestamps: Array.from(uniqueEntries.keys())
      })

      // Sort by timestamp and reassign sequential order numbers
      const sortedEntries = Array.from(uniqueEntries.entries()).sort((a, b) => a[0] - b[0])
      sortedEntries.forEach(([timestamp], index) => {
        const newOrder = index + 1
        // Update all entries with this timestamp
        Object.keys(updated).forEach(key => {
          if (updated[key].timestamp === timestamp) {
            rtkDebug.log('[RTK] 🔍 CLEANUP updating key:', {
              key,
              timestamp,
              newOrder,
              oldOrder: updated[key].order
            })
            updated[key] = { ...updated[key], order: newOrder }
          }
        })
      })

      rtkDebug.log('[RTK] 🧹 Recalculated order after participant left:', {
        participantId,
        remainingCount: uniqueEntries.size,
        finalEntries: updated
      })

      return updated
    })
  }, [])

  return {
    emitSocketEvent,
    toggleRaiseHand,
    sendReaction,
    cleanupParticipantHandState,
    handRaised,
    remoteHandsRaised,
    handRaisedOrder: calculatedOrder
  }
}
