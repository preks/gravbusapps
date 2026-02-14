/**
 * RealtimeKit meeting and remote peers for GroupCallModalRtk (selectors + stable list).
 */

import { useMemo } from 'react'
import { useRealtimeKitSelector } from '@cloudflare/realtimekit-react'
import { rtkDebug } from '../../utils/rtkDebug'
import { globalCallManager } from '../../services/globalCallManager'
import { isVideoTrackScreenShare, extractTracksFromCollection } from '../../utils/callUtils'
import type { GroupCallModalRtkProps } from '../../components/call/groupCallModalTypes'
import type { GroupCallParticipant } from '../../services/groupWebrtcClient'

export function useGroupCallModalPeersAndMeeting(props: GroupCallModalRtkProps) {
  const { callState, participants, currentUserId } = props

  const meeting = useRealtimeKitSelector((m: any) => m)

  const currentParticipant = participants.find(
    p => p.id === currentUserId || p.id === meeting?.self?.customParticipantId
  )

  const globalMeetingId = ((globalCallManager.getCallData().callState as any)?.meetingId as string | null) || null

  const effectiveLocalIsMuted =
    meeting?.self?.audioEnabled !== undefined ? meeting.self.audioEnabled === false : callState.isMuted
  const effectiveLocalIsVideoEnabled =
    meeting?.self?.videoEnabled !== undefined ? meeting.self.videoEnabled : callState.isVideoEnabled

  const remotePeers: GroupCallParticipant[] = useRealtimeKitSelector((m: any): GroupCallParticipant[] => {
    if (!m?.participants?.joined || !m?.self?.roomJoined) return []
    try {
      const joined = Array.from(m.participants.joined.values())
      const localId = m.self?.id
      const localUserId = m.self?.userId
      const localCustomId = m.self?.customParticipantId

      const peers = joined.filter((p: any) => {
        if (p.id === localId) return false
        if (localUserId && p.userId === localUserId) return false
        if (localCustomId && p.customParticipantId === localCustomId) return false
        return true
      }) as GroupCallParticipant[]

      const seenStableIds = new Set<string>()
      const dedupedPeers = peers.filter((peer: any) => {
        const stableId = peer.customParticipantId || peer.userId || peer.id
        if (seenStableIds.has(stableId)) {
          rtkDebug.log(`[RTK Modal] ⚠️ Duplicate participant filtered in selector:`, {
            peerId: peer.id,
            stableId,
            peerName: peer.name
          })
          return false
        }
        seenStableIds.add(stableId)
        return true
      })

      dedupedPeers.forEach((peer: any) => {
        if (peer.screenShareEnabled) {
          rtkDebug.log(`[RTK Modal] Remote peer ${peer.name || peer.id} screen share ACTIVE:`, {
            screenShareEnabled: peer.screenShareEnabled,
            screenShareTracks: peer.screenShareTracks,
            screenShareTracksType: typeof peer.screenShareTracks,
            videoTrackLabel: peer.videoTrack?.label
          })
        }
      })

      return dedupedPeers
    } catch {
      return []
    }
  })

  const localScreenShareTrack = useRealtimeKitSelector((m: any) => {
    if (!m?.self || !m?.self?.roomJoined) return null

    const screenShareTracks = extractTracksFromCollection(m.self.screenShareTracks)
    if (screenShareTracks.length > 0) {
      rtkDebug.log('[RTK Modal] 📺 Local screen share tracks found:', {
        count: screenShareTracks.length,
        trackIds: screenShareTracks.map(t => t.id),
        trackLabels: screenShareTracks.map(t => t.label),
        trackKinds: screenShareTracks.map(t => t.kind),
        rawType: typeof m.self.screenShareTracks,
        rawIsArray: Array.isArray(m.self.screenShareTracks),
        rawIsMap: m.self.screenShareTracks instanceof Map,
        rawIsSet: m.self.screenShareTracks instanceof Set,
        rawKeys: m.self.screenShareTracks ? Object.keys(m.self.screenShareTracks) : []
      })

      const videoTrack = screenShareTracks.find(t => t.kind === 'video' && t.readyState === 'live')
      if (videoTrack) {
        rtkDebug.log('[RTK Modal] ✅ Found live VIDEO track for screen share:', {
          trackId: videoTrack.id,
          trackLabel: videoTrack.label,
          trackKind: videoTrack.kind,
          readyState: videoTrack.readyState
        })
        return videoTrack
      }

      const firstLiveTrack = screenShareTracks.find(t => t.readyState === 'live')
      if (firstLiveTrack) {
        rtkDebug.warn('[RTK Modal] ⚠️ No live video track found in screenShareTracks, using first live track:', {
          firstTrack: firstLiveTrack.kind,
          readyState: firstLiveTrack.readyState
        })
        return firstLiveTrack
      }
      rtkDebug.warn('[RTK Modal] ⚠️ All local screen share tracks have ended')
    }

    if (m.self.videoTrack && isVideoTrackScreenShare(m.self.videoTrack) && m.self.videoTrack.readyState === 'live') {
      return m.self.videoTrack
    }

    return null
  })

  const effectiveLocalIsScreenSharing =
    meeting?.self?.screenShareEnabled === true ||
    (localScreenShareTrack?.readyState === 'live' && !!localScreenShareTrack)

  const remotePeersFingerprint = remotePeers
    .map(
      (p: any) =>
        `${p.id}-${p.videoTrack?.id}-${p.audioTrack?.id}-${p.videoEnabled}-${p.audioEnabled}-${p.screenShareEnabled}`
    )
    .join('|')

  const stableRemotePeers = useMemo(() => {
    const isConnected = callState.status === 'connected' || callState.status === 'joining'
    const isRoomJoined = meeting?.self?.roomJoined

    if (!isConnected || !isRoomJoined) {
      rtkDebug.log('[RTK Modal] 🚫 Not showing participants - call not active', {
        callStatus: callState.status,
        isRoomJoined
      })
      return []
    }

    const isTestMode = participants.length > remotePeers.length + 1

    if (isTestMode) {
      const localId = meeting?.self?.id
      const localUserId = meeting?.self?.userId
      const localCustomId = meeting?.self?.customParticipantId

      const testRemotePeers = participants.filter((p: any) => {
        if (p.id === localId) return false
        if (localUserId && (p.userId === localUserId || p.id === localUserId)) return false
        if (localCustomId && (p.customParticipantId === localCustomId || p.id === localCustomId)) return false
        if (currentUserId && (p.id === currentUserId || p.userId === currentUserId)) return false
        return true
      })

      rtkDebug.log('[RTK Modal] 🧪 TEST MODE: Using test participants', {
        testParticipantsCount: testRemotePeers.length,
        sdkPeersCount: remotePeers.length,
        totalParticipantsProp: participants.length
      })

      return testRemotePeers
    }

    return [...remotePeers]
  }, [
    remotePeersFingerprint,
    participants,
    meeting?.self?.id,
    meeting?.self?.userId,
    meeting?.self?.customParticipantId,
    meeting?.self?.roomJoined,
    currentUserId,
    remotePeers.length,
    callState.status
  ])

  return {
    meeting,
    currentParticipant,
    globalMeetingId,
    effectiveLocalIsMuted,
    effectiveLocalIsVideoEnabled,
    remotePeers,
    localScreenShareTrack,
    effectiveLocalIsScreenSharing,
    stableRemotePeers
  }
}
