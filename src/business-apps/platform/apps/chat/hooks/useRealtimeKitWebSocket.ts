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

export interface UseRealtimeKitWebSocketOptions {
  wsClient: ChatWebSocketClient | null
  roomId: string | null
  meetingId: string | null
  currentUser: CallParticipant | null
  meeting: any // RealtimeKitMeeting instance for auto-mute
  onHandUpdate?: (participantId: string, handRaised: boolean) => void
  onReactionReceived?: (reaction: { participantId: string; participantName: string; emoji: string }) => void
  onMuteRequested?: (requestedByName: string) => void
  translate?: (key: string, params?: Record<string, any>) => string
  // Initial state for restoring from globalCallManager after minimize/maximize
  initialHandRaised?: boolean
  initialRemoteHandsRaised?: Record<string, boolean>
  initialHandRaisedOrder?: Record<string, { order: number; timestamp: number }>
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
  onMuteRequested,
  translate,
  initialHandRaised = false,
  initialRemoteHandsRaised = {},
  initialHandRaisedOrder = {}
}: UseRealtimeKitWebSocketOptions): UseRealtimeKitWebSocketReturn => {
  // Track hand raised states and order
  // CRITICAL: Prioritize SDK state over restored state (SDK is source of truth for active calls)
  // Restored state is only used as fallback when SDK is not available yet
  const [handRaised, setHandRaised] = useState(() => {
    // If SDK is available and has hand state, use it (highest priority)
    if (meeting?.self?.handRaised !== undefined) {
      return meeting.self.handRaised
    }
    // Otherwise use restored state if available
    return initialHandRaised
  })

  const [remoteHandsRaised, setRemoteHandsRaised] = useState<Record<string, boolean>>(initialRemoteHandsRaised)
  const [handRaisedOrder, setHandRaisedOrder] =
    useState<Record<string, { order: number; timestamp: number }>>(initialHandRaisedOrder)

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
      if (!meetingId || !currentUser) {
        return currentHandRaised
      }

      try {
        const newHandRaisedState = !currentHandRaised

        // Mark that user intentionally toggled their hand
        userIntentionallyToggledRef.current = true

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
      } catch {
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
      if (!meetingId || !currentUser) {
        return
      }

      try {
        // Send WebSocket event to broadcast reaction
        // CRITICAL: Must use meetingId (not conversationId) to match the Socket.IO room clients are joined to
        emitSocketEvent('group-call:send-reaction', {
          roomId: meetingId,
          participantId: currentUser.id,
          participantName: currentUser.odName,
          emoji
        })
      } catch {
        // Best-effort; no replacement logging per plan
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

    const socket = wsClient?.getSocket()
    if (!socket || !meetingId || !currentUser) {
      return
    }

    // Handle raise hand state updates
    const handleHandUpdate = (data: { participantId: string; handRaised: boolean; timestamp?: number }) => {
      // CRITICAL: Prevent spurious hand-raised events on join (only for local user)
      // If local user hasn't explicitly toggled their hand AND it's within 500ms of joining,
      // AND the event is trying to raise their hand → ignore it (likely backend sending stale state)
      const isLocalUser = data.participantId === currentUser?.id
      const isWithinGracePeriod = Date.now() - joinTimeRef.current < 500
      const hasNotToggledYet = !userIntentionallyToggledRef.current

      if (isLocalUser && data.handRaised && isWithinGracePeriod && hasNotToggledYet) {
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
        setHandRaised(data.handRaised)
      } else {
        setRemoteHandsRaised(prev => {
          const updated = { ...prev }
          if (participantPeerId) updated[participantPeerId] = data.handRaised
          if (participantUserId) updated[participantUserId] = data.handRaised
          if (participantCustomId) updated[participantCustomId] = data.handRaised
          return updated
        })
      }

      // Update hand raise order tracking (store under all IDs like remoteHandsRaised)
      setHandRaisedOrder(prev => {
        if (data.handRaised) {
          const updated = { ...prev }
          if (participantPeerId) delete updated[participantPeerId]
          if (participantUserId) delete updated[participantUserId]
          if (participantCustomId) delete updated[participantCustomId]

          const allTimestamps = new Set<number>()
          Object.values(updated).forEach(entry => allTimestamps.add(entry.timestamp))
          const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)
          const order = sortedTimestamps.length + 1

          const orderData = { order, timestamp }
          if (participantPeerId) updated[participantPeerId] = orderData
          if (participantUserId) updated[participantUserId] = orderData
          if (participantCustomId) updated[participantCustomId] = orderData
          return updated
        } else {
          const updated = { ...prev }
          if (participantPeerId) delete updated[participantPeerId]
          if (participantUserId) delete updated[participantUserId]
          if (participantCustomId) delete updated[participantCustomId]

          const uniqueEntries = new Map<number, { order: number; timestamp: number }>()
          Object.values(updated).forEach(entry => {
            if (!uniqueEntries.has(entry.timestamp)) {
              uniqueEntries.set(entry.timestamp, entry)
            }
          })

          const sortedEntries = Array.from(uniqueEntries.entries()).sort((a, b) => a[0] - b[0])
          sortedEntries.forEach(([ts], index) => {
            const newOrder = index + 1
            Object.keys(updated).forEach(key => {
              if (updated[key].timestamp === ts) {
                updated[key] = { ...updated[key], order: newOrder }
              }
            })
          })

          return updated
        }
      })

      // Notify parent if callback provided
      onHandUpdate?.(data.participantId, data.handRaised)
    }

    // Handle initial participant states sync (received when joining a call)
    const handleSyncParticipantStates = (data: {
      roomId: string
      participantStates: Array<{ participantId: string; handRaised: boolean }>
    }) => {
      if (!currentUser) {
        return
      }

      const newRemoteHandsRaised: Record<string, boolean> = {}
      const newHandRaisedOrder: Record<string, { order: number; timestamp: number }> = {}
      const baseTimestamp = Date.now()

      let newLocalHandRaised: boolean | undefined

      data.participantStates.forEach((state, index) => {
        const isLocal = state.participantId === currentUser.id
        if (isLocal) {
          newLocalHandRaised = state.handRaised
        }

        // Resolve ALL possible IDs for this participant (same logic as handleHandUpdate)
        let participantPeerId: string | undefined
        let participantUserId: string | undefined
        let participantCustomId: string | undefined = state.participantId

        if (isLocal) {
          participantPeerId = meeting?.self?.id
          participantUserId = meeting?.self?.userId
          participantCustomId = meeting?.self?.customParticipantId || currentUser.id
        } else if (meeting?.participants?.joined) {
          const joined = Array.from(meeting.participants.joined.values())
          const matchingPeer: any = joined.find(
            (p: any) =>
              p.customParticipantId === state.participantId ||
              p.userId === state.participantId ||
              p.id === state.participantId
          )
          if (matchingPeer) {
            participantPeerId = matchingPeer.id
            participantUserId = matchingPeer.userId
            participantCustomId = matchingPeer.customParticipantId
          }
        }

        // Store hand raised state under all possible keys (remote only)
        if (!isLocal) {
          if (participantPeerId) newRemoteHandsRaised[participantPeerId] = state.handRaised
          if (participantUserId) newRemoteHandsRaised[participantUserId] = state.handRaised
          if (participantCustomId) newRemoteHandsRaised[participantCustomId] = state.handRaised
        }

        // Store hand raised order (index + 1 for 1-based order) for ALL participants (including local)
        if (state.handRaised) {
          const orderData = { order: index + 1, timestamp: baseTimestamp + index }
          if (participantPeerId) newHandRaisedOrder[participantPeerId] = orderData
          if (participantUserId) newHandRaisedOrder[participantUserId] = orderData
          if (participantCustomId) newHandRaisedOrder[participantCustomId] = orderData
        }
      })

      // Update state with synced data (authoritative replace)
      if (newLocalHandRaised !== undefined) {
        setHandRaised(newLocalHandRaised)
      }
      setRemoteHandsRaised(newRemoteHandsRaised)
      setHandRaisedOrder(newHandRaisedOrder)
    }

    // Listen for events
    socket.on('group-call:hand-update', handleHandUpdate)
    socket.on('group-call:sync-participant-states', handleSyncParticipantStates)

    return () => {
      socket.off('group-call:hand-update', handleHandUpdate)
      socket.off('group-call:sync-participant-states', handleSyncParticipantStates)
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
      onReactionReceived({
        participantId: data.participantId,
        participantName: data.participantName,
        emoji: data.emoji
      })
    }

    socket.on('group-call:reaction-received', handleReactionReceived)

    return () => {
      socket.off('group-call:reaction-received', handleReactionReceived)
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

    const socket = wsClient?.getSocket()
    if (!socket || !meetingId) {
      return
    }

    const handleMuteRequested = (data: { requestedBy: string; requestedByName: string }) => {
      try {
        if (meeting?.self?.disableAudio) {
          meeting.self.disableAudio()

          // Show toast notification
          const message = translate
            ? translate('participants-muted-by', { name: data.requestedByName })
            : `You were muted by ${data.requestedByName}`
          toast.info(message, {
            duration: 3000
          })
        }

        onMuteRequested?.(data.requestedByName)
      } catch {
        const errorMessage = translate ? translate('participants-mute-failed') : 'Failed to mute your microphone'
        toast.error(errorMessage, {
          duration: 3000
        })
      }
    }

    socket.on('group-call:mute-requested', handleMuteRequested)

    return () => {
      socket.off('group-call:mute-requested', handleMuteRequested)
    }
  }, [wsClient, meetingId, meeting, onMuteRequested, translate])

  /**
   * Set up WebSocket event listener for mute-all requests
   * Auto-mutes the local participant when mute-all is requested
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

    const handleMuteAllRequested = (data: {
      requestedBy: string
      requestedByName: string
      conversationId: string
      meetingId: string
    }) => {
      // Note: Backend already excludes the moderator from receiving this event via .except()
      // So if we're here, we're NOT the moderator who requested it
      try {
        // Auto-mute self via RTK
        if (meeting?.self?.disableAudio) {
          meeting.self.disableAudio()

          const message = translate
            ? translate('participants-muted-by-all', { name: data.requestedByName })
            : `You were muted by ${data.requestedByName} (mute all)`
          toast.info(message, {
            duration: 3000
          })
        }

        onMuteRequested?.(data.requestedByName)
      } catch {
        const errorMessage = translate ? translate('participants-mute-failed') : 'Failed to mute your microphone'
        toast.error(errorMessage, {
          duration: 3000
        })
      }
    }

    socket.on('group-call:mute-all-requested', handleMuteAllRequested)

    return () => {
      socket.off('group-call:mute-all-requested', handleMuteAllRequested)
    }
  }, [wsClient, meetingId, meeting, onMuteRequested, currentUser, translate])

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

        // Remove all entries for this participant
        if (participantPeerId && updated[participantPeerId]) {
          delete updated[participantPeerId]
        }
        if (participantUserId && updated[participantUserId]) {
          delete updated[participantUserId]
        }
        if (participantCustomId && updated[participantCustomId]) {
          delete updated[participantCustomId]
        }

        return updated
      })

      setHandRaisedOrder(prev => {
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

        if (!hadRaisedHand) {
          return updated
        }

        const uniqueEntries = new Map<number, { order: number; timestamp: number }>()
        Object.values(updated).forEach(entry => {
          if (!uniqueEntries.has(entry.timestamp)) {
            uniqueEntries.set(entry.timestamp, entry)
          }
        })

        const sortedEntries = Array.from(uniqueEntries.entries()).sort((a, b) => a[0] - b[0])
        sortedEntries.forEach(([timestamp], index) => {
          const newOrder = index + 1
          Object.keys(updated).forEach(key => {
            if (updated[key].timestamp === timestamp) {
              updated[key] = { ...updated[key], order: newOrder }
            }
          })
        })

        return updated
      })
    }

    socket.on('group-call:participant-left', handleParticipantLeft)

    return () => {
      socket.off('group-call:participant-left', handleParticipantLeft)
    }
  }, [wsClient, meetingId, meeting])

  // Clear hand raise state when roomId changes (new call starts)
  const prevRoomIdRef = useRef<string | null>(null)
  React.useEffect(() => {
    // If roomId changed from a previous value, clear stale hand raise state
    if (prevRoomIdRef.current !== null && prevRoomIdRef.current !== roomId) {
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
    // Clean up remoteHandsRaised state
    setRemoteHandsRaised(prev => {
      const updated = { ...prev }

      // Remove all entries for this participant
      if (peerId && updated[peerId]) {
        delete updated[peerId]
      }
      if (userId && updated[userId]) {
        delete updated[userId]
      }
      if (updated[participantId]) {
        delete updated[participantId]
      }

      return updated
    })

    setHandRaisedOrder(prev => {
      const updated = { ...prev }
      let hadRaisedHand = false

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
        return updated
      }

      const uniqueEntries = new Map<number, { order: number; timestamp: number }>()
      Object.values(updated).forEach(entry => {
        if (!uniqueEntries.has(entry.timestamp)) {
          uniqueEntries.set(entry.timestamp, entry)
        }
      })

      const sortedEntries = Array.from(uniqueEntries.entries()).sort((a, b) => a[0] - b[0])
      sortedEntries.forEach(([timestamp], index) => {
        const newOrder = index + 1
        Object.keys(updated).forEach(key => {
          if (updated[key].timestamp === timestamp) {
            updated[key] = { ...updated[key], order: newOrder }
          }
        })
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
