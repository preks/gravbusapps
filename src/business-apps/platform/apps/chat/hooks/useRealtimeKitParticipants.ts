/**
 * useRealtimeKitParticipants Hook
 *
 * Manages participant list, remote streams, and participant invitations for RealtimeKit calls.
 * Tracks both local and remote participants, their media states, and provides invite functionality.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { GroupCallParticipant } from '../services/groupWebrtcClient'
import type { CallParticipant, CallType } from '../services/webrtcClient'
import type { PendingInvite } from './useGroupCall'
import { rtkDebug } from '../utils/rtkDebug'

export interface UseRealtimeKitParticipantsOptions {
  meeting: any // RealtimeKit meeting object
  wsClient: any // ChatWebSocketClient
  roomId: string | null
  meetingId: string | null // Backend meeting ID for invites
  callType: CallType
  currentUser: CallParticipant | null
  localStream: MediaStream | null
  callStatus: 'idle' | 'joining' | 'connected' | 'reconnecting' | 'ended'
  emitSocketEvent: (event: string, data: any) => void
  cleanupParticipantHandState?: (participantId: string, peerId?: string, userId?: string) => void
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
    overrideCallType?: 'audio' | 'video'
  ) => void
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
  cleanupParticipantHandState
}: UseRealtimeKitParticipantsOptions): UseRealtimeKitParticipantsReturn => {
  const [participants, setParticipants] = useState<GroupCallParticipant[]>([])
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [pendingInvites, setPendingInvites] = useState<Map<string, PendingInvite>>(new Map())

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
        rtkDebug.warn('[RTK] Cannot invite: missing roomId, meetingId, or currentUser', {
          hasRoomId: !!effectiveRoomId,
          hasMeetingId: !!effectiveMeetingId,
          hasCurrentUser: !!currentUser
        })
        return
      }

      rtkDebug.log('[RTK] Inviting participants to call', {
        count: participantsToInvite.length,
        conversationName,
        roomId: effectiveRoomId,
        meetingId: effectiveMeetingId,
        callType: effectiveCallType,
        participants: participantsToInvite.map(p => ({ id: p.id, odId: p.odId, odName: p.odName }))
      })

      // Add participants to pending invites for UI tracking
      // ONLY add if they're NOT already in the call
      const now = Date.now()
      const activeParticipantIds = new Set(participants.map(p => p.odId))

      setPendingInvites(prev => {
        const updated = new Map(prev)
        for (const p of participantsToInvite) {
          // Skip if already in call
          if (activeParticipantIds.has(p.odId)) {
            rtkDebug.log('[RTK] Skipping pending invite - already in call:', p.odId)
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
    [emitSocketEvent, roomId, meetingId, callType, currentUser, participants]
  )

  /**
   * Reconnect participant (not applicable for RealtimeKit SFU)
   * SFU handles reconnections automatically
   */
  const reconnectParticipant = useCallback(async (participantId: string): Promise<void> => {
    rtkDebug.log('[RTK] Reconnect not needed for RealtimeKit SFU', { participantId })
  }, [])

  // Track previous participants to detect who left (store full info for cleanup)
  const previousParticipantsRef = useRef<
    Map<string, { peerId: string; userId?: string; customParticipantId?: string }>
  >(new Map())

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
    const currentParticipants = new Map<string, { peerId: string; userId?: string; customParticipantId?: string }>()
    remotePeers.forEach((p: any) => {
      currentParticipants.set(p.id, {
        peerId: p.id,
        userId: p.userId,
        customParticipantId: p.customParticipantId
      })
    })

    // Detect participants who left by comparing with previous state
    const leftPeerIds = Array.from(previousParticipantsRef.current.keys()).filter(
      (id: string) => !currentParticipants.has(id)
    )

    rtkDebug.log('[RTK] Updating participant list', {
      totalParticipants: allParticipants.length,
      remotePeers: remotePeers.length,
      localParticipant: !!meeting.self,
      previousCount: previousParticipantsRef.current.size,
      currentCount: currentParticipants.size,
      leftCount: leftPeerIds.length,
      leftPeerIds
    })

    // Clean up hand state for participants who left
    if (leftPeerIds.length > 0 && cleanupParticipantHandState) {
      leftPeerIds.forEach(leftPeerId => {
        const leftParticipantInfo = previousParticipantsRef.current.get(leftPeerId)
        if (leftParticipantInfo) {
          rtkDebug.log('[RTK] 🧹 Cleaning up hand state for departed peer:', {
            peerId: leftPeerId,
            participantInfo: leftParticipantInfo
          })
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

      rtkDebug.log('[RTK] Processing peer:', {
        peerId: peer.id,
        customParticipantId: peer.customParticipantId,
        stableId,
        peerName: peer.name,
        hasVideoTrack: !!peer.videoTrack,
        hasAudioTrack: !!peer.audioTrack
      })

      // Skip if we've already processed this participant
      if (seenParticipantIds.has(stableId)) {
        rtkDebug.log('[RTK] ⚠️ Duplicate participant detected, skipping:', {
          peerId: peer.id,
          stableId,
          peerName: peer.name
        })
        return
      }

      seenParticipantIds.add(stableId)

      const stream = new MediaStream()

      // Add video track if available
      if (peer.videoTrack) {
        stream.addTrack(peer.videoTrack)
        rtkDebug.log('[RTK] 📹 Added video track for peer:', peer.id, {
          trackId: peer.videoTrack.id,
          enabled: peer.videoTrack.enabled,
          readyState: peer.videoTrack.readyState
        })
      }

      // Add audio track if available
      if (peer.audioTrack) {
        stream.addTrack(peer.audioTrack)
        rtkDebug.log('[RTK] 🔊 Added audio track for peer:', peer.id, {
          trackId: peer.audioTrack.id,
          enabled: peer.audioTrack.enabled,
          readyState: peer.audioTrack.readyState
        })
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
      } else {
        rtkDebug.log('[RTK] ⚠️ Peer has no tracks, skipping:', peer.id)
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
        rtkDebug.log('[RTK] 🧹 Removed current user from pending invites')
      }

      // Remove any active participants from pending invites (including those without tracks yet)
      allPeerStableIds.forEach(stableId => {
        if (prev.has(stableId)) {
          updated.delete(stableId)
          hasChanges = true
          rtkDebug.log('[RTK] 🧹 Removed active participant from pending invites:', stableId)
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

    rtkDebug.log('[RTK] Setting up participant event listeners')

    const joined = meeting.participants?.joined
    if (!joined || typeof joined.on !== 'function') {
      rtkDebug.warn('[RTK] Cannot attach participant listeners: SDK not ready')
      return
    }

    const handleParticipantJoined = (event: any) => {
      const participant = event?.participant
      // Use the same stableId logic as updateParticipantList
      const stableId = participant?.customParticipantId || participant?.id

      rtkDebug.log('[RTK] 👤 Participant joined event:', {
        participantId: participant?.id,
        participantName: participant?.name,
        customParticipantId: participant?.customParticipantId,
        stableId
      })

      // Remove from pending invites when they join
      if (stableId) {
        setPendingInvites(prev => {
          if (prev.has(stableId)) {
            const updated = new Map(prev)
            updated.delete(stableId)
            rtkDebug.log('[RTK] ✅ Removed from pending invites on join:', stableId)
            return updated
          }
          return prev
        })
      }

      updateParticipantList()
    }

    const handleParticipantLeft = (event: any) => {
      const leavingParticipant = event?.participant
      rtkDebug.log('[RTK] 👋 Participant left event:', {
        participantId: leavingParticipant?.id,
        participantName: leavingParticipant?.name,
        userId: leavingParticipant?.userId,
        customParticipantId: leavingParticipant?.customParticipantId
      })

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
   * Handle declined invite by updating the status
   * This allows the UI to show appropriate status text
   */
  const handleDeclinedInvite = useCallback(
    (participantId: string, status: 'declined' | 'not-answered' = 'declined') => {
      setPendingInvites(prev => {
        const newMap = new Map(prev)
        const invite = newMap.get(participantId)
        if (invite) {
          newMap.set(participantId, { ...invite, status })
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
    reconnectParticipant,
    handleDeclinedInvite
  }
}
