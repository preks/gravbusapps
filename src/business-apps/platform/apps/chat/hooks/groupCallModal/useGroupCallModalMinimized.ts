/**
 * Minimized view: first remote peer, PiP audio, and portal cleanup for GroupCallModalRtk.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { buildStreamFromPeer } from '../../utils/groupCallModalUtils'
import type { GroupCallModalRtkProps, RealtimeKitPeer } from '../../components/call/groupCallModalTypes'

export interface UseGroupCallModalMinimizedParams {
  props: Pick<GroupCallModalRtkProps, 'viewMode'> & { activeSpeakerId?: string | null }
  stableRemotePeers: any[]
  meeting: any
  activeConversation: any
  callStateIsMinimized: boolean
  pipAudioRefs: React.MutableRefObject<Map<string, HTMLAudioElement>>
  applySinkIdToElement: (el: HTMLMediaElement | null, deviceId: string | null) => Promise<void>
  selectedAudioOutputIdRef: React.MutableRefObject<string | null>
}

export function useGroupCallModalMinimized({
  props,
  stableRemotePeers,
  meeting,
  activeConversation,
  callStateIsMinimized,
  pipAudioRefs,
  applySinkIdToElement,
  selectedAudioOutputIdRef
}: UseGroupCallModalMinimizedParams) {
  const { viewMode, activeSpeakerId } = props

  const [debouncedActiveSpeaker, setDebouncedActiveSpeaker] = useState<string | null>(null)
  const activeSpeakerTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (activeSpeakerTimeoutRef.current) {
      clearTimeout(activeSpeakerTimeoutRef.current)
    }
    if (activeSpeakerId) {
      activeSpeakerTimeoutRef.current = setTimeout(() => {
        setDebouncedActiveSpeaker(activeSpeakerId)
      }, 800)
    }
    return () => {
      if (activeSpeakerTimeoutRef.current) {
        clearTimeout(activeSpeakerTimeoutRef.current)
      }
    }
  }, [activeSpeakerId])

  const enrichPeerWithAvatar = useCallback(
    (peer: any) => {
      if (!activeConversation?.participants) return peer
      const conversationParticipant = activeConversation.participants.find(
        (cp: any) =>
          cp.userId === peer.userId ||
          cp.userId === peer.customParticipantId ||
          cp.user?.id === peer.userId ||
          cp.user?.id === peer.customParticipantId
      )
      if (conversationParticipant?.user?.avatarUrl) {
        return { ...peer, avatarUrl: conversationParticipant.user.avatarUrl }
      }
      return peer
    },
    [activeConversation]
  )

  const firstRemotePeer = useMemo(() => {
    if (debouncedActiveSpeaker) {
      const activeSpeaker = stableRemotePeers.find(peer => peer.id === debouncedActiveSpeaker)
      if (activeSpeaker) {
        return enrichPeerWithAvatar(activeSpeaker)
      }
    }
    const firstPeer = stableRemotePeers[0] || null
    return firstPeer ? enrichPeerWithAvatar(firstPeer) : null
  }, [stableRemotePeers, debouncedActiveSpeaker, enrichPeerWithAvatar])

  const remoteAudioTrackIds = useMemo(() => {
    return stableRemotePeers.map(p => (p as RealtimeKitPeer).audioTrack?.id || null).join(',')
  }, [stableRemotePeers])

  const prevAudioTrackIdsRef = useRef<string>('')

  useEffect(() => {
    if (!callStateIsMinimized) {
      pipAudioRefs.current.forEach(audio => {
        audio.pause()
        audio.srcObject = null
      })
      pipAudioRefs.current.clear()
      prevAudioTrackIdsRef.current = ''
      return
    }

    if (prevAudioTrackIdsRef.current === remoteAudioTrackIds) return
    prevAudioTrackIdsRef.current = remoteAudioTrackIds

    stableRemotePeers.forEach(peer => {
      const rtkPeer = peer as RealtimeKitPeer
      if (peer.id === meeting?.self?.id) return

      const peerName = rtkPeer.name || rtkPeer.odName
      const stream = buildStreamFromPeer(rtkPeer)
      if (stream && stream.getAudioTracks().length > 0) {
        const existingAudio = pipAudioRefs.current.get(peer.id)
        if (existingAudio) {
          const oldStream = existingAudio.srcObject as MediaStream
          const oldTrackId = oldStream?.getAudioTracks()[0]?.id
          const newTrackId = stream.getAudioTracks()[0]?.id
          if (oldTrackId !== newTrackId) {
            existingAudio.srcObject = stream
            void applySinkIdToElement(existingAudio, selectedAudioOutputIdRef.current)
            existingAudio.play().catch(err => console.error('[Minimized] Audio play error for', peerName, ':', err))
          }
        } else {
          const audio = document.createElement('audio')
          audio.autoplay = true
          audio.srcObject = stream
          void applySinkIdToElement(audio, selectedAudioOutputIdRef.current)
          audio.play().catch(err => console.error('[Minimized] Audio play error for', peerName, ':', err))
          pipAudioRefs.current.set(peer.id, audio)
        }
      } else if (pipAudioRefs.current.has(peer.id)) {
        const audio = pipAudioRefs.current.get(peer.id)!
        audio.pause()
        audio.srcObject = null
        pipAudioRefs.current.delete(peer.id)
      }
    })

    const currentPeerIds = new Set(stableRemotePeers.map(p => p.id))
    pipAudioRefs.current.forEach((audio, peerId) => {
      if (!currentPeerIds.has(peerId)) {
        audio.pause()
        audio.srcObject = null
        pipAudioRefs.current.delete(peerId)
      }
    })
  }, [callStateIsMinimized, remoteAudioTrackIds, stableRemotePeers, meeting?.self?.id])

  useEffect(() => {
    return () => {
      if (viewMode !== 'minimized') {
        const portalContainer = document.getElementById('rtk-group-call-minimized-portal')
        if (portalContainer) {
          setTimeout(() => {
            const container = document.getElementById('rtk-group-call-minimized-portal')
            if (container?.childElementCount === 0) {
              container.remove()
            }
          }, 100)
        }
      }
    }
  }, [viewMode])

  return { firstRemotePeer, buildStreamFromPeer }
}
