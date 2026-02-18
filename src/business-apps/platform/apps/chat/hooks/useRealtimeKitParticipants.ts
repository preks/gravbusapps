/**
 * useRealtimeKitParticipants Hook
 *
 * Manages participant list, remote streams, and participant invitations for RealtimeKit calls.
 * Tracks both local and remote participants, their media states, and provides invite functionality.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { GroupCallParticipant } from '../services/groupWebrtcClient'
import type { CallParticipant, CallType } from '../services/webrtcClient'
import type { PendingInvite } from '../services/callTypes'

export interface UseRealtimeKitParticipantsOptions {
  meeting: any // RealtimeKit meeting object
  wsClient: any // ChatWebSocketClient
  roomId: string | null
  meetingId: string | null // Backend meeting ID for invites
  callType: CallType
  currentUser: CallParticipant | null
  localStream: MediaStream | null
  callStatus: 'idle' | 'setup' | 'joining' | 'connected' | 'reconnecting' | 'ended'
  emitSocketEvent: (event: string, data: any) => void
  cleanupParticipantHandState?: (participantId: string, peerId?: string, userId?: string) => void
  calendarMeetingId?: string | null // Calendar meeting ID for AI transcription
}

export interface UseRealtimeKitParticipantsReturn {
  participants: GroupCallParticipant[]
  remoteStreams: Map<string, MediaStream>
  pendingInvites: Map<string, PendingInvite>
  inviteToCall: (
    participants: CallParticipant[],
    conversationName?: string,
    overrideMeetingId?: string,
    overrideRoomId?: string,
    overrideCallType?: 'audio' | 'video',
    overrideCalendarMeetingId?: string | null
  ) => void
  addPendingInvites: (participants: CallParticipant[]) => void
  reconnectParticipant: (participantId: string) => Promise<void>
  handleDeclinedInvite: (participantId: string, status?: 'declined' | 'not-answered') => void
}

/**
 * Hook to manage participants in a RealtimeKit call
 *
 * Responsibilities:
 * - Track active participants (local + remote)
 * - Create MediaStreams from remote participant tracks
 * - Manage pending invitations
 * - Provide invite functionality
 * - Handle participant join/leave events from SDK
 *
 * @param options - Configuration options
 * @returns Participant state and management functions
 */
export const useRealtimeKitParticipants = ({
  meeting,
  // wsClient - not used
  roomId,
  meetingId,
  callType,
  currentUser,
  localStream,
  callStatus,
  emitSocketEvent,
  cleanupParticipantHandState,
  calendarMeetingId
}: UseRealtimeKitParticipantsOptions): UseRealtimeKitParticipantsReturn => {
  const [participants, setParticipants] = useState<GroupCallParticipant[]>([])
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [pendingInvites, setPendingInvites] = useState<Map<string, PendingInvite>>(new Map())

  // Track previous participants to detect who left (store full info for cleanup and re-invite)
  const previousParticipantsRef = useRef<
    Map<string, { peerId: string; userId?: string; customParticipantId?: string; name?: string; picture?: string }>
  >(new Map())

  // Clear pending invites and previous-participants ref when the call ends so the next call
  // does not show participants from the previous call (e.g. users invited via "Not in this meeting" who left)
  useEffect(() => {
    if (callStatus === 'ended' || callStatus === 'idle') {
      setPendingInvites(new Map())
      previousParticipantsRef.current.clear()
    }
  }, [callStatus])

  /**
   * Invite participants to the current call
   * Broadcasts invitation via WebSocket
   */
  const inviteToCall = useCallback(
    (
      participantsToInvite: CallParticipant[],
      conversationName?: string,
      overrideMeetingId?: string,
      overrideRoomId?: string,
      overrideCallType?: 'audio' | 'video'
    ) => {
      // Use override values if provided (for initial call start), otherwise use hook's values
      const effectiveMeetingId = overrideMeetingId || meetingId
      const effectiveRoomId = overrideRoomId || roomId
      const effectiveCallType = overrideCallType || callType

      if (!effectiveRoomId || !currentUser || !effectiveMeetingId) {
        return
      }

      // Add participants to pending invites for UI tracking
      // ONLY add if they're NOT already in the call
      const now = Date.now()
      const activeParticipantIds = new Set(participants.map(p => p.odId))

      setPendingInvites(prev => {
        const updated = new Map(prev)
        for (const p of participantsToInvite) {
          // Skip if already in call
          if (activeParticipantIds.has(p.odId)) {
            continue
          }

          updated.set(p.odId, {
            id: p.odId,
            odId: p.odId,
            odName: p.odName,
            avatarUrl: p.avatarUrl,
            invitedAt: now,
            status: 'pending'
          })
        }
        return updated
      })

      // Dedupe identical invite/start emits (double click / double handler safety)
      const emitKey = `${effectiveRoomId}:${effectiveMeetingId}:${effectiveCallType}:${participantsToInvite
        .map(p => p.id)
        .sort()
        .join(',')}`
      ;(globalThis as any).__RTK_LAST_INVITE_EMIT__ = (globalThis as any).__RTK_LAST_INVITE_EMIT__ || {}
      const lastEmit = (globalThis as any).__RTK_LAST_INVITE_EMIT__[emitKey] as number | undefined
      const emitNow = Date.now()
      if (lastEmit && emitNow - lastEmit < 3000) {
        return
      }
      ;(globalThis as any).__RTK_LAST_INVITE_EMIT__[emitKey] = emitNow

      emitSocketEvent('rtk-group-call:start', {
        conversationId: effectiveRoomId,
        meetingId: effectiveMeetingId, // Use actual backend meeting ID, not roomId
        callType: effectiveCallType,
        from: {
          id: currentUser.id,
          odId: currentUser.odId,
          odName: currentUser.odName,
          avatarUrl: currentUser.avatarUrl
        },
        participants: participantsToInvite,
        conversationName
      })
    },
    [emitSocketEvent, roomId, meetingId, callType, currentUser, participants, calendarMeetingId]
  )

  /**
   * Add participants to pending invites without sending WebSocket event
   * Used when starting a call to populate the UI before invites are sent
   */
  const addPendingInvites = useCallback(
    (participantsToAdd: CallParticipant[]) => {
      const now = Date.now()
      const activeParticipantIds = new Set(participants.map(p => p.odId))

      setPendingInvites(prev => {
        const updated = new Map(prev)
        for (const p of participantsToAdd) {
          // Skip if already in call
          if (activeParticipantIds.has(p.odId)) {
            continue
          }

          updated.set(p.odId, {
            id: p.odId,
            odId: p.odId,
            odName: p.odName,
            avatarUrl: p.avatarUrl,
            invitedAt: now,
            status: 'pending'
          })
        }
        return updated
      })
    },
    [participants]
  )

  /**
   * Reconnect participant (not applicable for RealtimeKit SFU)
   * SFU handles reconnections automatically
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature required by participants hook API
  const reconnectParticipant = useCallback(async (_participantId: string): Promise<void> => {
    // SFU handles reconnections automatically
  }, [])

  /**
   * Update participant list from SDK
   * Creates MediaStreams from participant tracks and updates state
   */
  const updateParticipantList = useCallback(() => {
    if (!meeting?.participants?.joined) {
      return
    }

    const newRemoteStreams = new Map<string, MediaStream>()
    const newParticipants: GroupCallParticipant[] = []
    const seenParticipantIds = new Set<string>() // Dedupe by customParticipantId
    const allPeerStableIds = new Set<string>() // Track ALL peer IDs for cleanup (even without tracks)

    // Get all remote participants from SDK
    const joined = meeting.participants.joined
    const allParticipants = typeof joined.toArray === 'function' ? joined.toArray() : Array.from(joined.values())

    // Filter out self to get remote peers
    const remotePeers = allParticipants.filter((p: any) => p.id !== meeting.self?.id)

    // Build map of current participants with full ID info
    const currentParticipants = new Map<
      string,
      { peerId: string; userId?: string; customParticipantId?: string; name?: string; picture?: string }
    >()
    remotePeers.forEach((p: any) => {
      currentParticipants.set(p.id, {
        peerId: p.id,
        userId: p.userId,
        customParticipantId: p.customParticipantId,
        name: p.name,
        picture: p.picture
      })
    })

    // Detect participants who left by comparing with previous state
    const leftPeerIds = Array.from(previousParticipantsRef.current.keys()).filter(
      (id: string) => !currentParticipants.has(id)
    )

    // Add left participants to pending invites so they remain visible
    if (leftPeerIds.length > 0) {
      leftPeerIds.forEach(leftPeerId => {
        const leftParticipantInfo = previousParticipantsRef.current.get(leftPeerId)
        if (leftParticipantInfo) {
          const stableId = leftParticipantInfo.customParticipantId || leftPeerId

          setPendingInvites(prev => {
            const updated = new Map(prev)
            updated.set(stableId, {
              id: stableId,
              odId: stableId,
              odName: leftParticipantInfo.name || leftParticipantInfo.userId || 'Unknown',
              avatarUrl: leftParticipantInfo.picture,
              invitedAt: Date.now(),
              status: 'left'
            })
            return updated
          })
        }
      })
    }

    // Clean up hand state for participants who left
    if (leftPeerIds.length > 0 && cleanupParticipantHandState) {
      leftPeerIds.forEach(leftPeerId => {
        const leftParticipantInfo = previousParticipantsRef.current.get(leftPeerId)
        if (leftParticipantInfo) {
          cleanupParticipantHandState(
            leftParticipantInfo.customParticipantId || leftPeerId,
            leftParticipantInfo.peerId,
            leftParticipantInfo.userId
          )
        }
      })
    }

    // Update previous participants ref for next comparison
    previousParticipantsRef.current = currentParticipants

    // Create MediaStreams for each remote participant
    remotePeers.forEach((peer: any) => {
      // Use customParticipantId for deduplication (stable user ID)
      const stableId = peer.customParticipantId || peer.id

      // Track this peer for cleanup (even if they have no tracks yet)
      allPeerStableIds.add(stableId)

      // Skip if we've already processed this participant
      if (seenParticipantIds.has(stableId)) {
        return
      }

      seenParticipantIds.add(stableId)

      const stream = new MediaStream()

      // Add video track if available
      if (peer.videoTrack) {
        stream.addTrack(peer.videoTrack)
      }

      // Add audio track if available
      if (peer.audioTrack) {
        stream.addTrack(peer.audioTrack)
      }

      // Only add participant if they have tracks
      if (stream.getTracks().length > 0) {
        // Use SDK peer.id for stream mapping (session-specific)
        // but use stableId for participant identity
        newRemoteStreams.set(peer.id, stream)

        newParticipants.push({
          id: stableId,
          odId: stableId,
          odName: peer.name || 'Unknown',
          avatarUrl: peer.picture,
          stream
        })
      }
    })

    setRemoteStreams(newRemoteStreams)

    // Add local participant to list
    if (currentUser) {
      setParticipants([
        {
          ...currentUser,
          stream: localStream || undefined
        },
        ...newParticipants
      ])
    } else {
      setParticipants(newParticipants)
    }

    // Clean up pending invites for anyone who's now in the call
    setPendingInvites(prev => {
      const updated = new Map(prev)
      let hasChanges = false

      // Remove current user from pending invites
      if (currentUser && prev.has(currentUser.odId)) {
        updated.delete(currentUser.odId)
        hasChanges = true
      }

      // Remove any active participants from pending invites (including those without tracks yet)
      allPeerStableIds.forEach(stableId => {
        if (prev.has(stableId)) {
          updated.delete(stableId)
          hasChanges = true
        }
      })

      return hasChanges ? updated : prev
    })
  }, [meeting, currentUser, localStream, cleanupParticipantHandState])

  /**
   * Listen to SDK participant events and update list
   * Handles participantJoined and participantLeft events
   */
  useEffect(() => {
    if (!meeting || callStatus !== 'connected') {
      return
    }

    const joined = meeting.participants?.joined
    if (!joined || typeof joined.on !== 'function') {
      return
    }

    const handleParticipantJoined = (event: any) => {
      const participant = event?.participant
      // Use the same stableId logic as updateParticipantList
      const stableId = participant?.customParticipantId || participant?.id

      // Remove from pending invites when they join
      if (stableId) {
        setPendingInvites(prev => {
          if (prev.has(stableId)) {
            const updated = new Map(prev)
            updated.delete(stableId)
            return updated
          }
          return prev
        })
      }

      updateParticipantList()
    }

    const handleParticipantLeft = (event: any) => {
      const leavingParticipant = event?.participant
      const stableId = leavingParticipant?.customParticipantId || leavingParticipant?.id

      // Add them to pending invites with "left" status so they remain visible and can be re-invited
      if (stableId && leavingParticipant) {
        setPendingInvites(prev => {
          const updated = new Map(prev)
          updated.set(stableId, {
            id: stableId,
            odId: stableId,
            odName: leavingParticipant.name || 'Unknown',
            avatarUrl: leavingParticipant.picture,
            invitedAt: Date.now(),
            status: 'left' // New status to indicate they left the call
          })
          return updated
        })
      }

      // updateParticipantList will detect who left and clean up their hand state
      updateParticipantList()
    }

    // Attach event listeners
    joined.on('participantJoined', handleParticipantJoined)
    joined.on('participantLeft', handleParticipantLeft)

    // Initial update
    updateParticipantList()

    return () => {
      if (typeof joined?.off === 'function') {
        joined.off('participantJoined', handleParticipantJoined)
        joined.off('participantLeft', handleParticipantLeft)
      }
    }
  }, [meeting, callStatus, updateParticipantList])

  /**
   * Handle declined invite by updating the status.
   * Lookup uses participantId (backend may send odId or internal id); we key by odId so we try
   * direct key first, then find by invite.id or invite.odId for compatibility.
   */
  const handleDeclinedInvite = useCallback(
    (participantId: string, status: 'declined' | 'not-answered' = 'declined') => {
      setPendingInvites(prev => {
        const newMap = new Map(prev)
        const invite = newMap.get(participantId)
        if (invite) {
          newMap.set(participantId, { ...invite, status })
        } else {
          for (const [key, inv] of newMap) {
            if (inv.id === participantId || inv.odId === participantId) {
              newMap.set(key, { ...inv, status })
              break
            }
          }
        }
        return newMap
      })
    },
    []
  )

  return {
    participants,
    remoteStreams,
    pendingInvites,
    inviteToCall,
    addPendingInvites,
    reconnectParticipant,
    handleDeclinedInvite
  }
}
