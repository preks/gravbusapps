/**
 * useRealtimeKitParticipants Hook
 *
 * Manages participant list, remote streams, and participant invitations for RealtimeKit calls.
 * Tracks both local and remote participants, their media states, and provides invite functionality.
 */

import { useState, useCallback, useEffect } from 'react'
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
  emitSocketEvent
}: UseRealtimeKitParticipantsOptions): UseRealtimeKitParticipantsReturn => {
  const [participants, setParticipants] = useState<GroupCallParticipant[]>([])
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [pendingInvites] = useState<Map<string, PendingInvite>>(new Map())

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
    [emitSocketEvent, roomId, meetingId, callType, currentUser]
  )

  /**
   * Reconnect participant (not applicable for RealtimeKit SFU)
   * SFU handles reconnections automatically
   */
  const reconnectParticipant = useCallback(async (participantId: string): Promise<void> => {
    rtkDebug.log('[RTK] Reconnect not needed for RealtimeKit SFU', { participantId })
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

    // Get all remote participants from SDK
    const joined = meeting.participants.joined
    const allParticipants =
      typeof (joined as any).toArray === 'function' ? (joined as any).toArray() : Array.from(joined.values())

    // Filter out self to get remote peers
    const remotePeers = allParticipants.filter((p: any) => p.id !== meeting.self?.id)

    rtkDebug.log('[RTK] Updating participant list', {
      totalParticipants: allParticipants.length,
      remotePeers: remotePeers.length,
      localParticipant: !!meeting.self
    })

    // Create MediaStreams for each remote participant
    remotePeers.forEach((peer: any) => {
      // Use customParticipantId for deduplication (stable user ID)
      const stableId = peer.customParticipantId || peer.id

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
  }, [meeting, currentUser, localStream])

  /**
   * Listen to SDK participant events and update list
   * Handles participantJoined and participantLeft events
   */
  useEffect(() => {
    if (!meeting || callStatus !== 'connected') {
      return
    }

    rtkDebug.log('[RTK] Setting up participant event listeners')

    const joined = meeting.participants?.joined as any
    if (!joined || typeof joined.on !== 'function') {
      rtkDebug.warn('[RTK] Cannot attach participant listeners: SDK not ready')
      return
    }

    const handleParticipantJoined = (event: any) => {
      rtkDebug.log('[RTK] 👤 Participant joined event:', {
        participantId: event?.participant?.id,
        participantName: event?.participant?.name
      })
      updateParticipantList()
    }

    const handleParticipantLeft = (event: any) => {
      rtkDebug.log('[RTK] 👋 Participant left event:', {
        participantId: event?.participant?.id,
        participantName: event?.participant?.name
      })
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

  return {
    participants,
    remoteStreams,
    pendingInvites,
    inviteToCall,
    reconnectParticipant
  }
}
