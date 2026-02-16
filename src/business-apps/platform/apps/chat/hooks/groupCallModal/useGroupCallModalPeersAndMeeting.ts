/**
 * RealtimeKit meeting and remote peers for GroupCallModalRtk (selectors + stable list).
 */

import { useMemo } from 'react'
import { useRealtimeKitSelector } from '@cloudflare/realtimekit-react'
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
        return (
          p.id !== localId &&
          (!localUserId || p.userId !== localUserId) &&
          (!localCustomId || p.customParticipantId !== localCustomId)
        )
      }) as GroupCallParticipant[]

      const seenStableIds = new Set<string>()
      const dedupedPeers = peers.filter((peer: any) => {
        const stableId = peer.customParticipantId || peer.userId || peer.id
        if (!seenStableIds.has(stableId)) {
          seenStableIds.add(stableId)
          return true
        }
        return false
      })

      return dedupedPeers
    } catch {
      return []
    }
  })

  const localScreenShareTrack = useRealtimeKitSelector((m: any) => {
    if (!m?.self?.roomJoined) return null

    const screenShareTracks = extractTracksFromCollection(m.self.screenShareTracks)
    if (screenShareTracks.length > 0) {
      const videoTrack = screenShareTracks.find(t => t.kind === 'video' && t.readyState === 'live')
      if (videoTrack) return videoTrack
      const firstLiveTrack = screenShareTracks.find(t => t.readyState === 'live')
      if (firstLiveTrack) return firstLiveTrack
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
